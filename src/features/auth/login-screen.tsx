import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Button, Field, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { error as hapticError } from '@/lib/haptics';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';
import { AuthShell } from './auth-shell';

export function LoginScreen() {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const { login, sessionEnded } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError(t('auth.missingCredentials'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      // The protected route groups switch over as soon as `user` is set.
      router.replace('/');
    } catch (e) {
      hapticError();
      setError(e instanceof Error ? e.message : t('error.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      {sessionEnded ? (
        <View style={[s.notice, { backgroundColor: c.warningSoft, borderRadius: radius.input }]}>
          <Icon name="lock" size={18} color={c.warningInk} />
          <Text variant="bodySm" color={c.warningInk} style={s.flex}>
            {t('auth.sessionEnded')}
          </Text>
        </View>
      ) : null}
      <View style={s.fields}>
        <Field
          label={t('auth.email')}
          placeholder="name@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        {error ? (
          <Text variant="bodySm" color="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
      <Button title={t('auth.login')} size="lg" loading={busy} onPress={submit} icon="arrowRight" iconRight />
      <View style={s.footer}>
        <Text variant="bodySm" color="muted">
          {t('auth.noAccount')}
        </Text>
        <Text variant="label" color="primary" onPress={() => router.push('/register')} accessibilityRole="link">
          {t('auth.createAccount')}
        </Text>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  fields: { gap: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
