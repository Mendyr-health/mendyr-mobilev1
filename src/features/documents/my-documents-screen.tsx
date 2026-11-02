import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, ConfirmSheet, EmptyState, ErrorState, Header, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { useFeature } from '@/config/provider';
import { useT } from '@/i18n';
import type { MedicalDocument, MedicalDocumentType } from '@/lib/types';
import { useTheme } from '@/theme';
import { useDeleteMedicalDocument, useMedicalDocuments } from './api';
import { DocumentRow } from './document-row';
import { useDocumentViewer } from './document-viewer';
import { MEDICAL_LABEL, MEDICAL_TYPES, medicalIcon, medicalSubtitle, medicalTitle } from './labels';
import { MedicalUploadSheet } from './medical-upload-sheet';
import { UploadProgress } from './upload-progress';
import { useUploadMedicalDocument } from './use-upload';

type Filter = MedicalDocumentType | 'all';

/** The patient's prescriptions, lab reports and referrals (behind `prescription_upload`). */
export function MyDocumentsScreen() {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const enabled = useFeature('prescription_upload');
  const docs = useMedicalDocuments(enabled);
  const remove = useDeleteMedicalDocument();
  const { phase, busy, upload } = useUploadMedicalDocument();
  const { open, opening, viewer } = useDocumentViewer();
  const [filter, setFilter] = useState<Filter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirm, setConfirm] = useState<MedicalDocument | null>(null);

  const header = <Header title={t('docs.my.title')} />;
  if (!enabled) {
    return (
      <Screen header={header}>
        <EmptyState icon="folder" title={t('docs.my.title')} body={t('docs.my.unavailable')} />
      </Screen>
    );
  }

  const all = docs.data ?? [];
  const shown = filter === 'all' ? all : all.filter((d) => d.document_type === filter);
  const count = (type: MedicalDocumentType) => all.filter((d) => d.document_type === type).length;
  const fresh = { updatedAt: docs.dataUpdatedAt, refetch: async () => (await docs.refetch()).data };

  return (
    <Screen
      header={header}
      onRefresh={() => docs.refetch()}
      footer={<Button title={t('docs.my.upload')} icon="upload" loading={busy} onPress={() => setUploadOpen(true)} />}
    >
      <Text variant="bodySm" color="muted">
        {t('docs.my.intro')}
      </Text>
      {all.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label={`${t('common.all')} · ${all.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
          {MEDICAL_TYPES.map((type) => (
            <Chip
              key={type}
              label={count(type) ? `${t(MEDICAL_LABEL[type])} · ${count(type)}` : t(MEDICAL_LABEL[type])}
              selected={filter === type}
              onPress={() => setFilter(type)}
            />
          ))}
        </ScrollView>
      ) : null}
      <UploadProgress phase={phase} />
      {docs.isPending ? (
        <SkeletonList count={3} lines={2} />
      ) : docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => docs.refetch()} />
      ) : all.length === 0 ? (
        <Card>
          <EmptyState icon="folder" title={t('docs.my.emptyTitle')} body={t('docs.my.emptyBody')} />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon="folder" title={t('docs.my.emptyFiltered')} />
        </Card>
      ) : (
        <Card padded={false} style={s.list}>
          {shown.map((doc, i) => (
            <View key={doc.id}>
              {i > 0 ? <View style={[s.divider, { backgroundColor: c.divider }]} /> : null}
              <DocumentRow
                icon={medicalIcon(doc.document_type)}
                title={medicalTitle(doc, t)}
                subtitle={[medicalSubtitle(doc, t), doc.booking_id ? t('docs.my.attached') : null].filter(Boolean).join('\n')}
                opening={opening === doc.id}
                onPress={() => open(doc, fresh)}
                onDelete={() => setConfirm(doc)}
              />
            </View>
          ))}
        </Card>
      )}
      <MedicalUploadSheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        defaultType={filter === 'all' ? 'prescription' : filter}
        onPick={(input, source) => upload(input, source)}
      />
      <ConfirmSheet
        visible={!!confirm}
        onClose={() => setConfirm(null)}
        title={t('docs.deleteTitle')}
        body={confirm ? t(confirm.booking_id ? 'docs.deleteAttachedBody' : 'docs.deleteBody', { name: medicalTitle(confirm, t) }) : undefined}
        confirmLabel={t('common.delete')}
        busy={remove.isPending}
        onConfirm={() =>
          confirm &&
          remove.mutate(confirm, {
            onSuccess: () => {
              setConfirm(null);
              toast.show(t('docs.deleted'), 'success');
            },
            onError: (e) => toast.show(e.message, 'error'),
          })
        }
      />
      {viewer}
    </Screen>
  );
}

const s = StyleSheet.create({
  chips: { gap: 8, paddingRight: 16 },
  list: { paddingHorizontal: 16, paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth },
});
