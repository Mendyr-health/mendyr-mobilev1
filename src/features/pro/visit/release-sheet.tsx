import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Sheet, Text } from '@/components/ui';
import { useConfig } from '@/config/provider';
import { useT } from '@/i18n';

/** "Can't make it": the visit goes back to other professionals. */
export function ReleaseSheet({
  visible,
  onClose,
  onConfirm,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
}) {
  const t = useT();
  const reasons = useConfig('booking.cancel_reasons').professional;
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('visit.releaseTitle')}
      subtitle={t('visit.releaseSubtitle')}
      footer={
        <View style={s.footer}>
          <Button title={t('visit.releaseConfirm')} variant="danger" disabled={!reason} loading={busy} onPress={() => reason && onConfirm(reason)} />
          <Button title={t('visit.keep')} variant="ghost" onPress={onClose} />
        </View>
      }
    >
      <View style={s.reasons}>
        {reasons.map((r) => (
          <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <Text variant="caption" color="muted">
        {t('visit.releaseNote')}
      </Text>
    </Sheet>
  );
}

const s = StyleSheet.create({
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { gap: 4 },
});
