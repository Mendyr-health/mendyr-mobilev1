import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Button, EmptyState, ErrorState, PressableScale, SkeletonList, Text } from '@/components/ui';
import { useAddresses } from '@/features/addresses/api';
import { useT } from '@/i18n';
import { addressLine } from '@/lib/format';
import { useTheme } from '@/theme';

export function AddressStep({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const addresses = useAddresses();

  if (addresses.isPending) return <SkeletonList count={2} />;
  if (addresses.isError) return <ErrorState error={addresses.error} onRetry={() => addresses.refetch()} />;

  return (
    <View style={s.wrap}>
      {addresses.data.length === 0 ? (
        <EmptyState icon="pin" title={t('address.emptyTitle')} body={t('address.emptyBody')} />
      ) : (
        addresses.data.map((a) => {
          const active = a.id === selected;
          return (
            <PressableScale
              key={a.id}
              onPress={() => onSelect(a.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${a.label}, ${addressLine(a)}`}
              style={[s.card, { borderRadius: radius.card, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.surface }]}
            >
              <View style={[s.radio, { borderColor: active ? c.primary : c.faint }]}>
                {active ? <View style={[s.radioDot, { backgroundColor: c.primary }]} /> : null}
              </View>
              <View style={s.flex}>
                <Text variant="title">{a.label}</Text>
                <Text variant="bodySm" color="muted">
                  {addressLine(a)}
                </Text>
                {a.contact_name ? (
                  <View style={s.contact}>
                    <Icon name="user" size={12} color={c.subtle} />
                    <Text variant="caption" color="subtle">
                      {t('address.forContact', { name: a.contact_name })}
                    </Text>
                  </View>
                ) : null}
              </View>
            </PressableScale>
          );
        })
      )}
      <Button title={t('address.addNew')} icon="plus" variant="outline" onPress={() => router.push('/address-form?from=book')} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  flex: { flex: 1, gap: 2 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1.5, alignItems: 'flex-start' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
