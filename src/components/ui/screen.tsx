import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/icons';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { Text } from './text';

/** Page header for stack screens: back chevron, title, optional right slot. */
export function Header({ title, right, onBack }: { title?: string; right?: React.ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const t = useT();
  return (
    <View style={[s.header, { paddingTop: insets.top + 6, backgroundColor: c.background }]}>
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={[s.back, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <Icon name="chevronLeft" size={22} color={c.ink} />
      </Pressable>
      <Text variant="h3" numberOfLines={1} style={s.title} accessibilityRole="header">
        {title ?? ''}
      </Text>
      <View style={s.right}>{right}</View>
    </View>
  );
}

type ScreenProps = ScrollViewProps & {
  /** Pull-to-refresh handler; the spinner shows until the promise settles. */
  onRefresh?: () => Promise<unknown>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Add top safe-area padding (for tab screens without a Header). */
  safeTop?: boolean;
};

export function Screen({ onRefresh, header, footer, safeTop, contentContainerStyle, children, ...rest }: ScreenProps) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      {header}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              tintColor={c.primary}
              colors={[c.primary]}
              onRefresh={() => {
                setRefreshing(true);
                onRefresh().finally(() => setRefreshing(false));
              }}
            />
          ) : undefined
        }
        {...rest}
        contentContainerStyle={[
          s.content,
          { paddingTop: safeTop ? insets.top + 12 : 8, paddingBottom: footer ? 16 : insets.bottom + 24 },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: c.border, backgroundColor: c.surface }]}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.section}>
      <Text variant="h3" accessibilityRole="header" style={s.flex}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text variant="label" color="primary">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { flex: 1 },
  right: { minWidth: 40, alignItems: 'flex-end' },
  content: { paddingHorizontal: 16, gap: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
});
