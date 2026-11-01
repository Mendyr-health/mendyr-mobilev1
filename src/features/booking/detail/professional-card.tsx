import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Avatar, Badge, Button, Card, Text } from '@/components/ui';
import { PROFESSIONS } from '@/constants/professions';
import { useT } from '@/i18n';
import { callNumber } from '@/lib/linking';
import type { AssignedProfessional } from '@/lib/types';
import { useTheme } from '@/theme';

export function ProfessionalCard({ pro, contactHidden }: { pro: AssignedProfessional; contactHidden: boolean }) {
  const t = useT();
  const { colors: c } = useTheme();
  const profession = PROFESSIONS.find((p) => p.type === pro.professional_type)?.label ?? pro.professional_type;
  const canCall = !contactHidden && !!pro.phone_number;
  return (
    <Card style={s.card}>
      <View style={s.row}>
        <Avatar name={contactHidden ? pro.user_ref : pro.full_name} uri={contactHidden ? null : pro.avatar_url} size={56} />
        <View style={s.flex}>
          <Text variant="title" numberOfLines={1}>
            {contactHidden ? t('privacy.professionalRef', { ref: pro.user_ref }) : pro.full_name}
          </Text>
          <Text variant="caption" color="muted">
            {profession}
            {pro.years_of_experience ? ` · ${t('pro.yearsExp', { years: pro.years_of_experience })}` : ''}
          </Text>
          <View style={s.meta}>
            {pro.is_verified ? <Badge label={t('common.verified')} tone="success" icon="verified" /> : null}
            {pro.total_ratings > 0 ? (
              <View style={s.rating}>
                <Icon name="star" size={13} color={c.warning} fill={c.warning} />
                <Text variant="caption" color="inkSoft">
                  {pro.average_rating.toFixed(1)} ({pro.total_ratings})
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {pro.languages_spoken?.length ? (
        <View style={s.rating}>
          <Icon name="languages" size={14} color={c.subtle} />
          <Text variant="caption" color="muted">
            {t('pro.speaks', { languages: pro.languages_spoken.join(', ') })}
          </Text>
        </View>
      ) : null}
      {canCall ? (
        <Button title={t('booking.callPro', { name: pro.full_name.split(' ')[0] })} icon="phone" variant="secondary" onPress={() => callNumber(pro.phone_number!)} />
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  card: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
