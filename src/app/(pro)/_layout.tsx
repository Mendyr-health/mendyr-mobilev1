import { Stack } from 'expo-router';
import { InAppBannerProvider } from '@/features/notifications/in-app-banner';
import { NotificationWatcher } from '@/features/notifications/watcher';
import { RequestWatcher } from '@/features/pro/request-watcher';
import { neutral } from '@/theme/tokens';

export default function ProLayout() {
  return (
    <InAppBannerProvider>
      <NotificationWatcher />
      <RequestWatcher />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: neutral.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboard" options={{ gestureEnabled: false }} />
      </Stack>
    </InAppBannerProvider>
  );
}
