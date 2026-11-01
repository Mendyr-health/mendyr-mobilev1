import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const KEY = 'mendyr.onboarding-complete';
let cached: boolean | null = null;

export async function markOnboardingSeen() {
  cached = true;
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    /* best-effort */
  }
}

/** null while loading, then whether the intro slides were already shown. */
export function useOnboardingSeen(): boolean | null {
  const [seen, setSeen] = useState<boolean | null>(cached);
  useEffect(() => {
    if (cached !== null) return;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        cached = v === '1';
        setSeen(cached);
      })
      .catch(() => setSeen(false));
  }, []);
  return seen;
}
