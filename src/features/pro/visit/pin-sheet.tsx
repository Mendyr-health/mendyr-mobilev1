import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';

/** 4-digit visit PIN entry. `error` is shown under the boxes (e.g. visit_pin_invalid). */
export function PinSheet({
  visible,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const t = useT();
  const { colors: c, radius, type } = useTheme();
  const [pin, setPin] = useState('');
  const input = useRef<TextInput>(null);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('visit.pinTitle')}
      subtitle={t('visit.pinSubtitle')}
      footer={<Button title={t('visit.start')} disabled={pin.length !== 4} loading={busy} onPress={() => onSubmit(pin)} />}
    >
      <Pressable onPress={() => input.current?.focus()} style={s.boxes} accessibilityLabel={t('visit.pinTitle')}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              s.box,
              {
                borderRadius: radius.input,
                borderColor: error ? c.danger : pin.length === i ? c.primary : c.border,
                backgroundColor: c.surfaceAlt,
              },
            ]}
          >
            <Text variant="h1">{pin[i] ?? ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={pin}
        onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus
        textContentType="oneTimeCode"
        style={[type.body, s.hidden]}
        accessibilityLabel={t('visit.pinTitle')}
      />
      {error ? (
        <Text variant="bodySm" color="danger" align="center" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}

const s = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 8 },
  box: { width: 56, height: 64, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
