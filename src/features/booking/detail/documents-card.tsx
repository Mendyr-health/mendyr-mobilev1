import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, useToast } from '@/components/ui';
import { useAttachDocument, useMedicalDocuments } from '@/features/documents/api';
import { DocumentRow } from '@/features/documents/document-row';
import { useDocumentViewer } from '@/features/documents/document-viewer';
import { medicalIcon, medicalSubtitle, medicalTitle } from '@/features/documents/labels';
import { MedicalUploadSheet } from '@/features/documents/medical-upload-sheet';
import { UploadProgress } from '@/features/documents/upload-progress';
import { useUploadMedicalDocument } from '@/features/documents/use-upload';
import { useT } from '@/i18n';
import type { Booking, BookingStatus, MedicalDocument } from '@/lib/types';
import { useTheme } from '@/theme';

// Same as the backend: documents can be added until the visit is over.
const ATTACHABLE: BookingStatus[] = ['searching', 'assigned', 'confirmed', 'en_route', 'in_progress'];

/** Documents shared with the professional for this booking; more can be attached while the
 * visit is upcoming. */
export function BookingDocumentsCard({
  booking,
  updatedAt,
  refetch,
}: {
  booking: Booking;
  updatedAt: number;
  refetch: () => Promise<Booking | undefined>;
}) {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const attached = booking.documents ?? [];
  const canAttach = ATTACHABLE.includes(booking.status);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mine = useMedicalDocuments(canAttach);
  const attach = useAttachDocument();
  const { phase, busy, upload } = useUploadMedicalDocument();
  const { open, opening, viewer } = useDocumentViewer();
  const fresh = { updatedAt, refetch: async () => (await refetch())?.documents };

  if (!attached.length && !canAttach) return null;
  const available = (mine.data ?? []).filter((d) => d.booking_id !== booking.id);

  const attachExisting = (doc: MedicalDocument) =>
    attach.mutate(
      { id: doc.id, bookingId: booking.id },
      {
        onSuccess: () => {
          setSheetOpen(false);
          toast.show(t('booking.attached'), 'success');
        },
        onError: (e) => toast.show(e.message, 'error'),
      },
    );

  return (
    <Card style={s.card}>
      <Text variant="h3">{t('booking.documents')}</Text>
      {attached.length ? (
        <View>
          {attached.map((doc, i) => (
            <View key={doc.id}>
              {i > 0 ? <View style={[s.divider, { backgroundColor: c.divider }]} /> : null}
              <DocumentRow
                icon={medicalIcon(doc.document_type)}
                title={medicalTitle(doc, t)}
                subtitle={medicalSubtitle(doc, t)}
                opening={opening === doc.id}
                onPress={() => open(doc, fresh)}
              />
            </View>
          ))}
        </View>
      ) : (
        <Text variant="bodySm" color="subtle">
          {t('booking.documentsEmpty')}
        </Text>
      )}
      <UploadProgress phase={phase} inline />
      {canAttach ? (
        <Button title={t('booking.attachMore')} icon="paperclip" variant="secondary" disabled={busy} onPress={() => setSheetOpen(true)} />
      ) : null}
      <MedicalUploadSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('booking.attachTitle')}
        subtitle={t('booking.attachSubtitle')}
        onPick={(input, source) => upload({ ...input, booking_id: booking.id }, source)}
        before={
          available.length ? (
            <View style={s.existing}>
              <Text variant="label" color="inkSoft">
                {t('booking.attachExisting')}
              </Text>
              {available.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  icon={medicalIcon(doc.document_type)}
                  title={medicalTitle(doc, t)}
                  subtitle={medicalSubtitle(doc, t)}
                  onPress={() => attachExisting(doc)}
                  right={
                    <Button
                      title={t('booking.attach')}
                      size="sm"
                      variant="outline"
                      full={false}
                      loading={attach.isPending && attach.variables?.id === doc.id}
                      disabled={attach.isPending}
                      onPress={() => attachExisting(doc)}
                    />
                  }
                />
              ))}
              <Text variant="label" color="inkSoft" style={s.or}>
                {t('booking.attachNew')}
              </Text>
            </View>
          ) : null
        }
      />
      {viewer}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  existing: { gap: 4 },
  or: { marginTop: 8 },
});
