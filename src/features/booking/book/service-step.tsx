import { StyleSheet, View } from 'react-native';
import { ProfessionIcon } from '@/components/icons';
import { ErrorState, PressableScale, SkeletonList, Text } from '@/components/ui';
import { useServices } from '@/features/catalog/api';
import { inr } from '@/lib/format';
import { useTheme } from '@/theme';

export function ServiceStep({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const { colors: c, radius } = useTheme();
  const services = useServices();
  if (services.isPending) return <SkeletonList count={4} lines={1} />;
  if (services.isError) return <ErrorState error={services.error} onRetry={() => services.refetch()} />;
  return (
    <View style={s.wrap}>
      {services.data.map((svc) => {
        const active = svc.id === selected;
        return (
          <PressableScale
            key={svc.id}
            onPress={() => onSelect(svc.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={svc.name}
            style={[s.card, { borderRadius: radius.card, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.surface }]}
          >
            <ProfessionIcon type={svc.required_professional_type} size={40} />
            <View style={s.flex}>
              <Text variant="title" numberOfLines={1}>
                {svc.name}
              </Text>
              {svc.tagline ? (
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {svc.tagline}
                </Text>
              ) : null}
            </View>
            <Text variant="label">{inr(svc.base_price)}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  flex: { flex: 1, gap: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1.5 },
});
