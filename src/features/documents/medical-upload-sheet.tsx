import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Field, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { MedicalDocumentType } from '@/lib/types';
import type { MedicalDocumentInput } from './api';
import { MEDICAL_LABEL, MEDICAL_TYPES } from './labels';
import { SourceSheet } from './source-sheet';
import type { UploadSource } from './upload';

/** Patient upload: what it is (prescription, lab report…), an optional name, then the source. */
export function MedicalUploadSheet({
  visible,
  onClose,
  onPick,
  defaultType = 'prescription',
  title: sheetTitle,
  subtitle,
  before,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (input: Omit<MedicalDocumentInput, 'booking_id'>, source: UploadSource) => void;
  defaultType?: MedicalDocumentType;
  title?: string;
  subtitle?: string;
  /** Extra content above the upload form (e.g. existing documents to attach). */
  before?: React.ReactNode;
}) {
  const t = useT();
  const [type, setType] = useState<MedicalDocumentType>(defaultType);
  const [title, setTitle] = useState('');

  // Start fresh next time the sheet opens.
  const close = () => {
    onClose();
    setType(defaultType);
    setTitle('');
  };

  return (
    <SourceSheet
      visible={visible}
      onClose={close}
      title={sheetTitle ?? t('docs.form.uploadTitle')}
      subtitle={subtitle}
      onPick={(source) => onPick({ document_type: type, title: title.trim() || null }, source)}
    >
      {before}
      <Text variant="label" color="inkSoft">
        {t('docs.form.type')}
      </Text>
      <View style={s.chips}>
        {MEDICAL_TYPES.map((value) => (
          <Chip key={value} label={t(MEDICAL_LABEL[value])} selected={type === value} onPress={() => setType(value)} />
        ))}
      </View>
      <Field label={t('docs.form.title')} placeholder={t('docs.form.titleHint')} value={title} onChangeText={setTitle} maxLength={150} />
    </SourceSheet>
  );
}

const s = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
