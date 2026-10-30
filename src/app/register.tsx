import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Notice, Title, Body } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

export default function Register() {
  const { register } = useAuth();
  const [role, setRole] = useState<'patient' | 'professional'>('patient');
  const [v, setV] = useState({ full_name: '', email: '', phone_number: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const u = await register({
        ...v,
        email: v.email.trim(),
        phone_number: v.phone_number.startsWith('+') ? v.phone_number : `+91${v.phone_number}`,
        role,
      });
      router.replace(u.role === 'professional' ? '/pro' : '/patient');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create account');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.brandRow}>
        <Image source={require('@/assets/branding/mendyr.png')} style={s.logo} />
        <Text style={s.brandName}>Mendyr</Text>
      </View>
      <Title>Create your account</Title>
      <Body muted>Choose how you'll use Mendyr.</Body>
      <View style={s.roles}>
        <Button title="I need care" variant={role === 'patient' ? 'primary' : 'outline'} onPress={() => setRole('patient')} />
        <Button title="I'm a professional" variant={role === 'professional' ? 'primary' : 'outline'} onPress={() => setRole('professional')} />
      </View>
      {error && <Notice tone="error">{error}</Notice>}
      <Field label="Full name" value={v.full_name} onChangeText={x => setV({ ...v, full_name: x })} />
      <Field label="Mobile number" value={v.phone_number} onChangeText={x => setV({ ...v, phone_number: x })} keyboardType="phone-pad" />
      <Field label="Email" value={v.email} onChangeText={x => setV({ ...v, email: x })} autoCapitalize="none" />
      <Field label="Password" value={v.password} onChangeText={x => setV({ ...v, password: x })} secureTextEntry />
      <Button title="Create account" onPress={submit} loading={busy} />
      <Text onPress={() => router.back()} style={s.link}>Already have an account? Log in</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logo: { height: 44, width: 44 },
  brandName: { fontSize: 28, fontWeight: '800', color: colors.brand600 },
  roles: { flexDirection: 'row', gap: 8 },
  link: { textAlign: 'center', color: colors.brand700, fontWeight: '700' },
});
