import { useState } from 'react';
import { Button, Field, Sheet } from '@/components/ui';
import { useT } from '@/i18n';

export function CompleteSheet({
  visible,
  onClose,
  onSubmit,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: { notes: string | null; vitals: string | null }) => void;
  busy: boolean;
}) {
  const t = useT();
  const [notes, setNotes] = useState('');
  const [vitals, setVitals] = useState('');
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('visit.completeTitle')}
      subtitle={t('visit.completeSubtitle')}
      footer={
        <Button
          title={t('visit.complete')}
          variant="success"
          loading={busy}
          onPress={() => onSubmit({ notes: notes.trim() || null, vitals: vitals.trim() || null })}
        />
      }
    >
      <Field label={t('visit.vitals')} placeholder={t('visit.vitalsHint')} value={vitals} onChangeText={setVitals} multiline maxLength={2000} />
      <Field label={t('visit.notes')} placeholder={t('visit.notesHint')} value={notes} onChangeText={setNotes} multiline maxLength={4000} />
    </Sheet>
  );
}
