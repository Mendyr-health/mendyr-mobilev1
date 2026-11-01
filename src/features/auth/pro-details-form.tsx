import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, ProfessionIcon } from '@/components/icons';
import { Button, Chip, Field, PressableScale, Text } from '@/components/ui';
import { useConfig } from '@/config/provider';
import { PROFESSIONS, registrationLabel, registrationPlaceholder } from '@/constants/professions';
import { useT } from '@/i18n';
import { getDevicePosition } from '@/lib/location';
import { useTheme } from '@/theme';
import type { ProDetails } from './pro-onboarding';

/** Profession, credentials, base location and radius — used by sign-up and by the
 * finish-onboarding screen. */
export function ProDetailsForm({
  value,
  onChange,
  errorField,
}: {
  value: ProDetails;
  onChange: (next: ProDetails) => void;
  errorField?: string | null;
}) {
  const t = useT();
  const { colors: c, radius } = useTheme();
  const settings = useConfig('pro.settings');
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const set = (patch: Partial<ProDetails>) => onChange({ ...value, ...patch });

  async function useMyLocation() {
    setLocating(true);
    setLocateError(null);
    const position = await getDevicePosition();
    setLocating(false);
    if (position) set({ position });
    else setLocateError(t('location.denied'));
  }

  return (
    <View style={s.wrap}>
      <Text variant="label" color="inkSoft">
        {t('pro.form.profession')}
      </Text>
      <View style={s.grid}>
        {PROFESSIONS.map((p) => {
          const active = value.professionalType === p.type;
          return (
            <PressableScale
              key={p.type}
              onPress={() => set({ professionalType: p.type })}
              accessibilityState={{ selected: active }}
              accessibilityLabel={p.label}
              style={[
                s.profession,
                { borderRadius: radius.input, borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.surface },
              ]}
            >
              <ProfessionIcon type={p.type} size={32} />
              <Text variant="label" numberOfLines={2} style={s.flex}>
                {p.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Field
        label={registrationLabel(value.professionalType)}
        placeholder={registrationPlaceholder(value.professionalType)}
        value={value.registrationNo}
        onChangeText={(registrationNo) => set({ registrationNo })}
        autoCapitalize="characters"
        error={errorField === 'registration' ? t('pro.form.registrationError') : null}
      />
      <Field
        label={t('pro.form.years')}
        placeholder="4"
        keyboardType="number-pad"
        maxLength={2}
        value={value.years}
        onChangeText={(years) => set({ years: years.replace(/\D/g, '') })}
        error={errorField === 'years' ? t('pro.form.yearsError') : null}
      />
      <Text variant="label" color="inkSoft">
        {t('pro.form.radius')}
      </Text>
      <View style={s.chips}>
        {settings.radius_options_km.map((km) => (
          <Chip key={km} label={`${km} km`} selected={value.radiusKm === km} onPress={() => set({ radiusKm: km })} />
        ))}
      </View>
      <Text variant="label" color="inkSoft">
        {t('pro.form.base')}
      </Text>
      {value.position ? (
        <View style={[s.located, { backgroundColor: c.successSoft, borderRadius: radius.input }]}>
          <Icon name="checkCircle" size={18} color={c.success} />
          <Text variant="bodySm" style={s.flex}>
            {t('pro.form.located')}
          </Text>
          <Text variant="label" color="primary" onPress={() => set({ position: null })}>
            {t('common.change')}
          </Text>
        </View>
      ) : (
        <>
          <Button title={t('location.useCurrent')} icon="locate" variant="secondary" loading={locating} onPress={useMyLocation} />
          {locateError ? (
            <Text variant="caption" color="danger">
              {locateError}
            </Text>
          ) : null}
          <Text variant="caption" color="subtle" align="center">
            {t('pro.form.orPincode')}
          </Text>
          <View style={s.row}>
            <View style={s.flex}>
              <Field
                label={t('address.pincode')}
                keyboardType="number-pad"
                maxLength={6}
                value={value.pincode}
                onChangeText={(pincode) => set({ pincode: pincode.replace(/\D/g, '') })}
                error={errorField === 'location' ? t('address.pincodeError') : null}
              />
            </View>
            <View style={s.flex}>
              <Field label={t('address.city')} value={value.city} onChangeText={(city) => set({ city })} />
            </View>
          </View>
        </>
      )}
      <Field
        label={t('pro.form.bio')}
        placeholder={t('pro.form.bioHint')}
        value={value.bio}
        onChangeText={(bio) => set({ bio })}
        multiline
        maxLength={1000}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  profession: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderWidth: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  located: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
