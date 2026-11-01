import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { Button, Header, Screen, Text, useToast } from '@/components/ui';
import { useFeature } from '@/config/provider';
import { defaultAddress, useAddresses } from '@/features/addresses/api';
import { useServices } from '@/features/catalog/api';
import { useT, type CopyKey } from '@/i18n';
import { istIso, slotLabel } from '@/lib/format';
import { error as hapticError, success } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { useCreateBooking } from '../api';
import { AddressStep } from './address-step';
import { DetailsStep } from './details-step';
import { ReviewStep } from './review-step';
import { ServiceStep } from './service-step';
import { WhenStep } from './when-step';

type Step = 'service' | 'when' | 'address' | 'details' | 'review';
const TITLES: Record<Step, CopyKey> = {
  service: 'book.step.service',
  when: 'book.step.when',
  address: 'book.step.address',
  details: 'book.step.details',
  review: 'book.step.review',
};

/** Stepped booking: (service) → date & time → address → preferences → review & confirm. */
export function BookFlowScreen() {
  const params = useLocalSearchParams<{ service?: string }>();
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const services = useServices();
  const addresses = useAddresses();
  const genderPreference = useFeature('gender_preference');
  const create = useCreateBooking();

  const steps: Step[] = [...(params.service ? [] : (['service'] as Step[])), 'when', 'address', 'details', 'review'];
  const [index, setIndex] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(params.service ?? null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [female, setFemale] = useState(false);
  const [notes, setNotes] = useState('');

  const step = steps[index];
  const service = services.data?.find((s) => s.id === serviceId);
  // Keep the chosen address valid as the list changes (e.g. after adding one).
  const address = addresses.data?.find((a) => a.id === addressId) ?? defaultAddress(addresses.data);

  const back = useCallback(() => {
    if (index > 0) setIndex(index - 1);
    else router.back();
    return true;
  }, [index]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', back);
      return () => sub.remove();
    }, [back]),
  );

  const canContinue =
    step === 'service' ? !!serviceId : step === 'when' ? !!dateKey && !!time : step === 'address' ? !!address : true;

  function submit() {
    if (!service || !address || !dateKey || !time) return;
    create.mutate(
      {
        service_id: service.id,
        address_id: address.id,
        scheduled_start_at: istIso(dateKey, time),
        patient_notes: notes.trim() || null,
        ...(genderPreference ? { preferred_gender: female ? 'female' : null } : {}),
      },
      {
        onSuccess: (booking) => {
          success();
          toast.show(t('book.done'), 'success');
          router.replace(`/booking/${booking.id}`);
        },
        onError: (e) => {
          hapticError();
          toast.show(e.message, 'error');
        },
      },
    );
  }

  const footer = (
    <View style={s.footer}>
      {step === 'when' && dateKey && time ? (
        <Text variant="caption" color="muted" align="center">
          {t('book.selectedSlot', { time: slotLabel(time) })}
        </Text>
      ) : null}
      {step === 'review' ? (
        <Button title={t('book.confirm')} size="lg" loading={create.isPending} disabled={!service || !address} onPress={submit} />
      ) : (
        <Button title={t('common.continue')} size="lg" disabled={!canContinue} onPress={() => setIndex(index + 1)} icon="arrowRight" iconRight />
      )}
    </View>
  );

  return (
    <Screen
      header={
        <View>
          <Header title={service ? service.name : t('book.title')} onBack={back} />
          <View style={s.progress}>
            {steps.map((st, i) => (
              <View key={st} style={[s.bar, { backgroundColor: i <= index ? c.primary : c.border }]} />
            ))}
          </View>
        </View>
      }
      footer={footer}
    >
      <View style={s.head}>
        <Text variant="overline" color="subtle">
          {t('book.stepOf', { n: index + 1, total: steps.length })}
        </Text>
        <Text variant="h2">{t(TITLES[step])}</Text>
      </View>
      {step === 'service' ? <ServiceStep selected={serviceId} onSelect={setServiceId} /> : null}
      {step === 'when' ? (
        <WhenStep
          dateKey={dateKey}
          time={time}
          onDate={(key) => {
            if (key !== dateKey) setTime(null);
            setDateKey(key);
          }}
          onTime={setTime}
        />
      ) : null}
      {step === 'address' ? <AddressStep selected={address?.id ?? null} onSelect={setAddressId} /> : null}
      {step === 'details' ? <DetailsStep female={female} onFemale={setFemale} notes={notes} onNotes={setNotes} /> : null}
      {step === 'review' && service && address && dateKey && time ? (
        <ReviewStep service={service} address={address} dateKey={dateKey} time={time} female={female} notes={notes} />
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingBottom: 8 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  head: { gap: 4 },
  footer: { gap: 8 },
});
