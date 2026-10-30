import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Notice, Title, Body } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const u = await login(email.trim(), password);
      router.replace(u.role === 'professional' ? '/pro' : '/patient');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to log in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.brandRow}>
          <Image source={require('@/assets/branding/mendyr.png')} style={s.logo} />
          <Text style={s.brandName}>Mendyr</Text>
        </View>
        <Title>Healthcare at home</Title>
        <Body muted>Log in to book visits or manage your work.</Body>
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="Log in" onPress={submit} loading={busy} />
        <View style={s.row}>
          <Body muted>New to Mendyr?</Body>
          <Text onPress={() => router.push('/register')} style={s.link}> Create an account</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.lg, gap: 16, justifyContent: 'center', flexGrow: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { height: 44, width: 44 },
  brandName: { fontSize: 28, fontWeight: '800', color: colors.brand600 },
  row: { flexDirection: 'row', justifyContent: 'center' },
  link: { color: colors.brand700, fontWeight: '700' },
});
