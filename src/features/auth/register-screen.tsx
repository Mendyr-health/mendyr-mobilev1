import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { Button, Field, PressableScale, Text } from '@/components/ui';
import { useConfig } from '@/config/provider';
import { useT } from '@/i18n';
import { isValidIndianMobile, toE164India } from '@/lib/format';
import { error as hapticError, success } from '@/lib/haptics';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';
import { AuthShell } from './auth-shell';
import { ProDetailsForm } from './pro-details-form';
import { emptyProDetails, onboardProfessional, validateProDetails, type ProDetails } from './pro-onboarding';
import { setPendingProDetails } from './pending-pro';

type Role = 'patient' | 'professional';
type Errors = Partial<Record<'name' | 'phone' | 'email' | 'password' | 'form', string>>;

export function RegisterScreen() {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const { register, setUser } = useAuth();
  const settings = useConfig('pro.settings');
  const [role, setRole] = useState<Role>('patient');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pro, setPro] = useState<ProDetails>(() => emptyProDetails(settings.default_radius_km));
  const [errors, setErrors] = useState<Errors>({});
  const [proError, setProError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    const next: Errors = {};
    if (!name.trim()) next.name = t('auth.nameError');
    // M6: Indian mobiles only — 10 digits starting 6–9.
    if (!isValidIndianMobile(phone)) next.phone = t('auth.phoneError');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = t('auth.emailError');
    if (password.length < 8) next.password = t('auth.passwordError');
    setErrors(next);
    const proProblem = role === 'professional' ? validateProDetails(pro) : null;
    setProError(proProblem);
    return Object.keys(next).length === 0 && !proProblem;
  }

  async function submit() {
    if (!validate()) {
      hapticError();
      return;
    }
    setBusy(true);
    setErrors({});
    let account;
    try {
      account = await register({
        full_name: name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: toE164India(phone),
        password,
        role,
      });
    } catch (e) {
      hapticError();
      setErrors({ form: e instanceof Error ? e.message : t('error.generic') });
      setBusy(false);
      return;
    }
    if (role === 'professional') {
      try {
        await onboardProfessional(pro);
      } catch {
        // M4: the account exists and the session is kept — finish onboarding on the next
        // screen instead of retrying sign-up (which would say "email taken").
        setPendingProDetails(pro);
      }
    }
    success();
    setBusy(false);
    // Patients add their first address while booking (M3: no placeholder address).
    setUser(account);
    router.replace('/');
  }

  const roles: { value: Role; title: string; body: string; icon: IconName }[] = [
    { value: 'patient', title: t('auth.roleCare'), body: t('auth.roleCareBody'), icon: 'heart' },
    { value: 'professional', title: t('auth.rolePro'), body: t('auth.roleProBody'), icon: 'stethoscope' },
  ];

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      subtitle={role === 'professional' ? t('auth.registerProSubtitle') : t('auth.registerSubtitle')}
    >
      <View style={s.roles}>
        {roles.map((r) => {
          const active = role === r.value;
          return (
            <PressableScale
              key={r.value}
              onPress={() => setRole(r.value)}
              accessibilityState={{ selected: active }}
              accessibilityLabel={r.title}
              style={[s.role, { borderRadius: radius.card, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.surface }]}
            >
              <View style={[s.roleIcon, { backgroundColor: active ? c.primary : c.primarySoft }]}>
                <Icon name={r.icon} size={18} color={active ? c.onPrimary : c.primary} />
              </View>
              <Text variant="title">{r.title}</Text>
              <Text variant="caption" color="subtle">
                {r.body}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <View style={s.fields}>
        <Field label={t('auth.fullName')} value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
        <Field
          label={t('auth.mobile')}
          prefix="+91"
          placeholder="98765 43210"
          keyboardType="phone-pad"
          maxLength={11}
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/[^\d ]/g, ''))}
          autoComplete="tel"
          error={errors.phone}
        />
        <Field
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email}
        />
        <Field
          label={t('auth.password')}
          hint={t('auth.passwordHint')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          error={errors.password}
        />
      </View>
      {role === 'professional' ? <ProDetailsForm value={pro} onChange={setPro} errorField={proError} /> : null}
      {errors.form ? (
        <Text variant="bodySm" color="danger" accessibilityLiveRegion="polite">
          {errors.form}
        </Text>
      ) : null}
      <Button title={t('auth.createAccount')} size="lg" loading={busy} onPress={submit} />
      <View style={s.footer}>
        <Text variant="bodySm" color="muted">
          {t('auth.haveAccount')}
        </Text>
        <Text variant="label" color="primary" onPress={() => router.replace('/login')} accessibilityRole="link">
          {t('auth.login')}
        </Text>
      </View>
    </AuthShell>
  );
}

const s = StyleSheet.create({
  roles: { flexDirection: 'row', gap: 12 },
  role: { flex: 1, padding: 14, gap: 6, borderWidth: 1.5 },
  roleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  fields: { gap: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
