import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Button, Card, ErrorState, SkeletonList, Text, useToast } from '@/components/ui';
import { useMedicalDocuments } from '@/features/documents/api';
import { DocumentRow } from '@/features/documents/document-row';
import { useDocumentViewer } from '@/features/documents/document-viewer';
import { medicalIcon, medicalSubtitle, medicalTitle } from '@/features/documents/labels';
import { MedicalUploadSheet } from '@/features/documents/medical-upload-sheet';
import { UploadProgress } from '@/features/documents/upload-progress';
import { useUploadMedicalDocument } from '@/features/documents/use-upload';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

export const MAX_BOOKING_DOCUMENTS = 10;

/** Booking step: pick prescriptions/reports already uploaded, or upload a new one. When the
 * service needs a prescription, at least one prescription is required to continue. */
export function DocumentsStep({
  selected,
  onChange,
  required,
  serviceName,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  required: boolean;
  serviceName: string;
}) {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const docs = useMedicalDocuments();
  const { phase, busy, upload } = useUploadMedicalDocument();
  const { open, opening, viewer } = useDocumentViewer();
  const [uploadOpen, setUploadOpen] = useState(false);
  const fresh = { updatedAt: docs.dataUpdatedAt, refetch: async () => (await docs.refetch()).data };

  const toggle = (id: string) => {
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id));
    if (selected.length >= MAX_BOOKING_DOCUMENTS) return toast.show(t('book.docs.max'), 'error');
    onChange([...selected, id]);
  };

  return (
    <View style={s.wrap}>
      {required ? (
        <Card flat style={[s.notice, { backgroundColor: c.warningSoft, borderColor: c.warningSoft }]}>
          <Icon name="clipboard" size={18} color={c.warningInk} />
          <Text variant="bodySm" color={c.warningInk} style={s.flex}>
            {t('book.docs.required', { service: serviceName })}
          </Text>
        </Card>
      ) : (
        <Text variant="bodySm" color="muted">
          {t('book.docs.body')}
        </Text>
      )}
      <UploadProgress phase={phase} />
      {docs.isPending ? (
        <SkeletonList count={2} lines={2} />
      ) : docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => docs.refetch()} />
      ) : docs.data.length === 0 ? (
        <Text variant="bodySm" color="subtle">
          {t('book.docs.empty')}
        </Text>
      ) : (
        <Card padded={false} style={s.list}>
          {docs.data.map((doc, i) => {
            const on = selected.includes(doc.id);
            return (
              <View key={doc.id}>
                {i > 0 ? <View style={[s.divider, { backgroundColor: c.divider }]} /> : null}
                <DocumentRow
                  icon={medicalIcon(doc.document_type)}
                  title={medicalTitle(doc, t)}
                  subtitle={[medicalSubtitle(doc, t), doc.booking_id ? t('book.docs.otherBooking') : null].filter(Boolean).join('\n')}
                  onPress={() => toggle(doc.id)}
                  right={
                    <View style={s.right}>
                      <Pressable
                        onPress={() => open(doc, fresh)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('docs.view')} ${medicalTitle(doc, t)}`}
                        style={s.iconButton}
                      >
                        <Icon name="eye" size={18} color={opening === doc.id ? c.primary : c.subtle} />
                      </Pressable>
                      <Pressable
                        onPress={() => toggle(doc.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={medicalTitle(doc, t)}
                        style={[s.check, { borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : c.surface }]}
                      >
                        {on ? <Icon name="check" size={16} color={c.onPrimary} strokeWidth={2.6} /> : null}
                      </Pressable>
                    </View>
                  }
                />
              </View>
            );
          })}
        </Card>
      )}
      <Button title={t('book.docs.uploadNew')} icon="upload" variant="secondary" disabled={busy} onPress={() => setUploadOpen(true)} />
      <MedicalUploadSheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultType="prescription"
        onPick={async (input, source) => {
          const doc = await upload(input, source);
          if (doc && selected.length < MAX_BOOKING_DOCUMENTS) onChange([...selected, doc.id]);
        }}
      />
      {viewer}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  flex: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12 },
  list: { paddingHorizontal: 16, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
