import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Badge, Button, Card, Chip, ErrorState, ListRow, Screen, Sheet, Skeleton, Text, useToast } from '@/components/ui';
import { useConfig } from '@/config/provider';
import { PROFESSIONS } from '@/constants/professions';
import { LanguageSheet, languageName } from '@/features/account/language-sheet';
import { useUnreadCount } from '@/features/notifications/api';
import { useI18n } from '@/i18n';
import { displayPhone } from '@/lib/format';
import { appVersion } from '@/lib/version';
import { useAuth } from '@/providers/auth';
import { useProProfile, useUpdateProfile } from './api';

export function ProfileScreen() {
  const { t, lang, canSwitch } = useI18n();
  const toast = useToast();
  const { user, logout } = useAuth();
  const settings = useConfig('pro.settings');
  const profile = useProProfile();
  const update = useUpdateProfile();
  const unread = useUnreadCount();
  const [langOpen, setLangOpen] = useState(false);
  const [spokenOpen, setSpokenOpen] = useState(false);
  const [spoken, setSpoken] = useState<string[]>([]);
  const p = profile.data;

  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, {
      onSuccess: () => toast.show(t('account.saved'), 'success'),
      onError: (e) => toast.show(e.message, 'error'),
    });

  const confirmLogout = () =>
    Alert.alert(t('account.logoutTitle'), t('account.logoutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.logout'), style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <Screen safeTop onRefresh={() => profile.refetch()}>
      <Text variant="h1" accessibilityRole="header">
        {t('tabs.profile')}
      </Text>
      <Card style={s.profile}>
        <Avatar name={user?.full_name ?? ''} uri={user?.avatar_url} size={60} />
        <View style={s.flex}>
          <Text variant="h3" numberOfLines={1}>
            {user?.full_name}
          </Text>
          <Text variant="bodySm" color="muted">
            {p ? PROFESSIONS.find((x) => x.type === p.professional_type)?.label : ''}
            {p?.years_of_experience ? ` · ${t('pro.yearsExp', { years: p.years_of_experience })}` : ''}
          </Text>
          <Text variant="caption" color="subtle">
            {user?.phone_number ? displayPhone(user.phone_number) : ''}
          </Text>
          {p?.verification_status === 'approved' ? <Badge label={t('common.verified')} tone="success" icon="verified" /> : null}
        </View>
      </Card>
      {profile.isPending ? (
        <Skeleton height={120} radius={16} />
      ) : profile.isError || !p ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <>
          <View style={s.stats}>
            <Card style={s.stat}>
              <Text variant="h3">{p.total_visits_completed}</Text>
              <Text variant="caption" color="subtle">
                {t('pro.visitsDone')}
              </Text>
            </Card>
            <Card style={s.stat}>
              <Text variant="h3">{p.total_ratings ? p.average_rating.toFixed(1) : '—'}</Text>
              <Text variant="caption" color="subtle">
                {t('pro.ratingCount', { count: p.total_ratings })}
              </Text>
            </Card>
          </View>
          <Card style={s.group}>
            <Text variant="title">{t('pro.radius')}</Text>
            <Text variant="caption" color="muted">
              {t('pro.radiusBody')}
            </Text>
            <View style={s.chips}>
              {settings.radius_options_km.map((km) => (
                <Chip key={km} label={`${km} km`} selected={Math.round(p.service_radius_km) === km} onPress={() => save({ service_radius_km: km })} />
              ))}
            </View>
          </Card>
          <Card padded={false} style={s.list}>
            <ListRow
              icon="languages"
              title={t('pro.languages')}
              subtitle={(p.languages_spoken ?? []).join(', ') || t('pro.languagesNone')}
              onPress={() => {
                setSpoken(p.languages_spoken ?? []);
                setSpokenOpen(true);
              }}
            />
            <ListRow icon="clock" title={t('pro.availability')} subtitle={t('pro.availabilityBody')} onPress={() => router.push('/availability')} />
            <ListRow icon="stethoscope" title={t('pro.services')} subtitle={t('pro.servicesBody')} onPress={() => router.push('/services')} />
          </Card>
        </>
      )}
      <Card padded={false} style={s.list}>
        <ListRow icon="bell" title={t('notifications.title')} value={unread ? String(unread) : undefined} onPress={() => router.push('/notifications')} />
        {canSwitch ? <ListRow icon="languages" title={t('account.language')} value={languageName(lang)} onPress={() => setLangOpen(true)} /> : null}
        <ListRow icon="headset" title={t('support.title')} onPress={() => router.push('/support')} />
        <ListRow icon="logout" tone="danger" title={t('account.logout')} onPress={confirmLogout} />
      </Card>
      <Text variant="caption" color="faint" align="center">
        {t('account.version', { version: appVersion })}
      </Text>
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      <Sheet
        visible={spokenOpen}
        onClose={() => setSpokenOpen(false)}
        title={t('pro.languages')}
        subtitle={t('pro.languagesBody')}
        footer={
          <Button
            title={t('common.save')}
            disabled={spoken.length === 0}
            loading={update.isPending}
            onPress={() => {
              save({ languages_spoken: spoken });
              setSpokenOpen(false);
            }}
          />
        }
      >
        <View style={s.chips}>
          {settings.languages.map((l) => (
            <Chip
              key={l}
              label={l}
              selected={spoken.includes(l)}
              onPress={() => setSpoken((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]))}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 2, alignItems: 'center' },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { paddingHorizontal: 16, paddingVertical: 4 },
});
