import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { Icon } from './icons';
import { colors, space } from '@/constants/theme';
import type { BookingListItem } from '@/lib/types';

export type PatientActiveAlert =
  | {
      type: 'nurse_accepted';
      booking: BookingListItem;
      proName: string;
    }
  | {
      type: 'nurse_cancelled';
      booking: BookingListItem;
      isReSearching?: boolean;
    };

interface PatientNotificationBannerProps {
  bookings?: BookingListItem[];
  onViewBooking: (bookingId: string) => void;
}

// Play pleasant high chime for acceptance or alert tone for cancellation
function playNotificationSound(type: 'nurse_accepted' | 'nurse_cancelled') {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        if (type === 'nurse_accepted') {
          // Uplifting pleasant chime: D5 (587 Hz) -> A5 (880 Hz)
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        } else {
          // Alert chime: F#4 (370 Hz) -> D4 (293 Hz)
          osc.frequency.setValueAtTime(370, ctx.currentTime);
          osc.frequency.setValueAtTime(293.66, ctx.currentTime + 0.14);
        }

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {
      // Audio playback fallback
    }
  }
}

// Send system-level notification (appears outside app in OS notification drawer / lock screen)
function sendSystemNotification(title: string, body: string) {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title, {
        body,
        icon: '/icon.png',
        tag: 'mendyr-patient-notification',
      });
    } catch {
      // notification fallback
    }
  }
}

