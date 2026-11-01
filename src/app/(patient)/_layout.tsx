import { Stack } from 'expo-router';
import { InAppBannerProvider } from '@/features/notifications/in-app-banner';
import { NotificationWatcher } from '@/features/notifications/watcher';
import { neutral } from '@/theme/tokens';

export default function PatientLayout() {
  return (
    <InAppBannerProvider>
      <NotificationWatcher />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: neutral.background } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </InAppBannerProvider>
  );
}
