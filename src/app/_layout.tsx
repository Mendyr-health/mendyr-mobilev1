import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/ui';
import { ConfigProvider } from '@/config/provider';
import { useAppFonts } from '@/features/app/fonts';
import { BrandSplash } from '@/features/app/brand-splash';
import { AppGate } from '@/features/app/gate';
import { useOnboardingSeen } from '@/features/app/onboarding-seen';
import { createQueryClient } from '@/features/app/query-client';
import { I18nProvider } from '@/i18n';
import { AuthProvider, useAuth } from '@/providers/auth';
import { neutral } from '@/theme/tokens';
import '../global.css';

// The native splash hands over to <BrandSplash> as soon as React mounts; that stays up until
// fonts, the stored session and the intro flag are known, and for at least a second.
SplashScreen.preventAutoHideAsync().catch(() => {});
const MIN_SPLASH_MS = 1000;

function RootStack() {
  const { user } = useAuth();
  const role = user?.role;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: neutral.background } }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={role === 'patient'}>
        <Stack.Screen name="(patient)" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={role === 'professional'}>
        <Stack.Screen name="(pro)" options={{ animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="notifications" />
        <Stack.Screen name="support" />
      </Stack.Protected>
    </Stack>
  );
}

function Boot() {
  const { user, ready } = useAuth();
  const fontsReady = useAppFonts();
  const seen = useOnboardingSeen();
  const [minSplashDone, setMinSplashDone] = useState(false);
  const booted = fontsReady && ready && seen !== null && minSplashDone;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => setMinSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!booted) return <BrandSplash />;
  return (
    <ConfigProvider role={user?.role === 'professional' ? 'professional' : 'patient'}>
      <I18nProvider>
        <ToastProvider>
          <AppGate>
            <RootStack />
          </AppGate>
        </ToastProvider>
      </I18nProvider>
    </ConfigProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <View style={s.outer}>
            <View style={s.container}>
              <Boot />
            </View>
          </View>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, width: '100%', backgroundColor: neutral.divider, alignItems: 'center' },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    backgroundColor: neutral.background,
    overflow: 'hidden',
  },
});
