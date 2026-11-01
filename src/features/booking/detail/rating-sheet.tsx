import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Button, Chip, Field, Sheet, Text } from '@/components/ui';
import { useT, type CopyKey } from '@/i18n';
import { en } from '@/i18n/en';
import { tick } from '@/lib/haptics';
import { useTheme } from '@/theme';

const TAGS: CopyKey[] = ['rating.tag.punctual', 'rating.tag.gentle', 'rating.tag.skilled', 'rating.tag.clean', 'rating.tag.explained'];

export function RatingSheet({
  visible,
  onClose,
  onSubmit,
  busy,
  name,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: { rating: number; tags: string[]; comment: string | null }) => void;
  busy: boolean;
  name: string;
}) {
  const t = useT();
  const { colors: c } = useTheme();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<CopyKey[]>([]);
  const [comment, setComment] = useState('');
  const toggle = (tag: CopyKey) => setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]));

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('rating.title', { name })}
      subtitle={t('rating.subtitle')}
      footer={
        <Button
          title={t('rating.submit')}
          disabled={rating === 0}
          loading={busy}
          // Tags are stored in English whatever the UI language, so they aggregate cleanly.
          onPress={() => onSubmit({ rating, tags: tags.map((k) => en[k]), comment: comment.trim() || null })}
        />
      }
    >
      <View style={s.stars} accessibilityRole="adjustable" accessibilityLabel={t('rating.a11y', { rating })}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            hitSlop={6}
            onPress={() => {
              tick();
              setRating(n);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('rating.star', { n })}
          >
            <Icon name="star" size={38} color={n <= rating ? c.warning : c.border} fill={n <= rating ? c.warning : 'none'} strokeWidth={1.6} />
          </Pressable>
        ))}
      </View>
      {rating > 0 ? (
        <>
          <Text variant="label" color="inkSoft">
            {rating >= 4 ? t('rating.whatWentWell') : t('rating.whatToImprove')}
          </Text>
          <View style={s.tags}>
            {TAGS.map((key) => (
              <Chip key={key} label={t(key)} selected={tags.includes(key)} onPress={() => toggle(key)} />
            ))}
          </View>
          <Field placeholder={t('rating.commentHint')} value={comment} onChangeText={setComment} multiline maxLength={500} />
        </>
      ) : null}
    </Sheet>
  );
}

const s = StyleSheet.create({
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
