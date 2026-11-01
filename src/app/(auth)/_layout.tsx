import { Stack } from 'expo-router';
import { neutral } from '@/theme/tokens';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: neutral.background } }} />;
}
