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
import { colors, radii, space } from '@/constants/theme';
import { inr } from '@/lib/format';
import type { BookingRequest, ProBooking } from '@/lib/types';

export type ActiveAlert =
  | {
      type: 'new_request';
      request: BookingRequest;
    }
  | {
      type: 'cancelled_booking';
      booking: ProBooking;
    };

interface ProNotificationBannerProps {
  requests?: BookingRequest[];
  bookings?: ProBooking[];
  onViewRequest: (request: BookingRequest) => void;
  onViewBooking: (booking: ProBooking) => void;
}

// Request outside-the-app notification permission on Web/PWA
export async function requestNotificationPermission(): Promise<boolean> {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'Notification' in window
  ) {
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

// Play pleasant high chime for new request or alert tone for cancellation
function playNotificationSound(type: 'new_request' | 'cancelled_booking') {
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
        if (type === 'new_request') {
          // Play D5 (587 Hz) then A5 (880 Hz) - uplifting
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        } else {
          // Play F#4 (370 Hz) then D4 (293 Hz) - alert
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
        tag: 'mendyr-pro-notification',
      });
    } catch {
      // notification fallback
    }
  }
}

export function ProNotificationBanner({
  requests,
  bookings,
  onViewRequest,
  onViewBooking,
}: ProNotificationBannerProps) {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const previousRequestsRef = useRef<BookingRequest[] | null>(null);
  const previousBookingsRef = useRef<Map<string, ProBooking> | null>(null);
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
    (alert: ActiveAlert) => {
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

  // 1. Detect New Open Requests
  useEffect(() => {
    if (requests === undefined) return;

    if (previousRequestsRef.current === null) {
      previousRequestsRef.current = requests;
      return;
    }

    const previousMap = new Map(previousRequestsRef.current.map((r) => [r.id, r]));
    const brandNew = requests.filter((r) => !previousMap.has(r.id));
    previousRequestsRef.current = requests;

    if (brandNew.length > 0) {
      const latest = brandNew[0];
      playNotificationSound('new_request');
      try {
        Vibration.vibrate([0, 180, 80, 180]);
      } catch {
        // optional vibration
      }
      sendSystemNotification(
        'New Mendyr Visit Request! 🩺',
        `${latest.service_name} in ${latest.area} — Earn ${inr(latest.earning_amount)}`,
      );
      showAlert({ type: 'new_request', request: latest });
    }
  }, [requests, showAlert]);

  // 2. Detect Cancelled Bookings
  useEffect(() => {
    if (bookings === undefined) return;

    if (previousBookingsRef.current === null) {
      previousBookingsRef.current = new Map(bookings.map((b) => [b.id, b]));
      return;
    }

    const prevMap = previousBookingsRef.current;
    const newlyCancelled = bookings.filter((b) => {
      const before = prevMap.get(b.id);
      return (
        b.status === 'cancelled' &&
        before !== undefined &&
        before.status !== 'cancelled'
      );
    });
    previousBookingsRef.current = new Map(bookings.map((b) => [b.id, b]));

    if (newlyCancelled.length > 0) {
      const latest = newlyCancelled[0];
      playNotificationSound('cancelled_booking');
      try {
        Vibration.vibrate([0, 250, 100, 250]);
      } catch {
        // optional vibration
      }
      sendSystemNotification(
        'Booking Cancelled ⚠️',
        `${latest.service_name} for ${latest.patient_name} was cancelled by the patient.`,
      );
      showAlert({ type: 'cancelled_booking', booking: latest });
    }
  }, [bookings, showAlert]);

  if (!activeAlert) return null;

  const isCancelled = activeAlert.type === 'cancelled_booking';

  return (
    <Animated.View style={[s.bannerContainer, { transform: [{ translateY }] }]}>
      <Pressable
        style={[s.bannerCard, isCancelled && s.bannerCardCancelled]}
        onPress={() => {
          const alert = activeAlert;
          dismiss();
          if (alert.type === 'new_request') {
            onViewRequest(alert.request);
          } else {
            onViewBooking(alert.booking);
          }
        }}
      >
        <View style={[s.bellIconBox, isCancelled && s.cancelledIconBox]}>
          <Icon
            name={isCancelled ? 'x' : 'sparkles'}
            size={18}
            color="#FFFFFF"
            strokeWidth={2.4}
          />
          <View style={[s.pulseDot, isCancelled && s.pulseDotCancelled]} />
        </View>

        <View style={s.textWrapper}>
          {isCancelled ? (
            <>
              <View style={s.titleRow}>
                <Text style={s.titleCancelled}>Booking Cancelled ⚠️</Text>
                <Text style={s.cancelledTag}>Cancelled</Text>
              </View>
              <Text style={s.serviceText} numberOfLines={1}>
                {activeAlert.booking.service_name} · {activeAlert.booking.patient_name}
              </Text>
              <Text style={s.cancelledSubtitle}>The patient cancelled this visit</Text>
              <Text style={s.actionPromptCancelled}>Tap to view visits →</Text>
            </>
          ) : (
            <>
              <View style={s.titleRow}>
                <Text style={s.title}>New visit request nearby!</Text>
                <Text style={s.earningTag}>{inr(activeAlert.request.earning_amount)}</Text>
              </View>
              <Text style={s.serviceText} numberOfLines={1}>
                {activeAlert.request.service_name} · {activeAlert.request.area} (
                {activeAlert.request.distance_km.toFixed(1)} km)
              </Text>
              <Text style={s.actionPrompt}>Tap to view & accept →</Text>
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
    borderColor: colors.brand300,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(18, 98, 226, 0.22)',
      },
      default: {
        shadowColor: colors.brand600,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 8,
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
  bellIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cancelledIconBox: {
    backgroundColor: '#DC2626',
  },
  pulseDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  pulseDotCancelled: {
    backgroundColor: '#991B1B',
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  titleCancelled: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  earningTag: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.success,
  },
  cancelledTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serviceText: {
    fontSize: 12,
    color: colors.inkSecondary,
    fontWeight: '600',
  },
  cancelledSubtitle: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '500',
  },
  actionPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand600,
    marginTop: 2,
  },
  actionPromptCancelled: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  closePressed: {
    opacity: 0.6,
  },
});
