import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from '@/components/ui';
import { useOnboardingSeen } from '@/features/app/onboarding-seen';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';

/** Entry point: route to the right place for the stored session. */
export default function Index() {
  const { user, logout } = useAuth();
  const seen = useOnboardingSeen();
  const t = useT();
  const { colors: c } = useTheme();

  if (!user) return <Redirect href={seen ? '/login' : '/welcome'} />;
  if (user.role === 'patient') return <Redirect href="/home" />;
  if (user.role === 'professional') return <Redirect href="/dashboard" />;

  // Admin/ops accounts use the web portal.
  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <Text variant="h2" align="center">
        {t('auth.adminTitle')}
      </Text>
      <Text variant="body" color="muted" align="center">
        {t('auth.adminBody')}
      </Text>
      <Button title={t('account.logout')} variant="outline" onPress={logout} />
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 } });
