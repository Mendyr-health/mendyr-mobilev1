import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/icons';
import { Badge, Button, Card, ErrorState, Header, Screen, Skeleton, SkeletonList, Text, useToast, useTone } from '@/components/ui';
import { useFeature } from '@/config/provider';
import { useT } from '@/i18n';
import { firstName, inr, when } from '@/lib/format';
import { success } from '@/lib/haptics';
import type { Booking } from '@/lib/types';
import { useTheme } from '@/theme';
import { useBooking, useCancelBooking, useSubmitReview } from '../api';
import { PriceBreakdown } from '../price-breakdown';
import { isActive, statusHeadlineKey, statusIcon, statusLabelKey, statusTone } from '../status';
import { CancelSheet } from './cancel-sheet';
import { BookingDocumentsCard } from './documents-card';
import { PinCard } from './pin-card';
import { ProfessionalCard } from './professional-card';
import { RatingSheet } from './rating-sheet';
import { Timeline } from './timeline';

const CANCELLABLE = ['created', 'searching', 'assigned', 'confirmed', 'en_route'];

function Hero({ booking }: { booking: Booking }) {
  const t = useT();
  const tone = useTone(statusTone(booking.status));
  const name = firstName(booking.professional?.full_name) || t('booking.yourProfessional');
  return (
    <Card style={s.hero}>
      <View style={[s.heroIcon, { backgroundColor: tone.bg }]}>
        <Icon name={statusIcon(booking.status)} size={26} color={tone.fg} />
      </View>
      <View style={s.flex}>
        <Text variant="h3">{t(statusHeadlineKey(booking.status), { name: booking.contact_hidden ? t('booking.yourProfessional') : name })}</Text>
        <Text variant="bodySm" color="muted">
          {booking.service_name_snapshot} · {when(booking.scheduled_start_at, { today: t('common.today'), tomorrow: t('common.tomorrow') })}
        </Text>
      </View>
    </Card>
  );
}

