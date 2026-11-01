import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const t = useT();
  return (
    <KeyboardAvoidingView style={[s.root, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      >
        <View style={s.brand}>
          <Image source={require('@/assets/branding/mendyr.png')} style={s.logo} contentFit="contain" accessibilityIgnoresInvertColors />
          <View>
            <Text variant="h3">Mendyr</Text>
            <Text variant="caption" color="subtle">
              {t('brand.tagline')}
            </Text>
          </View>
        </View>
        <View style={s.heading}>
          <Text variant="h1" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color="muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  heading: { gap: 6, marginTop: 8 },
});
