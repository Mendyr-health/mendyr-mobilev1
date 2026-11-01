import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/icons';
import { Badge, Button, Card, ErrorState, Header, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { statusLabelKey, statusTone } from '@/features/booking/status';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api';
import { displayPhone, inr, when } from '@/lib/format';
import { error as hapticError, success } from '@/lib/haptics';
import { callNumber, openDirections } from '@/lib/linking';
import { useTheme } from '@/theme';
import { useCheckIn, useCheckOut, useEnRoute, useProBooking, useRelease } from '../api';
import { CompleteSheet } from './complete-sheet';
import { PinSheet } from './pin-sheet';
import { ReleaseSheet } from './release-sheet';

type SheetName = 'pin' | 'complete' | 'release' | null;

export function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const toast = useToast();
  const { colors: c } = useTheme();
  const visit = useProBooking(id);
  const enRoute = useEnRoute();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const release = useRelease();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const v = visit.data;

  const header = <Header title={v?.booking_code ?? t('visit.title')} />;
  if (!v) {
    return (
      <Screen header={header}>
        {visit.isError ? <ErrorState error={visit.error} onRetry={() => visit.refetch()} /> : <SkeletonList count={3} lines={3} />}
      </Screen>
    );
  }

  const fail = (e: Error) => {
    hapticError();
    toast.show(e.message, 'error');
  };
  const start = (pin?: string) =>
    checkIn.mutate(
      { id: v.id, pin },
      {
        onSuccess: () => {
          success();
          setSheet(null);
          setPinError(null);
          toast.show(t('visit.started'), 'success');
        },
        onError: (e) => {
          hapticError();
          if (e instanceof ApiError && e.code === 'visit_pin_invalid') setPinError(t('visit.pinInvalid'));
          else if (sheet === 'pin') setPinError(e.message);
          else toast.show(e.message, 'error');
        },
      },
    );

  const upcoming = v.status === 'assigned' || v.status === 'confirmed';
  const canStart = upcoming || v.status === 'en_route';
  const canCall = !v.contact_hidden && !!v.patient_phone;
  const canNavigate = !v.contact_hidden && v.latitude != null && v.longitude != null;
  const who = v.contact_hidden ? t('privacy.patientRef', { ref: v.patient_ref }) : v.patient_name;

  const footer = canStart ? (
    <View style={s.footer}>
      {upcoming ? (
        <Button
          title={t('visit.onMyWay')}
          icon="navigation"
          variant="secondary"
          loading={enRoute.isPending}
          onPress={() => enRoute.mutate(v.id, { onSuccess: () => toast.show(t('visit.enRouteDone'), 'success'), onError: fail })}
        />
      ) : null}
      <Button
        title={t('visit.start')}
        icon="heartPulse"
        loading={checkIn.isPending && sheet !== 'pin'}
        onPress={() => {
          if (!v.requires_visit_pin) return start();
          setPinError(null);
          setSheet('pin');
        }}
      />
      <Button title={t('visit.cantMakeIt')} variant="ghost" onPress={() => setSheet('release')} />
    </View>
  ) : v.status === 'in_progress' ? (
    <Button title={t('visit.complete')} variant="success" icon="checkCircle" size="lg" onPress={() => setSheet('complete')} />
  ) : undefined;

  return (
    <Screen header={header} footer={footer} onRefresh={() => visit.refetch()}>
      <Card style={s.hero}>
        <View style={s.row}>
          <Text variant="h3" style={s.flex}>
            {v.service_name}
          </Text>
          <Badge label={t(statusLabelKey(v.status))} tone={statusTone(v.status)} />
        </View>
        <Line icon="calendar" text={when(v.scheduled_start_at, { today: t('common.today'), tomorrow: t('common.tomorrow') })} />
        <Line icon="rupee" text={t('visit.earning', { amount: inr(v.earning_amount) })} color={c.success} />
      </Card>
      <Card style={s.block}>
        <Text variant="h3">{t('visit.patient')}</Text>
        <Line icon="user" text={who} />
        {canCall ? <Line icon="phone" text={displayPhone(v.patient_phone!)} /> : null}
        <Line icon="pin" text={v.address} />
        {v.landmark && !v.contact_hidden ? <Line icon="info" text={t('visit.landmark', { landmark: v.landmark })} /> : null}
        {v.instructions && !v.contact_hidden ? <Line icon="clipboard" text={v.instructions} /> : null}
        {v.patient_notes ? <Line icon="edit" text={v.patient_notes} /> : null}
        {canCall || canNavigate ? (
          <View style={s.actions}>
            {canCall ? <Button title={t('visit.call')} icon="phone" variant="outline" style={s.flex} onPress={() => callNumber(v.patient_phone!)} /> : null}
            {canNavigate ? (
              <Button title={t('visit.directions')} icon="navigation" variant="outline" style={s.flex} onPress={() => openDirections(v.latitude!, v.longitude!)} />
            ) : null}
          </View>
        ) : null}
        {v.contact_hidden ? (
          <View style={s.row}>
            <Icon name="lock" size={14} color={c.subtle} />
            <Text variant="caption" color="subtle" style={s.flex}>
              {t('privacy.note')}
            </Text>
          </View>
        ) : null}
      </Card>
      {v.requires_visit_pin && canStart ? (
        <Card flat style={[s.row, { backgroundColor: c.primarySoft, borderColor: c.primarySoft }]}>
          <Icon name="lock" size={18} color={c.primaryDark} />
          <Text variant="bodySm" color="primaryDark" style={s.flex}>
            {t('visit.pinHint')}
          </Text>
        </Card>
      ) : null}
      {v.status === 'cancelled' && v.cancellation_reason ? (
        <Card style={s.block}>
          <Text variant="h3">{t('visit.cancelledTitle')}</Text>
          <Text variant="bodySm" color="muted">
            {v.cancellation_reason}
          </Text>
        </Card>
      ) : null}
      {v.visit_summary_notes || v.vitals_recorded ? (
        <Card style={s.block}>
          <Text variant="h3">{t('booking.summary')}</Text>
          {v.vitals_recorded ? <Line icon="heartPulse" text={v.vitals_recorded} /> : null}
          {v.visit_summary_notes ? <Line icon="clipboard" text={v.visit_summary_notes} /> : null}
        </Card>
      ) : null}

      <PinSheet visible={sheet === 'pin'} onClose={() => setSheet(null)} busy={checkIn.isPending} error={pinError} onSubmit={(pin) => start(pin)} />
      <CompleteSheet
        visible={sheet === 'complete'}
        onClose={() => setSheet(null)}
        busy={checkOut.isPending}
        onSubmit={({ notes, vitals }) =>
          checkOut.mutate(
            { id: v.id, notes, vitals },
            {
              onSuccess: (done) => {
                success();
                setSheet(null);
                toast.show(t('visit.completed', { amount: inr(done.earning_amount) }), 'success');
              },
              onError: fail,
            },
          )
        }
      />
      <ReleaseSheet
        visible={sheet === 'release'}
        onClose={() => setSheet(null)}
        busy={release.isPending}
        onConfirm={() =>
          release.mutate(v.id, {
            onSuccess: () => {
              setSheet(null);
              toast.show(t('visit.released'), 'success');
              router.back();
            },
            onError: fail,
          })
        }
      />
    </Screen>
  );
}

function Line({ icon, text, color }: { icon: IconName; text: string; color?: string }) {
  const { colors: c } = useTheme();
  return (
    <View style={s.row}>
      <Icon name={icon} size={16} color={color ?? c.subtle} />
      <Text variant="bodySm" color={color ?? 'inkSoft'} style={s.flex}>
        {text}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: 10 },
  block: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  footer: { gap: 8 },
});