export function PatientNotificationBanner({
  bookings,
  onViewBooking,
}: PatientNotificationBannerProps) {
  const [activeAlert, setActiveAlert] = useState<PatientActiveAlert | null>(null);
  const previousBookingsRef = useRef<Map<string, BookingListItem> | null>(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request browser notification permission on web if supported
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -160,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveAlert(null);
    });
  }, [translateY]);

  const showAlert = useCallback(
    (alert: PatientActiveAlert) => {
      setActiveAlert(alert);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }).start();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        dismiss();
      }, 10000);
    },
    [translateY, dismiss],
  );

  // Detect Nurse Acceptance and Cancellation
  useEffect(() => {
    if (bookings === undefined) return;

    if (previousBookingsRef.current === null) {
      // Prime cache on initial load without firing alert for existing historical bookings
      previousBookingsRef.current = new Map(bookings.map((b) => [b.id, b]));
      return;
    }

    const prevMap = previousBookingsRef.current;

    // 1. Detect Nurse Acceptance
    const newlyAccepted = bookings.filter((b) => {
      const before = prevMap.get(b.id);
      if (!before) return false;
      const wasWaiting =
        before.status === 'searching' || before.status === 'created' || !before.professional_name;
      const nowAssigned =
        b.status === 'assigned' ||
        b.status === 'confirmed' ||
        (b.professional_name !== null && !before.professional_name);
      const isNotCancelled = b.status !== 'cancelled' && b.status !== 'failed';
      return wasWaiting && nowAssigned && isNotCancelled;
    });

    // 2. Detect Nurse Cancellation
    const newlyCancelled = bookings.filter((b) => {
      const before = prevMap.get(b.id);
      if (!before) return false;
      const isNowCancelled = b.status === 'cancelled' && before.status !== 'cancelled';
      const wasAssignedNowSearching =
        (before.status === 'assigned' || before.status === 'confirmed' || before.professional_name) &&
        b.status === 'searching' &&
        !b.professional_name;
      return isNowCancelled || wasAssignedNowSearching;
    });

    // Update ref with latest map
    previousBookingsRef.current = new Map(bookings.map((b) => [b.id, b]));

    if (newlyAccepted.length > 0) {
      const latest = newlyAccepted[0];
      const proName = latest.professional_name || 'Verified Healthcare Professional';
      playNotificationSound('nurse_accepted');
      try {
        Vibration.vibrate([0, 180, 80, 180]);
      } catch {
        // optional vibration
      }
      sendSystemNotification(
        'Nurse Assigned! 🩺',
        `${proName} has accepted your booking for ${latest.service_name_snapshot}.`,
      );
      showAlert({ type: 'nurse_accepted', booking: latest, proName });
      return;
    }

    if (newlyCancelled.length > 0) {
      const latest = newlyCancelled[0];
      const isReSearching = latest.status === 'searching';
      playNotificationSound('nurse_cancelled');
      try {
        Vibration.vibrate([0, 250, 100, 250]);
      } catch {
        // optional vibration
      }
      sendSystemNotification(
        isReSearching ? 'Caregiver Update ⚠️' : 'Booking Cancelled ⚠️',
        isReSearching
          ? `Your caregiver had to cancel. We are matching another nurse for ${latest.service_name_snapshot}.`
          : `Your booking for ${latest.service_name_snapshot} was cancelled.`,
      );
      showAlert({ type: 'nurse_cancelled', booking: latest, isReSearching });
    }
  }, [bookings, showAlert]);

  if (!activeAlert) return null;

  const isCancelled = activeAlert.type === 'nurse_cancelled';

  return (
    <Animated.View style={[s.bannerContainer, { transform: [{ translateY }] }]}>
      <Pressable
        style={[s.bannerCard, isCancelled ? s.bannerCardCancelled : s.bannerCardAccepted]}
        onPress={() => {
          const alert = activeAlert;
          dismiss();
          onViewBooking(alert.booking.id);
        }}
      >
        <View style={[s.iconBox, isCancelled ? s.iconBoxCancelled : s.iconBoxAccepted]}>
          <Icon
            name={isCancelled ? 'x' : 'checkCircle'}
            size={18}
            color="#FFFFFF"
            strokeWidth={2.4}
          />
          <View style={[s.pulseDot, isCancelled ? s.pulseDotCancelled : s.pulseDotAccepted]} />
        </View>

        <View style={s.textWrapper}>
          {isCancelled ? (
            <>
              <View style={s.titleRow}>
                <Text style={s.titleCancelled}>
                  {activeAlert.isReSearching ? 'Caregiver Unavailable ⚠️' : 'Booking Cancelled ⚠️'}
                </Text>
                <Text style={s.cancelledTag}>
                  {activeAlert.isReSearching ? 'Re-matching' : 'Cancelled'}
                </Text>
              </View>
              <Text style={s.serviceText} numberOfLines={1}>
                {activeAlert.booking.service_name_snapshot}
              </Text>
              <Text style={s.subtitleCancelled}>
                {activeAlert.isReSearching
                  ? 'Caregiver had to cancel. Finding another nurse for you…'
                  : 'Your visit was cancelled by the caregiver'}
              </Text>
              <Text style={s.actionPromptCancelled}>Tap to view booking details →</Text>
            </>
          ) : (
            <>
              <View style={s.titleRow}>
                <Text style={s.titleAccepted}>Nurse Accepted Your Booking! 🩺</Text>
                <Text style={s.acceptedTag}>Confirmed</Text>
              </View>
              <Text style={s.serviceText} numberOfLines={1}>
                {activeAlert.booking.service_name_snapshot} · {activeAlert.proName}
              </Text>
              <Text style={s.subtitleAccepted}>
                {activeAlert.proName} is confirmed for this visit.
              </Text>
              <Text style={s.actionPromptAccepted}>Tap to view details & contact caregiver →</Text>
            </>
          )}
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          style={({ pressed }) => [s.closeBtn, pressed && s.closePressed]}
          hitSlop={10}
          accessibilityLabel="Dismiss notification"
        >
          <Icon name="x" size={16} color={colors.muted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    left: space.md,
    right: space.md,
    zIndex: 9999,
    alignItems: 'center',
  },
  bannerCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
      default: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  bannerCardAccepted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(22, 163, 74, 0.22)',
      },
      default: {
        shadowColor: '#16A34A',
      },
    }),
  },
  bannerCardCancelled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(220, 38, 38, 0.22)',
      },
      default: {
        shadowColor: '#DC2626',
      },
    }),
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBoxAccepted: {
    backgroundColor: '#16A34A',
  },
  iconBoxCancelled: {
    backgroundColor: '#DC2626',
  },
  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pulseDotAccepted: {
    backgroundColor: '#22C55E',
  },
  pulseDotCancelled: {
    backgroundColor: '#EF4444',
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  titleAccepted: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  titleCancelled: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
  },
  acceptedTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    textTransform: 'uppercase',
  },
  cancelledTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    textTransform: 'uppercase',
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  subtitleAccepted: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },
  subtitleCancelled: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
  },
  actionPromptAccepted: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginTop: 2,
  },
  actionPromptCancelled: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  closePressed: {
    opacity: 0.6,
  },
});
