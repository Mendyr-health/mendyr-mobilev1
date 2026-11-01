import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Badge, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { inr } from '@/lib/format';
import type { Service } from '@/lib/types';
import { useTheme } from '@/theme';

export function ServiceRating({ service }: { service: Service }) {
  const t = useT();
  const { colors: c } = useTheme();
  if (!service.rating_avg && !service.bookings_count) return null;
  return (
    <View style={s.meta}>
      {service.rating_avg ? (
        <View style={s.meta}>
          <Icon name="star" size={13} color={c.warning} fill={c.warning} />
          <Text variant="caption" color="inkSoft">
            {service.rating_avg.toFixed(1)} ({service.rating_count})
          </Text>
        </View>
      ) : null}
      {service.bookings_count > 0 ? (
        <Text variant="caption" color="subtle">
          {service.rating_avg ? '· ' : ''}
          {t('service.visitsBooked', { count: service.bookings_count.toLocaleString('en-IN') })}
        </Text>
      ) : null}
    </View>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  const t = useT();
  const { radius } = useTheme();
  return (
    <Card onPress={() => router.push(`/service/${service.id}`)} style={s.card} accessibilityLabel={service.name}>
      {service.image_url ? (
        <Image source={{ uri: service.image_url }} style={[s.image, { borderRadius: radius.input }]} contentFit="cover" transition={150} />
      ) : (
        <ProfessionIcon type={service.required_professional_type} size={64} />
      )}
      <View style={s.body}>
        {service.badge ? <Badge label={service.badge} tone="accent" /> : null}
        <Text variant="title" numberOfLines={2}>
          {service.name}
        </Text>
        {service.tagline ? (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {service.tagline}
          </Text>
        ) : null}
        <ServiceRating service={service} />
        <View style={s.priceRow}>
          <Text variant="title" color="ink">
            {inr(service.base_price)}
          </Text>
          <Text variant="caption" color="subtle">
            {t('service.perVisit', { minutes: service.duration_minutes })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  image: { width: 72, height: 72 },
  body: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
});
