import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, SkeletonList, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { error as hapticError, success } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { useAccept, useProProfile, useRequests } from './api';
import { OnlineToggle } from './online-toggle';
import { RequestCard } from './request-card';
import { VerificationCard } from './verification-card';

export function RequestsScreen() {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useProProfile();
  const p = profile.data;
  const ready = p?.verification_status === 'approved' && p.is_accepting_bookings;
  const requests = useRequests(!!ready);
  const accept = useAccept();

  const onAccept = (id: string) =>
    accept.mutate(id, {
      onSuccess: (booking) => {
        success();
        // M1: go straight to the accepted visit.
        router.push(`/visit/${booking.id}`);
      },
      onError: (e) => {
        hapticError();
        toast.show(e.message, 'error');
        requests.refetch();
      },
    });

  const header = (
    <View style={s.head}>
      <Text variant="h1" accessibilityRole="header">
        {t('requests.title')}
      </Text>
      {p ? <VerificationCard profile={p} compact /> : null}
      {p && p.verification_status === 'approved' ? <OnlineToggle profile={p} /> : null}
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: c.background, paddingTop: insets.top + 12 }]}>
      {!ready ? (
        <View style={s.pad}>{header}</View>
      ) : requests.isPending ? (
        <View style={s.pad}>
          {header}
          <SkeletonList count={3} lines={3} />
        </View>
      ) : requests.isError ? (
        <View style={s.pad}>
          {header}
          <ErrorState error={requests.error} onRetry={() => requests.refetch()} />
        </View>
      ) : (
        <FlatList
          data={requests.data}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={header}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={requests.isRefetching} onRefresh={() => requests.refetch()} tintColor={c.primary} colors={[c.primary]} />}
          renderItem={({ item }) => <RequestCard request={item} busy={accept.isPending && accept.variables === item.id} onAccept={() => onAccept(item.id)} />}
          ListEmptyComponent={<EmptyState icon="clipboard" title={t('requests.emptyTitle')} body={t('requests.emptyBody')} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  head: { gap: 12, marginBottom: 4 },
  pad: { paddingHorizontal: 16, gap: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12, flexGrow: 1 },
});
