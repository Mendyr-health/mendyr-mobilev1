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
import { Icon } from '@/components/icons';
import { colors, space } from '@/constants/theme';
import { useAuth } from '@/providers/auth';

export default function Register() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [role, setRole] = useState<'patient' | 'professional'>('patient');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    setError('');

    // Normalize phone number to +91 if not prefixed
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    const formattedPhone = cleanPhone.startsWith('+')
      ? cleanPhone
      : `+91${cleanPhone.replace(/^0+/, '')}`;

    try {
      const u = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: formattedPhone,
        password,
        role,
      });
      router.replace(u.role === 'professional' ? '/pro' : '/patient');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create account. Please try again.');
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
            paddingTop: Math.max(insets.top + 16, 24),
            paddingBottom: Math.max(insets.bottom + 16, 24),
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
            <Title style={s.title}>Create your account</Title>
            <Body muted style={s.subtitle}>
              Choose how you will be using Mendyr to get started.
            </Body>
          </View>

          {/* Role Selector Cards */}
          <View style={s.roleGrid}>
            <Pressable
              onPress={() => setRole('patient')}
              style={({ pressed }) => [
                s.roleCard,
                role === 'patient' && s.roleCardSelected,
                pressed && s.pressed,
              ]}
            >
              <View
                style={[
                  s.roleIconCircle,
                  role === 'patient' && s.roleIconCircleSelected,
                ]}
              >
                <Icon
                  name="heart"
                  size={18}
                  color={role === 'patient' ? '#FFFFFF' : colors.brand600}
                />
              </View>
              <View style={s.roleInfo}>
                <Text
                  style={[
                    s.roleTitle,
                    role === 'patient' && s.roleTitleSelected,
                  ]}
                >
                  I need care
                </Text>
                <Text style={s.roleDesc}>Book home visits for my family</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setRole('professional')}
              style={({ pressed }) => [
                s.roleCard,
                role === 'professional' && s.roleCardSelected,
                pressed && s.pressed,
              ]}
            >
              <View
                style={[
                  s.roleIconCircle,
                  role === 'professional' && s.roleIconCircleSelected,
                ]}
              >
                <Icon
                  name="activity"
                  size={18}
                  color={role === 'professional' ? '#FFFFFF' : colors.brand600}
                />
              </View>
              <View style={s.roleInfo}>
                <Text
                  style={[
                    s.roleTitle,
                    role === 'professional' && s.roleTitleSelected,
                  ]}
                >
                  I am a professional
                </Text>
                <Text style={s.roleDesc}>Nurse, physio or caregiver</Text>
              </View>
            </Pressable>
          </View>

          {error ? <Notice tone="error">{error}</Notice> : null}

          {/* Form Fields */}
          <View style={s.fields}>
            <Field
              label="Full name"
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (error) setError('');
              }}
              autoCapitalize="words"
            />

            <Field
              label="Mobile number"
              placeholder="98765 43210"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (error) setError('');
              }}
              keyboardType="phone-pad"
            />

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
            />

            <Field
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError('');
              }}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <Button
            title="Create account"
            onPress={submit}
            loading={busy}
            size="lg"
            icon="arrowRight"
            iconRight
          />

          {/* Footer Navigation */}
          <View style={s.footerRow}>
            <Text style={s.footerMuted}>Already have an account?</Text>
            <Pressable
              onPress={() => router.replace('/login')}
              style={({ pressed }) => [s.linkTouch, pressed && s.pressed]}
              hitSlop={8}
            >
              <Text style={s.linkText}>Log in</Text>
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
    gap: 18,
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
  roleGrid: {
    gap: 10,
    width: '100%',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  roleCardSelected: {
    borderColor: colors.brand600,
    backgroundColor: colors.brand50,
  },
  roleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconCircleSelected: {
    backgroundColor: colors.brand600,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  roleTitleSelected: {
    color: colors.brand700,
  },
  roleDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  fields: {
    gap: 12,
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
