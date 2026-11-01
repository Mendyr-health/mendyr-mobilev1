import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Badge, Button, Card, ErrorState, Header, Screen, Skeleton, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { inr } from '@/lib/format';
import { useTheme } from '@/theme';
import { useService } from './api';
import { ServiceRating } from './service-card';

export function ServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { colors: c, radius } = useTheme();
  const service = useService(id);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const svc = service.data;

  if (!svc) {
    return (
      <Screen header={<Header />}>
        {service.isError ? (
          <ErrorState error={service.error} onRetry={() => service.refetch()} />
        ) : (
          <>
            <Skeleton height={200} radius={16} />
            <Skeleton height={24} width="60%" />
            <Skeleton height={14} />
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen
      header={<Header title={svc.name} />}
      onRefresh={() => service.refetch()}
      footer={
        <View style={s.footer}>
          <View style={s.flex}>
            <Text variant="h3">{inr(svc.base_price)}</Text>
            <Text variant="caption" color="subtle">
              {t('price.plusGst')}
            </Text>
          </View>
          <Button title={t('service.book')} full={false} size="lg" onPress={() => router.push(`/book?service=${svc.id}`)} style={s.cta} />
        </View>
      }
    >
      {svc.image_url ? (
        <Image source={{ uri: svc.image_url }} style={[s.image, { borderRadius: radius.card }]} contentFit="cover" transition={150} />
      ) : (
        <View style={[s.art, { backgroundColor: c.primarySoft, borderRadius: radius.card }]}>
          <ProfessionIcon type={svc.required_professional_type} size={88} />
        </View>
      )}
      <View style={s.intro}>
        {svc.badge ? <Badge label={svc.badge} tone="accent" /> : null}
        <Text variant="h1">{svc.name}</Text>
        {svc.tagline ? (
          <Text variant="body" color="muted">
            {svc.tagline}
          </Text>
        ) : null}
        <ServiceRating service={svc} />
        <View style={s.chips}>
          <Badge label={t('service.duration', { minutes: svc.duration_minutes })} icon="clock" />
          <Badge label={t('service.payAfter')} icon="rupee" tone="success" />
          {svc.requires_prescription ? <Badge label={t('service.prescription')} icon="clipboard" tone="warning" /> : null}
        </View>
      </View>
      {svc.description ? (
        <Text variant="body" color="inkSoft">
          {svc.description}
        </Text>
      ) : null}
      {svc.includes.length ? (
        <Card style={s.list}>
          <Text variant="h3">{t('service.includes')}</Text>
          {svc.includes.map((item) => (
            <View key={item} style={s.item}>
              <Icon name="checkCircle" size={18} color={c.success} />
              <Text variant="bodySm" style={s.flex}>
                {item}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      {svc.excludes.length ? (
        <Card style={s.list}>
          <Text variant="h3">{t('service.excludes')}</Text>
          {svc.excludes.map((item) => (
            <View key={item} style={s.item}>
              <Icon name="ban" size={18} color={c.subtle} />
              <Text variant="bodySm" color="muted" style={s.flex}>
                {item}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      {svc.faqs.length ? (
        <Card style={s.list}>
          <Text variant="h3">{t('service.faqs')}</Text>
          {svc.faqs.map((faq, i) => (
            <Pressable
              key={faq.q}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: openFaq === i }}
              style={[s.faq, { borderTopColor: c.divider }]}
            >
              <View style={s.item}>
                <Text variant="title" style={s.flex}>
                  {faq.q}
                </Text>
                <Icon name={openFaq === i ? 'minus' : 'plus'} size={18} color={c.subtle} />
              </View>
              {openFaq === i ? (
                <Text variant="bodySm" color="muted">
                  {faq.a}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  image: { width: '100%', height: 200 },
  art: { height: 160, alignItems: 'center', justifyContent: 'center' },
  intro: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  list: { gap: 10 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  faq: { gap: 6, paddingTop: 10, borderTopWidth: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cta: { minWidth: 160 },
});
