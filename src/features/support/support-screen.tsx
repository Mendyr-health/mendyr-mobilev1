import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Card, Header, ListRow, PressableScale, Screen, Text } from '@/components/ui';
import { useConfig, useFeature } from '@/config/provider';
import { useT } from '@/i18n';
import { callNumber, openEmail, openWhatsApp } from '@/lib/linking';
import { useTheme } from '@/theme';

/** Help & support, driven by `app.support`. */
export function SupportScreen() {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const support = useConfig('app.support');
  const sos = useFeature('sos');
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Screen header={<Header title={t('support.title')} />}>
      {sos ? (
        <View style={s.emergency}>
          <PressableScale
            onPress={() => callNumber(support.sos_number)}
            accessibilityLabel={t('support.sosLabel', { number: support.sos_number })}
            style={[s.sos, { backgroundColor: c.danger, borderRadius: radius.card }]}
          >
            <Icon name="siren" size={24} color={c.white} />
            <Text variant="title" color={c.white}>
              {t('support.sos')}
            </Text>
            <Text variant="caption" color={c.white}>
              {support.sos_number}
            </Text>
          </PressableScale>
          <PressableScale
            onPress={() => callNumber(support.ambulance_number)}
            accessibilityLabel={t('support.ambulanceLabel', { number: support.ambulance_number })}
            style={[s.sos, { backgroundColor: c.dangerSoft, borderRadius: radius.card }]}
          >
            <Icon name="ambulance" size={24} color={c.danger} />
            <Text variant="title" color="danger">
              {t('support.ambulance')}
            </Text>
            <Text variant="caption" color="danger">
              {support.ambulance_number}
            </Text>
          </PressableScale>
        </View>
      ) : null}
      <Card padded={false} style={s.group}>
        {support.whatsapp ? (
          <ListRow icon="whatsapp" title={t('support.whatsapp')} subtitle={support.hours} onPress={() => openWhatsApp(support.whatsapp!, t('support.whatsappText'))} />
        ) : null}
        {support.phone ? <ListRow icon="phone" title={t('support.call')} subtitle={support.phone} onPress={() => callNumber(support.phone!)} /> : null}
        {support.email ? <ListRow icon="mail" title={t('support.email')} subtitle={support.email} onPress={() => openEmail(support.email!)} /> : null}
        {!support.whatsapp && !support.phone && !support.email ? (
          <ListRow icon="clock" title={t('support.hours')} subtitle={support.hours} />
        ) : null}
      </Card>
      {support.faqs.length ? (
        <Card style={s.faqs}>
          <Text variant="h3">{t('support.faqs')}</Text>
          {support.faqs.map((faq, i) => (
            <Pressable
              key={faq.q}
              onPress={() => setOpen(open === i ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open === i }}
              style={[s.faq, { borderTopColor: c.divider }]}
            >
              <View style={s.faqHead}>
                <Text variant="title" style={s.flex}>
                  {faq.q}
                </Text>
                <Icon name={open === i ? 'minus' : 'plus'} size={18} color={c.subtle} />
              </View>
              {open === i ? (
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
  emergency: { flexDirection: 'row', gap: 12 },
  sos: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 18 },
  group: { paddingHorizontal: 16, paddingVertical: 4 },
  faqs: { gap: 10 },
  faq: { gap: 6, paddingTop: 10, borderTopWidth: 1 },
  faqHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
});
