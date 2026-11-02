import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { Card, ErrorState, Skeleton, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { addressLine, istIso, when } from '@/lib/format';
import type { Address, Service } from '@/lib/types';
import { useTheme } from '@/theme';
import { useQuote } from '../api';
import { PriceBreakdown } from '../price-breakdown';

export function ReviewStep({
  service,
  address,
  dateKey,
  time,
  female,
  notes,
  documentCount = 0,
}: {
  service: Service;
  address: Address;
  dateKey: string;
  time: string;
  female: boolean;
  notes: string;
  documentCount?: number;
}) {
  const t = useT();
  const quote = useQuote(service.id, address.id);
  return (
    <View style={s.wrap}>
      <Card style={s.summary}>
        <Line icon="stethoscope" label={service.name} sub={t('service.duration', { minutes: service.duration_minutes })} />
        <Line icon="calendar" label={when(istIso(dateKey, time), { today: t('common.today'), tomorrow: t('common.tomorrow') })} />
        <Line icon="pin" label={address.label} sub={addressLine(address)} />
        {address.contact_name ? <Line icon="user" label={t('address.forContact', { name: address.contact_name })} /> : null}
        {female ? <Line icon="female" label={t('booking.femalePreferred')} /> : null}
        {notes.trim() ? <Line icon="edit" label={notes.trim()} /> : null}
        {documentCount > 0 ? (
          <Line icon="paperclip" label={documentCount === 1 ? t('book.docs.reviewOne') : t('book.docs.reviewMany', { count: documentCount })} />
        ) : null}
      </Card>
      <Card>
        {quote.isPending ? (
          <View style={s.skeleton}>
            <Skeleton height={14} />
            <Skeleton height={14} width="70%" />
            <Skeleton height={22} width="40%" />
          </View>
        ) : quote.isError ? (
          <ErrorState error={quote.error} onRetry={() => quote.refetch()} />
        ) : (
          <PriceBreakdown base={quote.data.base_price} discount={quote.data.discount_amount} tax={quote.data.tax_amount} total={quote.data.total_amount} />
        )}
      </Card>
    </View>
  );
}

function Line({ icon, label, sub }: { icon: IconName; label: string; sub?: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={s.line}>
      <Icon name={icon} size={16} color={c.primary} />
      <View style={s.flex}>
        <Text variant="bodySm">{label}</Text>
        {sub ? (
          <Text variant="caption" color="subtle">
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  summary: { gap: 12 },
  line: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  flex: { flex: 1 },
  skeleton: { gap: 10 },
});