export function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const booking = useBooking(id);
  const cancel = useCancelBooking(id);
  const review = useSubmitReview(id);
  const liveStatus = useFeature('live_status');
  const reviews = useFeature('reviews');
  const documentsOn = useFeature('prescription_upload');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const b = booking.data;

  const header = <Header title={b ? b.booking_code : t('booking.title')} />;
  if (booking.isPending) {
    return (
      <Screen header={header}>
        <Skeleton height={88} radius={16} />
        <SkeletonList count={2} lines={3} />
      </Screen>
    );
  }
  if (booking.isError || !b) {
    return (
      <Screen header={header}>
        <ErrorState error={booking.error} onRetry={() => booking.refetch()} />
      </Screen>
    );
  }

  const canCancel = CANCELLABLE.includes(b.status);
  const canRate = reviews && b.status === 'completed' && !b.review_rating && !!b.professional;
  const terminal = !isActive(b.status);

  const footer =
    canCancel || canRate || terminal ? (
      <View style={s.footer}>
        {canRate ? <Button title={t('booking.rate')} icon="star" onPress={() => setRateOpen(true)} /> : null}
        {terminal ? (
          <Button title={t('booking.bookAgain')} variant={canRate ? 'outline' : 'primary'} onPress={() => router.push(`/book?service=${b.service_id}`)} />
        ) : null}
        {canCancel ? <Button title={t('booking.cancel')} variant="danger" onPress={() => setCancelOpen(true)} /> : null}
      </View>
    ) : undefined;

  return (
    <Screen header={header} footer={footer} onRefresh={() => booking.refetch()}>
      <Hero booking={b} />
      {b.status === 'failed' ? (
        <Card flat style={[s.notice, { backgroundColor: c.warningSoft, borderColor: c.warningSoft }]}>
          <Text variant="bodySm" color={c.warningInk}>
            {t('booking.failedBody')}
          </Text>
        </Card>
      ) : null}
      {b.visit_pin ? <PinCard pin={b.visit_pin} /> : null}
      {b.professional ? <ProfessionalCard pro={b.professional} contactHidden={b.contact_hidden} /> : null}
      {b.contact_hidden ? (
        <View style={s.privacy}>
          <Icon name="lock" size={14} color={c.subtle} />
          <Text variant="caption" color="subtle" style={s.flex}>
            {t('privacy.note')}
          </Text>
        </View>
      ) : null}
      {liveStatus ? (
        <Card>
          <Timeline booking={b} />
        </Card>
      ) : (
        <Badge label={t(statusLabelKey(b.status))} tone={statusTone(b.status)} />
      )}
      <Card style={s.details}>
        <Text variant="h3">{t('booking.details')}</Text>
        <Detail icon="clipboard" label={t('booking.code')} value={b.booking_code} />
        <Detail icon="calendar" label={t('booking.when')} value={when(b.scheduled_start_at, { today: t('common.today'), tomorrow: t('common.tomorrow') })} />
        {!b.contact_hidden ? <Detail icon="pin" label={t('booking.address')} value={b.address_snapshot} /> : null}
        {b.preferred_gender === 'female' ? <Detail icon="female" label={t('booking.preference')} value={t('booking.femalePreferred')} /> : null}
        {b.patient_notes ? <Detail icon="edit" label={t('booking.notes')} value={b.patient_notes} /> : null}
        {b.cancellation_reason && b.status === 'cancelled' ? (
          <Detail icon="ban" label={t('booking.cancelReason')} value={b.cancellation_reason} />
        ) : null}
      </Card>
      {documentsOn ? (
        <BookingDocumentsCard booking={b} updatedAt={booking.dataUpdatedAt} refetch={async () => (await booking.refetch()).data} />
      ) : null}
      {b.visit_summary_notes || b.vitals_recorded ? (
        <Card style={s.details}>
          <Text variant="h3">{t('booking.summary')}</Text>
          {b.vitals_recorded ? <Detail icon="heartPulse" label={t('booking.vitals')} value={b.vitals_recorded} /> : null}
          {b.visit_summary_notes ? <Detail icon="clipboard" label={t('booking.notesFromPro')} value={b.visit_summary_notes} /> : null}
        </Card>
      ) : null}
      <Card>
        <PriceBreakdown base={b.base_price} discount={b.discount_amount} tax={b.tax_amount} total={b.total_amount} />
        {b.cancellation_fee_amount > 0 ? (
          <Text variant="caption" color="danger" style={s.fee}>
            {t('booking.cancellationFee', { fee: inr(b.cancellation_fee_amount) })}
          </Text>
        ) : null}
      </Card>
      <CancelSheet
        booking={b}
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        busy={cancel.isPending}
        onConfirm={(reason) =>
          cancel.mutate(reason, {
            onSuccess: () => {
              setCancelOpen(false);
              toast.show(t('cancel.done'), 'success');
            },
            onError: (e) => toast.show(e.message, 'error'),
          })
        }
      />
      {b.professional ? (
        <RatingSheet
          visible={rateOpen}
          name={firstName(b.professional.full_name)}
          busy={review.isPending}
          onClose={() => setRateOpen(false)}
          onSubmit={(input) =>
            review.mutate(input, {
              onSuccess: () => {
                success();
                setRateOpen(false);
                toast.show(t('rating.thanks'), 'success');
              },
              onError: (e) => toast.show(e.message, 'error'),
            })
          }
        />
      ) : null}
    </Screen>
  );
}

function Detail({ icon, label, value }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={s.detail}>
      <Icon name={icon} size={16} color={c.subtle} />
      <View style={s.flex}>
        <Text variant="caption" color="subtle">
          {label}
        </Text>
        <Text variant="bodySm">{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  notice: { padding: 12 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  details: { gap: 12 },
  detail: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  fee: { marginTop: 8 },
  footer: { gap: 8 },
});
