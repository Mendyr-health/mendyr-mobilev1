import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, Notice, Title, Body } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

export default function Login() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const u = await login(email.trim(), password);
      router.replace(u.role === 'professional' ? '/pro' : '/patient');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to log in. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingTop: Math.max(insets.top + 16, 32),
            paddingBottom: Math.max(insets.bottom + 16, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          {/* Logo & Header */}
          <View style={s.brandRow}>
            <Image
              source={require('@/assets/branding/mendyr.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={s.brandName}>Mendyr</Text>
              <Text style={s.brandTag}>Home healthcare, on demand</Text>
            </View>
          </View>

          <View style={s.titleWrap}>
            <Title style={s.title}>Welcome back</Title>
            <Body muted style={s.subtitle}>
              Log in to book home healthcare visits or manage your professional schedule.
            </Body>
          </View>

          {error ? <Notice tone="error">{error}</Notice> : null}

          {/* Form Fields */}
          <View style={s.fields}>
            <Field
              label="Email address"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            <Field
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {/* Submit Button */}
          <Button
            title="Log in"
            onPress={submit}
            loading={busy}
            size="lg"
            icon="arrowRight"
            iconRight
          />

          {/* Footer Navigation */}
          <View style={s.footerRow}>
            <Text style={s.footerMuted}>Don&apos;t have an account?</Text>
            <Pressable
              onPress={() => router.push('/register')}
              style={({ pressed }) => [s.linkTouch, pressed && s.pressed]}
              hitSlop={8}
            >
              <Text style={s.linkText}>Create one</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand600,
  },
  titleWrap: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  fields: {
    gap: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
  },
  footerMuted: {
    fontSize: 14,
    color: colors.muted,
  },
  linkTouch: {
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand600,
  },
  pressed: {
    opacity: 0.75,
  },
});
