import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Card, EmptyState, ErrorState, Screen, SectionTitle, Skeleton, SkeletonList, Text } from '@/components/ui';
import { isActive } from '@/features/booking/status';
import { BellButton } from '@/features/notifications/bell-button';
import { useInbox } from '@/features/notifications/api';
import { useRefresh } from '@/hooks/use-refresh';
import { useT } from '@/i18n';
import { firstName, inr, istDateKey } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';
import { useProBookings, useProProfile, useRequests } from './api';
import { earningsSummary } from './earnings';
import { OnlineToggle } from './online-toggle';
import { VerificationCard } from './verification-card';
import { VisitRow } from './visit-row';

export function DashboardScreen() {
  const t = useT();
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const profile = useProProfile();
  const p = profile.data;
  const ready = p?.verification_status === 'approved' && p.is_accepting_bookings;
  const requests = useRequests(!!ready);
  const visits = useProBookings();
  const refresh = useRefresh(profile, visits, useInbox());

  const todayKey = istDateKey(new Date());
  const today = (visits.data ?? [])
    .filter((v) => isActive(v.status) && istDateKey(new Date(v.scheduled_start_at)) === todayKey)
    .sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const earnings = earningsSummary(visits.data ?? []);
  const openRequests = requests.data?.length ?? 0;

  return (
    <Screen safeTop onRefresh={refresh}>
      <View style={s.top}>
        <View style={s.flex}>
          <Text variant="caption" color="subtle">
            {t('pro.welcome')}
          </Text>
          <Text variant="h2" numberOfLines={1}>
            {firstName(user?.full_name)}
          </Text>
        </View>
        <BellButton />
      </View>
      {profile.isPending ? (
        <Skeleton height={72} radius={16} />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <>
          <VerificationCard profile={p!} compact />
          {p!.verification_status === 'approved' ? <OnlineToggle profile={p!} /> : null}
        </>
      )}
      {ready ? (
        <Card onPress={() => router.navigate('/requests')} style={s.requests} accessibilityLabel={t('pro.openRequests', { count: openRequests })}>
          <View style={[s.reqIcon, { backgroundColor: c.primarySoft }]}>
            <Icon name="clipboard" size={20} color={c.primary} />
          </View>
          <View style={s.flex}>
            <Text variant="title">{t('pro.openRequests', { count: openRequests })}</Text>
            <Text variant="caption" color="muted">
              {t('pro.openRequestsBody')}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={c.subtle} />
        </Card>
      ) : null}
      <View style={s.stats}>
        <Stat label={t('earnings.today')} value={inr(earnings.today)} />
        <Stat label={t('earnings.week')} value={inr(earnings.week)} />
        <Stat label={t('pro.rating')} value={p && p.total_ratings ? `${p.average_rating.toFixed(1)} ★` : '—'} />
      </View>
      <SectionTitle title={t('pro.todaysVisits')} action={t('common.seeAll')} onAction={() => router.navigate('/visits')} />
      {visits.isPending ? (
        <SkeletonList count={2} />
      ) : today.length === 0 ? (
        <Card>
          <EmptyState icon="calendar" title={t('pro.noVisitsToday')} body={t('pro.noVisitsTodayBody')} />
        </Card>
      ) : (
        today.map((v) => <VisitRow key={v.id} visit={v} />)
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={s.stat}>
      <Text variant="caption" color="subtle" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="h3" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requests: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4, padding: 12 },
});
