import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Card, ListRow, Screen, Text } from '@/components/ui';
import { useConfig, useFeature } from '@/config/provider';
import { useI18n } from '@/i18n';
import { displayPhone } from '@/lib/format';
import { callNumber } from '@/lib/linking';
import { appVersion } from '@/lib/version';
import { useAuth } from '@/providers/auth';
import { useAddresses } from '@/features/addresses/api';
import { useUnreadCount } from '@/features/notifications/api';
import { LanguageSheet, languageName } from './language-sheet';

export function AccountScreen() {
  const { t, lang, canSwitch } = useI18n();
  const { user, logout } = useAuth();
  const support = useConfig('app.support');
  const sos = useFeature('sos');
  const addresses = useAddresses();
  const unread = useUnreadCount();
  const [langOpen, setLangOpen] = useState(false);

  const confirmLogout = () =>
    Alert.alert(t('account.logoutTitle'), t('account.logoutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.logout'), style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <Screen safeTop>
      <Text variant="h1" accessibilityRole="header">
        {t('tabs.account')}
      </Text>
      <Card onPress={() => router.push('/edit-profile')} style={s.profile} accessibilityLabel={t('account.editProfile')}>
        <Avatar name={user?.full_name ?? ''} uri={user?.avatar_url} size={56} />
        <View style={s.flex}>
          <Text variant="h3" numberOfLines={1}>
            {user?.full_name}
          </Text>
          <Text variant="bodySm" color="muted">
            {user?.phone_number ? displayPhone(user.phone_number) : ''}
          </Text>
          {user?.email ? (
            <Text variant="caption" color="subtle" numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </View>
        <Text variant="label" color="primary">
          {t('common.edit')}
        </Text>
      </Card>
      <Card padded={false} style={s.group}>
        <ListRow icon="pin" title={t('address.title')} subtitle={t('account.addressesCount', { count: addresses.data?.length ?? 0 })} onPress={() => router.push('/addresses')} />
        <ListRow icon="bell" title={t('notifications.title')} value={unread ? String(unread) : undefined} onPress={() => router.push('/notifications')} />
        {canSwitch ? <ListRow icon="languages" title={t('account.language')} value={languageName(lang)} onPress={() => setLangOpen(true)} /> : null}
      </Card>
      <Card padded={false} style={s.group}>
        <ListRow icon="headset" title={t('support.title')} subtitle={support.hours} onPress={() => router.push('/support')} />
        {sos ? (
          <ListRow
            icon="siren"
            tone="danger"
            title={t('support.sos')}
            subtitle={t('support.sosBody', { sos: support.sos_number, ambulance: support.ambulance_number })}
            onPress={() => callNumber(support.sos_number)}
          />
        ) : null}
      </Card>
      <Card padded={false} style={s.group}>
        <ListRow icon="logout" tone="danger" title={t('account.logout')} onPress={confirmLogout} />
      </Card>
      <Text variant="caption" color="faint" align="center">
        {t('account.version', { version: appVersion })}
      </Text>
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  group: { paddingHorizontal: 16, paddingVertical: 4 },
});
