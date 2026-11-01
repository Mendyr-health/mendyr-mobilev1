import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Field, Header, Screen, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { api } from '@/lib/api';
import { displayPhone } from '@/lib/format';
import { success } from '@/lib/haptics';
import type { User } from '@/lib/types';
import { useAuth } from '@/providers/auth';

export function EditProfileScreen() {
  const t = useT();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError(t('auth.nameError'));
      return;
    }
    setBusy(true);
    try {
      const updated = await api<User>('/users/me', { method: 'PATCH', body: { full_name: name.trim(), email: email.trim() || null } });
      setUser(updated);
      success();
      toast.show(t('account.saved'), 'success');
      router.back();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : t('error.generic'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen header={<Header title={t('account.editProfile')} />} footer={<Button title={t('common.save')} size="lg" loading={busy} onPress={save} />}>
      <Field label={t('auth.fullName')} value={name} onChangeText={setName} error={error} />
      <Field label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label={t('auth.mobile')} value={user?.phone_number ? displayPhone(user.phone_number) : ''} editable={false} />
      <Text variant="caption" color="subtle">
        {t('account.phoneLocked')}
      </Text>
    </Screen>
  );
}
