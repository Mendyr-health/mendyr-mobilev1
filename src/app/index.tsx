import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/providers/auth';
import { colors } from '@/constants/theme';

const ONBOARDING_KEY = 'mendyr.onboarding-complete';

export default function Index() {
  const { user, ready } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  /* Check AsyncStorage for the onboarding flag */
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setHasSeenOnboarding(value === '1');
      setOnboardingChecked(true);
    });
  }, []);

  /* Navigate once both auth and onboarding state are resolved */
  useEffect(() => {
    if (!ready || !onboardingChecked) return;

    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
    } else if (user) {
      router.replace(user.role === 'professional' ? '/pro' : '/patient');
    } else {
      router.replace('/login');
    }
  }, [ready, onboardingChecked, hasSeenOnboarding, user]);

  return (
    <View style={s.root}>
      <Image source={require('@/assets/branding/mendyr.png')} style={s.logo} />
      <Text style={s.name}>Mendyr</Text>
      <ActivityIndicator color={colors.brand600} />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 14,
  },
  logo: { height: 74, width: 74 },
  name: { fontSize: 28, fontWeight: '800', color: colors.ink },
});
