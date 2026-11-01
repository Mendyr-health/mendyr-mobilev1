import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { Card, Text, useTone, type Tone } from '@/components/ui';
import { useT, type CopyKey } from '@/i18n';
import type { ProfessionalProfile } from '@/lib/types';

const STATES: Record<ProfessionalProfile['verification_status'], { tone: Tone; icon: IconName; title: CopyKey; body: CopyKey }> = {
  pending: { tone: 'warning', icon: 'hourglass', title: 'verify.pending.title', body: 'verify.pending.body' },
  in_review: { tone: 'primary', icon: 'clipboard', title: 'verify.in_review.title', body: 'verify.in_review.body' },
  rejected: { tone: 'danger', icon: 'alert', title: 'verify.rejected.title', body: 'verify.rejected.body' },
  approved: { tone: 'success', icon: 'verified', title: 'verify.approved.title', body: 'verify.approved.body' },
};

export function VerificationCard({ profile, compact }: { profile: ProfessionalProfile; compact?: boolean }) {
  const t = useT();
  const state = STATES[profile.verification_status] ?? STATES.pending;
  const tone = useTone(state.tone);
  if (compact && profile.verification_status === 'approved') return null;
  return (
    <Card flat style={[s.card, { backgroundColor: tone.bg, borderColor: tone.bg }]}>
      <Icon name={state.icon} size={22} color={tone.fg} />
      <View style={s.flex}>
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
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 4 },
});
