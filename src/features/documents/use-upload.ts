import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui';
import { bookingKeys } from '@/features/booking/api';
import { proKeys } from '@/features/pro/api';
import { useT } from '@/i18n';
import { error as hapticError, success } from '@/lib/haptics';
import type { MedicalDocument, ProDocument, ProDocumentType } from '@/lib/types';
import { docKeys, recordMedicalDocument, recordProDocument, type MedicalDocumentInput } from './api';
import { pickFile, uploadErrorKey, uploadFile, type UploadPhase, type UploadSource } from './upload';

/** Runs pick → upload-url → PUT → record with a visible phase and friendly error toasts. */
function useUploadRunner() {
  const t = useT();
  const toast = useToast();
  const [phase, setPhase] = useState<UploadPhase>('idle');

  const run = useCallback(
    async <T>(
      source: UploadSource,
      base: Parameters<typeof uploadFile>[0],
      record: (fileKey: string) => Promise<T>,
    ): Promise<T | null> => {
      try {
        const file = await pickFile(source);
        if (!file) return null;
        const fileKey = await uploadFile(base, file, setPhase);
        setPhase('saving');
        const saved = await record(fileKey);
        success();
        toast.show(t('docs.uploaded'), 'success');
        return saved;
      } catch (e) {
        hapticError();
        const key = uploadErrorKey(e);
        toast.show(key ? t(key) : e instanceof Error ? e.message : t('error.generic'), 'error');
        return null;
      } finally {
        setPhase('idle');
      }
    },
    [t, toast],
  );

  return { phase, busy: phase !== 'idle', run };
}

/** Professional KYC upload; replaces a pending/rejected document of the same type. */
export function useUploadProDocument() {
  const qc = useQueryClient();
  const { phase, busy, run } = useUploadRunner();
  const [uploadingType, setUploadingType] = useState<ProDocumentType | null>(null);
  const upload = useCallback(
    async (type: ProDocumentType, source: UploadSource): Promise<ProDocument | null> => {
      setUploadingType(type);
      try {
        const doc = await run(source, '/professionals/me/documents', (file_key) =>
          recordProDocument({ document_type: type, file_key }),
        );
        if (doc) {
          qc.invalidateQueries({ queryKey: docKeys.pro });
          qc.invalidateQueries({ queryKey: proKeys.me });
        }
        return doc;
      } finally {
        setUploadingType(null);
      }
    },
    [qc, run],
  );
  return { phase, busy, uploadingType, upload };
}

/** Patient medical document upload (optionally straight onto a booking). */
export function useUploadMedicalDocument() {
  const qc = useQueryClient();
  const { phase, busy, run } = useUploadRunner();
  const upload = useCallback(
    async (input: MedicalDocumentInput, source: UploadSource): Promise<MedicalDocument | null> => {
      const doc = await run(source, '/medical-documents', (file_key) =>
        recordMedicalDocument({ ...input, title: input.title?.trim() || null, file_key }),
      );
      if (doc) {
        qc.setQueryData<MedicalDocument[]>(docKeys.medical, (old) => (old ? [doc, ...old] : old));
        qc.invalidateQueries({ queryKey: docKeys.medical });
        if (doc.booking_id) qc.invalidateQueries({ queryKey: bookingKeys.detail(doc.booking_id) });
      }
      return doc;
    },
    [qc, run],
  );
  return { phase, busy, upload };
}
