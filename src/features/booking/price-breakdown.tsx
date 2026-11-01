import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { inr } from '@/lib/format';
import { useTheme } from '@/theme';

/** Patient-facing price: base − discount + GST. The platform fee is the professional's
 * commission and is never shown to patients. */
export function PriceBreakdown({
  base,
  discount,
  tax,
  total,
}: {
  base: number;
  discount: number;
  tax: number;
  total: number;
}) {
  const t = useT();
  const { colors: c } = useTheme();
  return (
    <View style={s.wrap}>
      <Row label={t('price.base')} value={inr(base)} />
      {discount > 0 ? <Row label={t('price.discount')} value={`− ${inr(discount)}`} color={c.success} /> : null}
      <Row label={t('price.gst')} value={inr(tax)} />
      <View style={[s.divider, { backgroundColor: c.border }]} />
      <View style={s.row}>
        <Text variant="title">{t('price.total')}</Text>
        <Text variant="h3">{inr(total)}</Text>
      </View>
      <View style={[s.pay, { backgroundColor: c.successSoft }]}>
        <Icon name="rupee" size={16} color={c.success} />
        <Text variant="label" color="success" style={s.flex}>
          {t('price.payAfter')}
        </Text>
      </View>
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.row}>
      <Text variant="bodySm" color="muted">
        {label}
      </Text>
      <Text variant="bodySm" color={color ?? 'ink'}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 8 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginTop: 4 },
});
