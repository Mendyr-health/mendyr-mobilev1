import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { PressableScale, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { useUnreadCount } from './api';

export function BellButton() {
  const unread = useUnreadCount();
  const { colors: c } = useTheme();
  const t = useT();
  return (
    <PressableScale
      onPress={() => router.push('/notifications')}
      accessibilityLabel={unread > 0 ? t('notifications.unreadLabel', { count: unread }) : t('notifications.title')}
      style={[s.btn, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <Icon name="bell" size={20} color={c.ink} />
      {unread > 0 ? (
        <View style={[s.badge, { backgroundColor: c.danger, borderColor: c.surface }]}>
          <Text variant="overline" color={c.white} style={s.count}>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  btn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  count: { fontSize: 10, lineHeight: 12, letterSpacing: 0 },
});
