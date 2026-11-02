import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { Button, Card, Text, useTone, type Tone } from '@/components/ui';
import { useT, type CopyKey } from '@/i18n';
import type { ProfessionalProfile } from '@/lib/types';

const STATES: Record<ProfessionalProfile['verification_status'], { tone: Tone; icon: IconName; title: CopyKey; body: CopyKey }> = {
  pending: { tone: 'warning', icon: 'hourglass', title: 'verify.pending.title', body: 'verify.pending.body' },
  in_review: { tone: 'primary', icon: 'clipboard', title: 'verify.in_review.title', body: 'verify.in_review.body' },
  rejected: { tone: 'danger', icon: 'alert', title: 'verify.rejected.title', body: 'verify.rejected.body' },
  approved: { tone: 'success', icon: 'verified', title: 'verify.approved.title', body: 'verify.approved.body' },
};

/** Required KYC documents that still need the professional's attention. */
export type DocumentNudge = { missing: number; rejected: number };

export function VerificationCard({
  profile,
  compact,
  documents,
}: {
  profile: ProfessionalProfile;
  compact?: boolean;
  documents?: DocumentNudge;
}) {
  const t = useT();
  const needsDocs = !!documents && (documents.missing > 0 || documents.rejected > 0);
  // An approved professional with a rejected/missing required document still sees the nudge.
  const status = profile.verification_status === 'approved' && needsDocs ? 'pending' : profile.verification_status;
  const state = STATES[status] ?? STATES.pending;
  const tone = useTone(needsDocs && documents.rejected > 0 ? 'danger' : state.tone);
  if (compact && profile.verification_status === 'approved' && !needsDocs) return null;
  const showStatusCopy = profile.verification_status !== 'approved';
  return (
    <Card flat style={[s.card, { backgroundColor: tone.bg, borderColor: tone.bg }]}>
      <Icon name={needsDocs ? 'file' : state.icon} size={22} color={tone.fg} />
      <View style={s.flex}>
        {showStatusCopy ? (
          <>
            <Text variant="title" color={tone.fg}>
              {t(state.title)}
            </Text>
            <Text variant="bodySm" color="inkSoft">
              {t(state.body)}
            </Text>
            {profile.verification_status === 'rejected' && profile.rejection_reason ? (
              <Text variant="bodySm" color="danger">
                {t('verify.reason', { reason: profile.rejection_reason })}
              </Text>
            ) : null}
          </>
        ) : null}
        {needsDocs ? (
          <>
            {documents.missing > 0 ? (
              <Text variant={showStatusCopy ? 'label' : 'title'} color={showStatusCopy ? 'ink' : tone.fg}>
                {documents.missing === 1 ? t('docs.nudge.missingOne') : t('docs.nudge.missingMany', { count: documents.missing })}
              </Text>
            ) : null}
            {documents.rejected > 0 ? (
              <Text variant={showStatusCopy ? 'label' : 'title'} color="danger">
                {documents.rejected === 1 ? t('docs.nudge.rejectedOne') : t('docs.nudge.rejectedMany', { count: documents.rejected })}
              </Text>
            ) : null}
            <Button
              title={t('docs.nudge.cta')}
              icon="upload"
              size="sm"
              variant={documents.rejected > 0 ? 'danger' : 'primary'}
              full={false}
              style={s.cta}
              onPress={() => router.push('/documents')}
            />
          </>
        ) : showStatusCopy ? (
          <Button
            title={t('docs.nudge.view')}
            icon="file"
            size="sm"
            variant="outline"
            full={false}
            style={s.cta}
            onPress={() => router.push('/documents')}
          />
        ) : null}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 4 },
  cta: { marginTop: 6 },
});
