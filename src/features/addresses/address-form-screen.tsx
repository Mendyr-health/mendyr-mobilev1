import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Button, Card, Chip, Field, Header, Screen, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { displayPhone, isValidIndianMobile, toE164India } from '@/lib/format';
import { error as hapticError, success } from '@/lib/haptics';
import { getDevicePosition, type DevicePosition } from '@/lib/location';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/theme';
import { geocodePincode, reverseGeocode, useAddresses, useSaveAddress, type AddressInput } from './api';

const LABELS = ['Home', 'Parents', 'Work', 'Other'];
type Errors = Partial<Record<'line1' | 'pincode' | 'city' | 'state' | 'phone', string>>;

/** Add/edit an address. Coordinates always come from the address itself (M3): either the
 * device position the user chose to use, or the geocoded pincode/city — never a silent
 * GPS read or a hard-coded city. */
export function AddressFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string; from?: string }>();
  const t = useT();
  const toast = useToast();
  const { colors: c, radius } = useTheme();
  const { user } = useAuth();
  const addresses = useAddresses();
  const save = useSaveAddress();
  const existing = addresses.data?.find((a) => a.id === id);

  const [label, setLabel] = useState(existing?.label ?? 'Home');
  const [contactName, setContactName] = useState(existing?.contact_name ?? user?.full_name ?? '');
  const [contactPhone, setContactPhone] = useState(
    existing?.contact_phone ? displayPhone(existing.contact_phone).replace('+91 ', '') : user?.phone_number?.replace(/^\+91/, '') ?? '',
  );
  const [line1, setLine1] = useState(existing?.line1 ?? '');
  const [line2, setLine2] = useState(existing?.line2 ?? '');
  const [landmark, setLandmark] = useState(existing?.landmark ?? '');
  const [pincode, setPincode] = useState(existing?.pincode ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [state, setState] = useState(existing?.state ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions_for_professional ?? '');
  const [isDefault, setIsDefault] = useState(existing?.is_default ?? (addresses.data?.length ?? 0) === 0);
  // Device position chosen via "Use my current location", with the pincode it resolved to.
  const [gps, setGps] = useState<{ position: DevicePosition; pincode: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const position = await getDevicePosition();
      if (!position) {
        toast.show(t('location.denied'), 'error');
        return;
      }
      const place = await reverseGeocode(position.latitude, position.longitude);
      if (place.area && !line1) setLine1(place.area);
      if (place.city) setCity(place.city);
      if (place.state) setState(place.state);
      if (place.pincode) setPincode(place.pincode);
      setGps({ position, pincode: place.pincode ?? '' });
      success();
      toast.show(t('location.filled'), 'success');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : t('error.generic'), 'error');
    } finally {
      setLocating(false);
    }
  }

  function validate(): boolean {
    const next: Errors = {};
    if (!line1.trim()) next.line1 = t('address.line1Error');
    if (!/^[1-9]\d{5}$/.test(pincode.trim())) next.pincode = t('address.pincodeError');
    if (!city.trim()) next.city = t('address.required');
    if (!state.trim()) next.state = t('address.required');
    if (contactPhone.trim() && !isValidIndianMobile(contactPhone)) next.phone = t('auth.phoneError');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function resolveLocation(): Promise<AddressInput['location']> {
    // The GPS fix is only trusted while the pincode still matches where it was taken.
    if (gps && (!gps.pincode || gps.pincode === pincode.trim())) return gps.position;
    const unchanged =
      existing && existing.pincode === pincode.trim() && existing.city.toLowerCase() === city.trim().toLowerCase();
    if (unchanged) return undefined; // keep the stored coordinates
    const geo = await geocodePincode(pincode.trim(), city.trim(), state.trim());
    return { latitude: geo.latitude, longitude: geo.longitude };
  }

  async function submit() {
    if (!validate()) {
      hapticError();
      return;
    }
    setBusy(true);
    try {
      const location = await resolveLocation();
      if (!existing && !location) throw new Error(t('address.locateFailed'));
      await save.mutateAsync({
        id: existing?.id,
        body: {
          label: label.trim() || 'Home',
          line1: line1.trim(),
          line2: line2.trim() || null,
          landmark: landmark.trim() || null,
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          ...(location ? { location } : {}),
          is_default: isDefault,
          contact_name: contactName.trim() || null,
          contact_phone: contactPhone.trim() ? toE164India(contactPhone) : null,
          instructions_for_professional: instructions.trim() || null,
        },
      });
      success();
      toast.show(t('address.saved'), 'success');
      router.back();
    } catch (e) {
      hapticError();
      toast.show(e instanceof Error ? e.message : t('error.generic'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      header={<Header title={existing ? t('address.editTitle') : t('address.addTitle')} />}
      footer={<Button title={t('address.save')} size="lg" loading={busy} onPress={submit} />}
    >
      <Button title={t('location.useCurrent')} icon="locate" variant="secondary" loading={locating} onPress={useCurrentLocation} />
      {gps ? (
        <View style={[s.gps, { backgroundColor: c.successSoft, borderRadius: radius.input }]}>
          <Icon name="checkCircle" size={16} color={c.success} />
          <Text variant="caption" color="success" style={s.flex}>
            {t('location.pinned')}
          </Text>
        </View>
      ) : null}
      <View style={s.chips}>
        {LABELS.map((l) => (
          <Chip key={l} label={l} selected={label === l} onPress={() => setLabel(l)} />
        ))}
      </View>
      <Card style={s.group}>
        <Text variant="title">{t('address.contactTitle')}</Text>
        <Text variant="caption" color="muted">
          {t('address.contactHint')}
        </Text>
        <Field label={t('address.contactName')} value={contactName} onChangeText={setContactName} />
        <Field
          label={t('address.contactPhone')}
          prefix="+91"
          keyboardType="phone-pad"
          maxLength={11}
          value={contactPhone}
          onChangeText={(v) => setContactPhone(v.replace(/[^\d ]/g, ''))}
          error={errors.phone}
        />
      </Card>
      <Card style={s.group}>
        <Field label={t('address.line1')} placeholder={t('address.line1Hint')} value={line1} onChangeText={setLine1} error={errors.line1} />
        <Field label={t('address.line2')} value={line2} onChangeText={setLine2} />
        <Field label={t('address.landmark')} value={landmark} onChangeText={setLandmark} />
        <View style={s.row}>
          <View style={s.flex}>
            <Field
              label={t('address.pincode')}
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={(v) => setPincode(v.replace(/\D/g, ''))}
              error={errors.pincode}
            />
          </View>
          <View style={s.flex}>
            <Field label={t('address.city')} value={city} onChangeText={setCity} error={errors.city} />
          </View>
        </View>
        <Field label={t('address.state')} value={state} onChangeText={setState} error={errors.state} />
        <Field label={t('address.instructions')} placeholder={t('address.instructionsHint')} value={instructions} onChangeText={setInstructions} multiline />
      </Card>
      <Card style={s.defaultRow}>
        <Text variant="title" style={s.flex}>
          {t('address.makeDefault')}
        </Text>
        <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: c.primary, false: c.border }} thumbColor={c.white} accessibilityLabel={t('address.makeDefault')} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  gps: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  defaultRow: { flexDirection: 'row', alignItems: 'center' },
});
