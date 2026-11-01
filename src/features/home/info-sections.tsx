import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, ProfessionIcon, type IconName } from '@/components/icons';
import { Card, PressableScale, SectionTitle, Text } from '@/components/ui';
import { useConfig, useFeature } from '@/config/provider';
import { useT, type CopyKey } from '@/i18n';
import { inr } from '@/lib/format';
import { callNumber, openWhatsApp } from '@/lib/linking';
import { useTheme } from '@/theme';
import { useServices } from '@/features/catalog/api';
import { useBookings } from '@/features/booking/api';

export function TrustStrip() {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const items: { icon: IconName; key: CopyKey }[] = [
    { icon: 'verified', key: 'home.trust.verified' },
    { icon: 'rupee', key: 'home.trust.payAfter' },
    { icon: 'star', key: 'home.trust.rated' },
  ];
  return (
    <View style={[s.trust, { backgroundColor: c.surface, borderRadius: radius.card, borderColor: c.border }]}>
      {items.map((item) => (
        <View key={item.key} style={s.trustItem}>
          <View style={[s.trustIcon, { backgroundColor: c.accentSoft }]}>
            <Icon name={item.icon} size={18} color={c.accent} />
          </View>
          <Text variant="caption" color="inkSoft" align="center">
            {t(item.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function HowItWorks({ title }: { title: string | null }) {
  const t = useT();
  const { colors: c } = useTheme();
  const steps: { title: CopyKey; body: CopyKey }[] = [
    { title: 'home.how.1.title', body: 'home.how.1.body' },
    { title: 'home.how.2.title', body: 'home.how.2.body' },
    { title: 'home.how.3.title', body: 'home.how.3.body' },
  ];
  return (
    <View style={s.gap}>
      <SectionTitle title={title ?? t('home.how')} />
      <Card style={s.gap}>
        {steps.map((step, i) => (
          <View key={step.title} style={s.step}>
            <View style={[s.stepNo, { backgroundColor: c.primarySoft }]}>
              <Text variant="label" color="primaryDark">
                {i + 1}
              </Text>
            </View>
            <View style={s.flex}>
              <Text variant="title">{t(step.title)}</Text>
              <Text variant="bodySm" color="muted">
                {t(step.body)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

export function BookAgain({ title }: { title: string | null }) {
  const t = useT();
  const { radius } = useTheme();
  const bookings = useBookings();
  const services = useServices();
  const seen = new Set<string>();
  const again = (bookings.data ?? [])
    .filter((b) => b.status === 'completed')
    .map((b) => services.data?.find((s) => s.name === b.service_name_snapshot))
    .filter((s): s is NonNullable<typeof s> => !!s && !seen.has(s.id) && !!seen.add(s.id))
    .slice(0, 6);
  if (again.length === 0) return null;
  return (
    <View style={s.gap}>
      <SectionTitle title={title ?? t('home.bookAgain')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.againRow}>
        {again.map((service) => (
          <Card key={service.id} onPress={() => router.push(`/book?service=${service.id}`)} style={[s.againCard, { borderRadius: radius.card }]} accessibilityLabel={service.name}>
            <ProfessionIcon type={service.required_professional_type} size={36} />
            <Text variant="label" numberOfLines={2}>
              {service.name}
            </Text>
            <Text variant="caption" color="primary">
              {inr(service.base_price)} · {t('home.rebook')}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

export function SupportCard() {
  const t = useT();
  const { colors: c } = useTheme();
  const support = useConfig('app.support');
  const sos = useFeature('sos');
  return (
    <Card style={s.gap}>
      <View style={s.supportHead}>
        <View style={s.flex}>
          <Text variant="h3">{t('home.support.title')}</Text>
          <Text variant="bodySm" color="muted">
            {t('home.support.body', { hours: support.hours })}
          </Text>
        </View>
        <Icon name="headset" size={28} color={c.primary} />
      </View>
      <View style={s.row}>
        {support.whatsapp ? (
          <SupportAction icon="whatsapp" label={t('support.whatsapp')} onPress={() => openWhatsApp(support.whatsapp!)} />
        ) : null}
        {support.phone ? <SupportAction icon="phone" label={t('support.call')} onPress={() => callNumber(support.phone!)} /> : null}
        <SupportAction icon="info" label={t('support.help')} onPress={() => router.push('/support')} />
      </View>
      {sos ? (
        <PressableScale
          onPress={() => callNumber(support.sos_number)}
          accessibilityLabel={t('support.sosLabel', { number: support.sos_number })}
          style={[s.sos, { backgroundColor: c.dangerSoft }]}
        >
          <Icon name="siren" size={20} color={c.danger} />
          <View style={s.flex}>
            <Text variant="title" color="danger">
              {t('support.sos')}
            </Text>
            <Text variant="caption" color="danger">
              {t('support.sosBody', { sos: support.sos_number, ambulance: support.ambulance_number })}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={c.danger} />
        </PressableScale>
      ) : null}
    </Card>
  );
}

function SupportAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors: c, radius } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={[s.action, { backgroundColor: c.primarySoft, borderRadius: radius.input }]}>
      <Icon name={icon} size={18} color={c.primary} />
      <Text variant="label" color="primaryDark">
        {label}
      </Text>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 12 },
  bleed: { marginHorizontal: -16 },
  row: { flexDirection: 'row', gap: 10 },
  trust: { flexDirection: 'row', padding: 14, borderWidth: 1, gap: 8 },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  againRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  againCard: { width: 150, gap: 8 },
  supportHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  action: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 },
  sos: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
});
