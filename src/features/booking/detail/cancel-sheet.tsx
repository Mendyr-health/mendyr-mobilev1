import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Field, Sheet, Text } from '@/components/ui';
import { useConfig, useRules } from '@/config/provider';
import { useT } from '@/i18n';
import { inr } from '@/lib/format';
import type { Booking } from '@/lib/types';

const FEE_STATUSES = ['assigned', 'confirmed', 'en_route'];

export function CancelSheet({
  booking,
  visible,
  onClose,
  onConfirm,
  busy,
}: {
  booking: Booking;
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const t = useT();
  const rules = useRules();
  const reasons = useConfig('booking.cancel_reasons').patient;
  const [reason, setReason] = useState<string | null>(null);
  const [other, setOther] = useState('');

  const minutesToStart = (new Date(booking.scheduled_start_at).getTime() - Date.now()) / 60_000;
  const feeApplies = FEE_STATUSES.includes(booking.status) && minutesToStart < rules.free_cancel_window_minutes;
  const fee = Math.round(booking.total_amount * rules.cancellation_fee_pct) / 100;
  const isOther = reason === 'Other';
  const finalReason = isOther ? other.trim() || 'Other' : reason;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('cancel.title')}
      subtitle={t('cancel.subtitle')}
      footer={
        <View style={s.footer}>
          <Button title={t('cancel.confirm')} variant="danger" disabled={!finalReason} loading={busy} onPress={() => finalReason && onConfirm(finalReason)} />
          <Button title={t('cancel.keep')} variant="ghost" onPress={onClose} />
        </View>
      }
    >
      <View style={s.reasons}>
        {reasons.map((r) => (
          <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      {isOther ? <Field placeholder={t('cancel.otherHint')} value={other} onChangeText={setOther} maxLength={300} /> : null}
      <Text variant="bodySm" color={feeApplies ? 'danger' : 'muted'}>
        {feeApplies
          ? t('cancel.feeApplies', { fee: inr(fee), pct: rules.cancellation_fee_pct })
          : t('cancel.free', { minutes: rules.free_cancel_window_minutes })}
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { gap: 4 },
});
