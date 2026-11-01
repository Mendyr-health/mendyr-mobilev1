import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tick } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { Icon, type IconName } from './icons';
import { Text } from './ui';

export type TabSpec = { name: string; label: string; icon: IconName; badge?: number };

/** Bottom tab bar. Switching is instant (no transition, no overlay) with a haptic tick. */
export function TabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: TabSpec[] }) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: c.surface, borderTopColor: c.border }]}
    >
      {state.routes.map((route, index) => {
        const spec = tabs.find((t) => t.name === route.name);
        if (!spec) return null;
        const focused = state.index === index;
        const color = focused ? c.primary : c.subtle;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={spec.badge ? `${spec.label}, ${spec.badge}` : spec.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                tick();
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={s.item}
          >
            <View style={[s.pill, focused && { backgroundColor: c.primarySoft }]}>
              <Icon name={spec.icon} size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
              {spec.badge ? (
                <View style={[s.badge, { backgroundColor: c.danger, borderColor: c.surface }]}>
                  <Text variant="overline" color={c.white} style={s.badgeText}>
                    {spec.badge > 9 ? '9+' : spec.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="caption" color={color} numberOfLines={1} style={focused ? s.focused : null}>
              {spec.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 48 },
  pill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: 8, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  badgeText: { fontSize: 9, lineHeight: 11, letterSpacing: 0 },
  focused: { fontFamily: 'Inter_600SemiBold' },
});
