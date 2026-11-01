import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Text } from '@/components/ui';
import { useConfig } from '@/config/provider';
import { AuthShell } from '@/features/auth/auth-shell';
import { takePendingProDetails } from '@/features/auth/pending-pro';
import { ProDetailsForm } from '@/features/auth/pro-details-form';
import { emptyProDetails, onboardProfessional, validateProDetails, type ProDetails } from '@/features/auth/pro-onboarding';
import { useT } from '@/i18n';
import { error as hapticError, success } from '@/lib/haptics';
import { useAuth } from '@/providers/auth';
import { proKeys } from './api';

/** M4: finish a professional's profile when sign-up created the account but onboarding
 * didn't complete (network drop, bad pincode…). The session is kept, so no re-registering. */
export function OnboardScreen() {
  const t = useT();
  const qc = useQueryClient();
  const { logout } = useAuth();
  const settings = useConfig('pro.settings');
  const [details, setDetails] = useState<ProDetails>(() => takePendingProDetails() ?? emptyProDetails(settings.default_radius_km));
  const [field, setField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const problem = validateProDetails(details);
    setField(problem);
    if (problem) {
      hapticError();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const profile = await onboardProfessional(details);
      qc.setQueryData(proKeys.me, profile);
      success();
      router.replace('/dashboard');
    } catch (e) {
      hapticError();
      setError(e instanceof Error ? e.message : t('error.generic'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t('onboard.title')} subtitle={t('onboard.subtitle')}>
      <ProDetailsForm value={details} onChange={setDetails} errorField={field} />
      {error ? (
        <Text variant="bodySm" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button title={t('onboard.submit')} size="lg" loading={busy} onPress={submit} />
      <Button title={t('account.logout')} variant="ghost" onPress={() => logout()} />
    </AuthShell>
  );
}
