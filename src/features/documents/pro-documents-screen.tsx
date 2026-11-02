import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Badge, Button, Card, ConfirmSheet, ErrorState, Header, Screen, SectionTitle, SkeletonList, Text, useToast } from '@/components/ui';
import { useConfig } from '@/config/provider';
import { useT } from '@/i18n';
import type { ProDocument, ProDocumentType } from '@/lib/types';
import { useTheme } from '@/theme';
import { useDeleteProDocument, useProDocuments } from './api';
import { useDocumentViewer } from './document-viewer';
import { currentByType, documentGaps, isImageType, PRO_DOCUMENT_TYPES, PRO_STATUS, proDocHint, proDocLabel } from './labels';
import { SourceSheet } from './source-sheet';
import { UploadProgress } from './upload-progress';
import { useUploadProDocument } from './use-upload';

/** KYC checklist: every required type (from `pro.settings.required_documents`), then the
 * optional ones, each with its review status and upload / view / re-upload / delete. */
export function ProDocumentsScreen() {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const required = [...new Set(useConfig('pro.settings').required_documents)];
  const docs = useProDocuments();
  const remove = useDeleteProDocument();
  const { phase, busy, uploadingType, upload } = useUploadProDocument();
  const { open, opening, viewer } = useDocumentViewer();
  const [pickFor, setPickFor] = useState<ProDocumentType | null>(null);
  const [confirm, setConfirm] = useState<ProDocument | null>(null);

  const current = currentByType(docs.data);
  const optional = [
    ...PRO_DOCUMENT_TYPES.filter((type) => !required.includes(type)),
    // Anything uploaded under a type we don't list (e.g. removed from the required list later).
    ...[...current.keys()].filter((type) => !required.includes(type) && !PRO_DOCUMENT_TYPES.includes(type as ProDocumentType)),
  ];
  const gaps = documentGaps(required, docs.data);
  const allApproved = required.length > 0 && required.every((type) => current.get(type)?.verification_status === 'approved');
  const fresh = { updatedAt: docs.dataUpdatedAt, refetch: async () => (await docs.refetch()).data };

  const row = (type: string, isRequired: boolean) => (
    <DocumentCard
      key={type}
      type={type}
      required={isRequired}
      doc={current.get(type)}
      uploading={uploadingType === type ? phase : 'idle'}
      busy={busy}
      opening={!!opening && opening === current.get(type)?.id}
      onUpload={() => setPickFor(type as ProDocumentType)}
      onView={(doc) => open(doc, fresh)}
      onDelete={setConfirm}
    />
  );

  return (
    <Screen header={<Header title={t('docs.title')} />} onRefresh={() => docs.refetch()}>
      <Card flat style={[s.intro, { backgroundColor: allApproved ? c.successSoft : c.primarySoft, borderColor: 'transparent' }]}>
        <Icon name={allApproved ? 'verified' : 'shieldCheck'} size={22} color={allApproved ? c.success : c.primaryDark} />
        <View style={s.flex}>
          <Text variant="title" color={allApproved ? c.success : c.primaryDark}>
            {allApproved ? t('docs.pro.allApproved') : t('docs.pro.progress', { done: gaps.uploaded, total: gaps.total })}
          </Text>
          <Text variant="bodySm" color="inkSoft">
            {t('docs.pro.intro')}
          </Text>
        </View>
      </Card>
      {docs.isPending ? (
        <SkeletonList count={3} lines={2} />
      ) : docs.isError ? (
        <ErrorState error={docs.error} onRetry={() => docs.refetch()} />
      ) : (
        <>
          {required.length ? <SectionTitle title={t('docs.pro.required')} /> : null}
          {required.map((type) => row(type, true))}
          {optional.length ? <SectionTitle title={t('docs.pro.optional')} /> : null}
          {optional.map((type) => row(type, false))}
          <Text variant="caption" color="subtle" align="center">
            {t('docs.pro.approvedNote')}
          </Text>
        </>
      )}
      <SourceSheet
        visible={!!pickFor}
        onClose={() => setPickFor(null)}
        title={pickFor ? proDocLabel(pickFor, t) : undefined}
        onPick={(source) => {
          if (pickFor) upload(pickFor, source);
        }}
      />
      <ConfirmSheet
        visible={!!confirm}
        onClose={() => setConfirm(null)}
        title={t('docs.deleteTitle')}
        body={confirm ? t('docs.deleteProBody', { name: proDocLabel(confirm.document_type, t) }) : undefined}
        confirmLabel={t('common.delete')}
        busy={remove.isPending}
        onConfirm={() =>
          confirm &&
          remove.mutate(confirm.id, {
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

function DocumentCard({
  type,
  required,
  doc,
  uploading,
  busy,
  opening,
  onUpload,
  onView,
  onDelete,
}: {
  type: string;
  required: boolean;
  doc: ProDocument | undefined;
  uploading: Parameters<typeof UploadProgress>[0]['phase'];
  busy: boolean;
  opening: boolean;
  onUpload: () => void;
  onView: (doc: ProDocument) => void;
  onDelete: (doc: ProDocument) => void;
}) {
  const t = useT();
  const { colors: c } = useTheme();
  const status = PRO_STATUS[doc?.verification_status ?? 'missing'] ?? PRO_STATUS.pending;
  const hint = proDocHint(type, t);
  const label = proDocLabel(type, t);
  return (
    <Card style={s.card}>
      <View style={s.head}>
        <View style={[s.icon, { backgroundColor: c.primarySoft }]}>
          <Icon name={doc ? (isImageType(doc.content_type) ? 'image' : 'file') : 'upload'} size={18} color={c.primary} />
        </View>
        <View style={s.flex}>
          <Text variant="title">{label}</Text>
          {hint ? (
            <Text variant="caption" color="subtle">
              {hint}
            </Text>
          ) : null}
        </View>
        <Badge label={t(status.label)} tone={status.tone} icon={status.icon} />
      </View>
      {doc?.verification_status === 'rejected' && doc.rejection_reason ? (
        <Text variant="bodySm" color="danger">
          {t('verify.reason', { reason: doc.rejection_reason })}
        </Text>
      ) : null}
      {uploading !== 'idle' ? (
        <UploadProgress phase={uploading} inline />
      ) : (
        <View style={s.actions}>
          {!doc ? (
            <Button
              title={t('docs.upload')}
              icon="upload"
              size="sm"
              variant={required ? 'primary' : 'secondary'}
              full={false}
              disabled={busy}
              onPress={onUpload}
              accessibilityLabel={`${t('docs.upload')} ${label}`}
            />
          ) : (
            <>
              <Button
                title={t('docs.view')}
                icon="eye"
                size="sm"
                variant="outline"
                full={false}
                loading={opening}
                onPress={() => onView(doc)}
                accessibilityLabel={`${t('docs.view')} ${label}`}
              />
              {doc.verification_status === 'rejected' ? (
                <Button title={t('docs.reupload')} icon="upload" size="sm" full={false} disabled={busy} onPress={onUpload} />
              ) : doc.verification_status !== 'approved' ? (
                <Button title={t('docs.replace')} icon="refresh" size="sm" variant="ghost" full={false} disabled={busy} onPress={onUpload} />
              ) : null}
              <View style={s.flex} />
              {doc.verification_status !== 'approved' ? (
                <Button
                  title={t('common.delete')}
                  icon="trash"
                  size="sm"
                  variant="danger"
                  full={false}
                  disabled={busy}
                  onPress={() => onDelete(doc)}
                  accessibilityLabel={`${t('docs.delete')}: ${label}`}
                />
              ) : null}
            </>
          )}
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  intro: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  card: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
