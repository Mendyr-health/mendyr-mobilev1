import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/providers/auth';
import { markColdSplashShown } from '@/lib/splash';

const ONBOARDING_KEY = 'mendyr.onboarding-complete';

// Minimum 1 second cold-start splash as requested
const COLD_START_DELAY_MS = 1000;

export default function Index() {
  const { user, ready } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [minSplashDone, setMinSplashDone] = useState(false);

  /* Enforce minimum 1.0s cold-start splash */
  useEffect(() => {
    // Hide native splash screen as soon as React component tree mounts
    SplashScreen.hideAsync().catch(() => {});

    const timer = setTimeout(() => {
      setMinSplashDone(true);
    }, COLD_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  /* Check AsyncStorage for the onboarding flag */
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setHasSeenOnboarding(value === '1');
      setOnboardingChecked(true);
    });
  }, []);

  /* Navigate once both auth and onboarding state are resolved and splash delay passed */
  useEffect(() => {
    if (!ready || !onboardingChecked || !minSplashDone) return;

    markColdSplashShown();

    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
    } else if (user) {
      router.replace(user.role === 'professional' ? '/pro' : '/patient');
    } else {
      router.replace('/login');
    }
  }, [ready, onboardingChecked, minSplashDone, hasSeenOnboarding, user]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <View style={s.brandCenter}>
        <View style={s.logoWrap}>
          <Image
            source={require('@/assets/branding/mendyr.png')}
            style={s.logo}
            contentFit="contain"
          />
        </View>
        <Text style={s.brandTitle}>Mendyr</Text>
        <Text style={s.tagline}>Healthcare delivered at home</Text>
        <ActivityIndicator color="#FFFFFF" size="small" style={s.spinner} />
      </View>
      <View style={s.footer}>
        <Text style={s.footerText}>Certified Caregivers · Doorstep Support</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1262E2', // Signature Mendyr Brand Blue
    paddingHorizontal: 24,
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  logo: {
    width: 60,
    height: 60,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
