import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** The 4-digit visit PIN the patient reads out at the door (`visit_otp`). */
export function PinCard({ pin }: { pin: string }) {
  const t = useT();
  const { colors: c, radius } = useTheme();
  return (
    <View
      style={[s.card, { backgroundColor: c.primarySoft, borderRadius: radius.card, borderColor: c.primaryMuted }]}
      accessible
      accessibilityLabel={t('pin.a11y', { pin: pin.split('').join(' ') })}
    >
      <View style={s.head}>
        <Icon name="lock" size={16} color={c.primaryDark} />
        <Text variant="label" color="primaryDark">
          {t('pin.title')}
        </Text>
      </View>
      <View style={s.digits}>
        {pin.split('').map((d, i) => (
          <View key={i} style={[s.digit, { backgroundColor: c.surface, borderRadius: radius.input }]}>
            <Text variant="h1" color="primaryDark">
              {d}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" color="muted" align="center">
        {t('pin.body')}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 16, gap: 12, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  digits: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  digit: { width: 56, height: 64, alignItems: 'center', justifyContent: 'center' },
});
