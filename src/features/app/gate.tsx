import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/icons';
import { Button, Text } from '@/components/ui';
import { useConfig, useConfigState } from '@/config/provider';
import { useT } from '@/i18n';
import { appVersion, compareVersions } from '@/lib/version';
import { shadow, useTheme } from '@/theme';

function FullScreenNotice({
  icon,
  title,
  message,
  action,
  onAction,
  busy,
}: {
  icon: IconName;
  title: string;
  message: string;
  action: string;
  onAction: () => void;
  busy?: boolean;
}) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.full, { backgroundColor: c.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.center}>
        <Image source={require('@/assets/branding/mendyr.png')} style={s.logo} contentFit="contain" />
        <View style={[s.iconWrap, { backgroundColor: c.primarySoft }]}>
          <Icon name={icon} size={28} color={c.primary} />
        </View>
        <Text variant="h2" align="center">
          {title}
        </Text>
        <Text variant="body" color="muted" align="center">
          {message}
        </Text>
      </View>
      <Button title={action} onPress={onAction} loading={busy} size="lg" />
    </View>
  );
}

/** Blocks the app for maintenance mode or a below-minimum app version (`app.maintenance`,
 * `app.version`), and shows a dismissible banner when a newer version is available. */
export function AppGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const { refresh } = useConfigState();
  const maintenance = useConfig('app.maintenance');
  const versions = useConfig('app.version');
  const [busy, setBusy] = useState(false);
  const [softDismissed, setSoftDismissed] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors: c, radius } = useTheme();

  const platformVersion = Platform.OS === 'ios' ? versions.ios : versions.android;
  const mustUpdate = Platform.OS !== 'web' && compareVersions(appVersion, platformVersion.min_supported) < 0;
  const canUpdate = Platform.OS !== 'web' && compareVersions(appVersion, platformVersion.latest) < 0;
  const openStore = () => {
    if (platformVersion.store_url) Linking.openURL(platformVersion.store_url).catch(() => {});
  };

  if (maintenance.enabled) {
    return (
      <FullScreenNotice
        icon="wrench"
        title={maintenance.title}
        message={maintenance.message}
        action={t('common.tryAgain')}
        busy={busy}
        onAction={() => {
          setBusy(true);
          refresh().finally(() => setBusy(false));
        }}
      />
    );
  }
  if (mustUpdate) {
    return (
      <FullScreenNotice
        icon="sparkles"
        title={t('update.requiredTitle')}
        message={versions.message}
        action={t('update.cta')}
        onAction={openStore}
      />
    );
  }
  return (
    <View style={s.flex}>
      {children}
      {canUpdate && !softDismissed ? (
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOutUp.duration(150)}
          style={[s.soft, shadow, { bottom: insets.bottom + 84, backgroundColor: c.surface, borderRadius: radius.card, borderColor: c.border }]}
        >
          <Icon name="sparkles" size={20} color={c.primary} />
          <View style={s.flex}>
            <Text variant="title">{t('update.availableTitle')}</Text>
            <Text variant="caption" color="muted" numberOfLines={2}>
              {versions.message}
            </Text>
          </View>
          {platformVersion.store_url ? (
            <Pressable onPress={openStore} hitSlop={8} accessibilityRole="button">
              <Text variant="label" color="primary">
                {t('update.cta')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setSoftDismissed(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <Icon name="x" size={18} color={c.subtle} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  full: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: { width: 56, height: 56, marginBottom: 12 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  soft: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
});
