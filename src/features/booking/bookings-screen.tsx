import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, Segmented, SkeletonList, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { useBookings } from './api';
import { BookingRow } from './booking-row';
import { isUpcoming } from './status';

export function BookingsScreen() {
  const t = useT();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const bookings = useBookings();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const all = bookings.data ?? [];
  const upcoming = all.filter((b) => isUpcoming(b.status)).sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));
  const past = all.filter((b) => !isUpcoming(b.status)).sort((a, b) => b.scheduled_start_at.localeCompare(a.scheduled_start_at));
  const data = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top + 12 }]}>
      <View style={s.head}>
        <Text variant="h1" accessibilityRole="header">
          {t('bookings.title')}
        </Text>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: t('bookings.upcoming', { count: upcoming.length }) },
            { value: 'past', label: t('bookings.past') },
          ]}
        />
      </View>
      {bookings.isPending ? (
        <View style={s.pad}>
          <SkeletonList count={4} />
        </View>
      ) : bookings.isError ? (
        <ErrorState error={bookings.error} onRetry={() => bookings.refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <BookingRow booking={item} />}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={bookings.isRefetching} onRefresh={() => bookings.refetch()} tintColor={c.primary} colors={[c.primary]} />}
          ListEmptyComponent={
            tab === 'upcoming' ? (
              <EmptyState
                icon="calendar"
                title={t('bookings.emptyUpcoming')}
                body={t('bookings.emptyUpcomingBody')}
                action={t('bookings.bookVisit')}
                onAction={() => router.push('/book')}
              />
            ) : (
              <EmptyState icon="clipboard" title={t('bookings.emptyPast')} />
            )
          }
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
