import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, EmptyState, ErrorState, PressableScale, SkeletonList, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { dayLabel, inr } from '@/lib/format';
import { useTheme } from '@/theme';
import { useProBookings } from './api';
import { earningsSummary } from './earnings';

export function EarningsScreen() {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const visits = useProBookings();
  const summary = earningsSummary(visits.data ?? []);

  const header = (
    <View style={s.head}>
      <Text variant="h1" accessibilityRole="header">
        {t('earnings.title')}
      </Text>
      <View style={[s.hero, { backgroundColor: c.primary, borderRadius: radius.card }]}>
        <Text variant="label" color={c.onPrimary}>
          {t('earnings.month')}
        </Text>
        <Text variant="display" color={c.onPrimary}>
          {inr(summary.month)}
        </Text>
        <Text variant="caption" color={c.primaryMuted}>
          {t('earnings.visitsCount', { count: summary.count })}
        </Text>
      </View>
      <View style={s.row}>
        <Card style={s.stat}>
          <Text variant="caption" color="subtle">
            {t('earnings.today')}
          </Text>
          <Text variant="h3">{inr(summary.today)}</Text>
        </Card>
        <Card style={s.stat}>
          <Text variant="caption" color="subtle">
            {t('earnings.week')}
          </Text>
          <Text variant="h3">{inr(summary.week)}</Text>
        </Card>
      </View>
      <Text variant="h3">{t('earnings.history')}</Text>
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top + 12 }]}>
      {visits.isPending ? (
        <View style={s.pad}>
          <SkeletonList count={4} lines={1} />
        </View>
      ) : visits.isError ? (
        <ErrorState error={visits.error} onRetry={() => visits.refetch()} />
      ) : (
        <FlatList
          data={summary.list}
          keyExtractor={(v) => v.id}
          ListHeaderComponent={header}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={visits.isRefetching} onRefresh={() => visits.refetch()} tintColor={c.primary} colors={[c.primary]} />}
          ListEmptyComponent={<EmptyState icon="wallet" title={t('earnings.emptyTitle')} body={t('earnings.emptyBody')} />}
          renderItem={({ item }) => (
            <PressableScale
              onPress={() => router.push(`/visit/${item.id}`)}
              scaleTo={0.99}
              style={[s.item, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.input }]}
            >
              <View style={s.flex}>
                <Text variant="title" numberOfLines={1}>
                  {item.service_name}
                </Text>
                <Text variant="caption" color="subtle">
                  {dayLabel(item.completed_at ?? item.scheduled_start_at)} · {item.booking_code}
                </Text>
              </View>
              <Text variant="title" color="success">
                +{inr(item.earning_amount)}
              </Text>
            </PressableScale>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  pad: { padding: 16 },
  head: { gap: 12, marginBottom: 4 },
  hero: { padding: 20, gap: 4 },
  row: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10, flexGrow: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
});
