import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { EmptyState, ErrorState, Header, SkeletonList, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { ago } from '@/lib/format';
import type { AppNotification } from '@/lib/types';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';
import { useInbox, useMarkAllRead, useMarkRead } from './api';
import { openNotification } from './link';

export function InboxScreen() {
  const t = useT();
  const { user } = useAuth();
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const inbox = useInbox();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unread = inbox.data?.unread_count ?? 0;

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    openNotification(n, user?.role);
  };

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <Header
        title={t('notifications.title')}
        right={
          unread > 0 ? (
            <Pressable onPress={() => markAll.mutate()} hitSlop={8} accessibilityRole="button">
              <Text variant="label" color="primary">
                {t('notifications.readAll')}
              </Text>
            </Pressable>
          ) : null
        }
      />
      {inbox.isPending ? (
        <View style={s.pad}>
          <SkeletonList count={5} lines={1} />
        </View>
      ) : inbox.isError ? (
        <ErrorState error={inbox.error} onRetry={() => inbox.refetch()} />
      ) : (
        <FlatList
          data={inbox.data.items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => inbox.refetch()} tintColor={c.primary} colors={[c.primary]} />}
          ListEmptyComponent={<EmptyState icon="bell" title={t('notifications.emptyTitle')} body={t('notifications.emptyBody')} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              style={({ pressed }) => [s.item, { backgroundColor: item.read_at ? c.surface : c.primarySoft, borderColor: c.border }, pressed && s.pressed]}
            >
              <View style={[s.icon, { backgroundColor: item.read_at ? c.divider : c.surface }]}>
                <Icon name="bell" size={18} color={item.read_at ? c.subtle : c.primary} />
              </View>
              <View style={s.text}>
                {item.title ? (
                  <Text variant="title" numberOfLines={1}>
                    {item.title}
                  </Text>
                ) : null}
                <Text variant="bodySm" color="muted" numberOfLines={3}>
                  {item.body}
                </Text>
              </View>
              <Text variant="caption" color="subtle">
                {ago(item.created_at)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  item: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  pressed: { opacity: 0.85 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
