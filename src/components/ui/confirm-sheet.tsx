import { StyleSheet, View } from 'react-native';
import { useT } from '@/i18n';
import { Button } from './button';
import { Sheet } from './sheet';
import { Text } from './text';

/** A bottom-sheet confirmation for destructive actions. */
export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel: string;
  busy?: boolean;
}) {
  const t = useT();
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={s.footer}>
          <Button title={confirmLabel} variant="danger" icon="trash" loading={busy} onPress={onConfirm} />
          <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
        </View>
      }
    >
      {body ? (
        <Text variant="bodySm" color="muted">
          {body}
        </Text>
      ) : null}
    </Sheet>
  );
}

const s = StyleSheet.create({ footer: { gap: 4 } });
