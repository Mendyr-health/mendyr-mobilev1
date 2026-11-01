import { StyleSheet, Switch, View } from 'react-native';
import { Card, EmptyState, ErrorState, Header, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { inr } from '@/lib/format';
import { tick } from '@/lib/haptics';
import type { MyService } from '@/lib/types';
import { useTheme } from '@/theme';
import { useMyServices, useToggleService } from './api';

/** Opt in/out of catalogue services — `PUT /professionals/me/services/{id}`. */
export function ServicesScreen() {
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const services = useMyServices();
  const toggle = useToggleService();

  const groups = (services.data ?? []).reduce<Record<string, MyService[]>>((acc, s) => {
    (acc[s.category_name] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Screen header={<Header title={t('pro.services')} />} onRefresh={() => services.refetch()}>
      <Text variant="bodySm" color="muted">
        {t('services.body')}
      </Text>
      {services.isPending ? (
        <SkeletonList count={4} lines={1} />
      ) : services.isError ? (
        <ErrorState error={services.error} onRetry={() => services.refetch()} />
      ) : services.data.length === 0 ? (
        <EmptyState icon="stethoscope" title={t('services.empty')} />
      ) : (
        Object.entries(groups).map(([category, items]) => (
          <View key={category} style={s.group}>
            <Text variant="overline" color="subtle">
              {category.toUpperCase()}
            </Text>
            <Card padded={false} style={s.card}>
              {items.map((svc, i) => (
                <View key={svc.service_id} style={[s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}>
                  <View style={s.flex}>
                    <Text variant="title">{svc.service_name}</Text>
                    <Text variant="caption" color="subtle">
                      {inr(svc.effective_price)}
                    </Text>
                  </View>
                  <Switch
                    value={svc.is_opted_in}
                    onValueChange={(on) => {
                      tick();
                      toggle.mutate({ id: svc.service_id, on }, { onError: (e) => toast.show(e.message, 'error') });
                    }}
                    trackColor={{ true: c.primary, false: c.border }}
                    thumbColor={c.white}
                    accessibilityLabel={svc.service_name}
                  />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  group: { gap: 8 },
  card: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
