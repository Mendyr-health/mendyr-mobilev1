import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, Segmented, SkeletonList, Text } from '@/components/ui';
import { isActive } from '@/features/booking/status';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { useProBookings } from './api';
import { VisitRow } from './visit-row';

type Filter = 'upcoming' | 'completed' | 'cancelled';

export function VisitsScreen() {
  const t = useT();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const visits = useProBookings();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const all = visits.data ?? [];
  const groups: Record<Filter, typeof all> = {
    upcoming: all.filter((v) => isActive(v.status)).sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at)),
    completed: all.filter((v) => v.status === 'completed').sort((a, b) => b.scheduled_start_at.localeCompare(a.scheduled_start_at)),
    cancelled: all.filter((v) => !isActive(v.status) && v.status !== 'completed').sort((a, b) => b.scheduled_start_at.localeCompare(a.scheduled_start_at)),
  };

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top + 12 }]}>
      <View style={s.head}>
        <Text variant="h1" accessibilityRole="header">
          {t('visits.title')}
        </Text>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'upcoming', label: t('visits.upcoming') },
            { value: 'completed', label: t('visits.completed') },
            { value: 'cancelled', label: t('visits.cancelled') },
          ]}
        />
      </View>
      {visits.isPending ? (
        <View style={s.pad}>
          <SkeletonList count={4} />
        </View>
      ) : visits.isError ? (
        <ErrorState error={visits.error} onRetry={() => visits.refetch()} />
      ) : (
        <FlatList
          data={groups[filter]}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => <VisitRow visit={item} />}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={visits.isRefetching} onRefresh={() => visits.refetch()} tintColor={c.primary} colors={[c.primary]} />}
          ListEmptyComponent={<EmptyState icon="calendar" title={t(`visits.empty.${filter}`)} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  pad: { padding: 16 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
});
