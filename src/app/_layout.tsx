import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/providers/auth';
import { colors } from '@/constants/theme';
import '../global.css';

export default function Layout() {
  const [c] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 20000 } },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={c}>
        <AuthProvider>
          <StatusBar style="dark" />
          <View style={s.outer}>
            <View style={s.container}>
              <Stack
                screenOptions={{
                  headerShadowVisible: false,
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.ink,
                  contentStyle: { backgroundColor: colors.background },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen
                  name="onboarding"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ headerShown: false }} />
                <Stack.Screen name="patient" options={{ headerShown: false }} />
                <Stack.Screen name="pro" options={{ headerShown: false }} />
              </Stack>
            </View>
          </View>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
});
