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
import type { BookingRequest } from '@/lib/types';

interface ProNotificationBannerProps {
  requests?: BookingRequest[];
  onViewRequest: (request: BookingRequest) => void;
}

// Play a pleasant two-tone chime via Web Audio API on web
function playNotificationSound() {
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
        // Play D5 (587 Hz) then E5 (659 Hz)
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

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

export function ProNotificationBanner({
  requests,
  onViewRequest,
}: ProNotificationBannerProps) {
  const [activeRequest, setActiveRequest] = useState<BookingRequest | null>(null);
  const previousRequestsRef = useRef<BookingRequest[] | null>(null);
  const translateY = useRef(new Animated.Value(-140)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request browser notification permission on web if supported
  useEffect(() => {
    if (Platform.OS === 'web' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveRequest(null);
    });
  }, [translateY]);

  useEffect(() => {
    // If requests query hasn't finished its first fetch, wait
    if (requests === undefined) return;

    // Establish the initial baseline (even if requests is [] on load)
    if (previousRequestsRef.current === null) {
      previousRequestsRef.current = requests;
      return;
    }

    // Detect requests that arrived since the previous fetch
    const previousMap = new Map(
      previousRequestsRef.current.map((r) => [r.id, r]),
    );
    const brandNew = requests.filter((r) => !previousMap.has(r.id));

    // Update the reference baseline
    previousRequestsRef.current = requests;

    if (brandNew.length > 0) {
      const latest = brandNew[0];

      // 1. Play sound
      playNotificationSound();

      // 2. Trigger vibration on native devices
      try {
        Vibration.vibrate([0, 180, 80, 180]);
      } catch {
        // vibration optional
      }

      // 3. Trigger Web system notification if granted
      if (
        Platform.OS === 'web' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification('New Mendyr Visit Request!', {
            body: `${latest.service_name} in ${latest.area} — Earn ${inr(latest.earning_amount)}`,
            icon: '/icon.png',
          });
        } catch {
          // notification fallback
        }
      }

      // 4. Show in-app floating banner
      setActiveRequest(latest);

      // Slide in animation
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }).start();

      // Clear existing auto-dismiss timer
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Auto-dismiss after 10 seconds
      timeoutRef.current = setTimeout(() => {
        dismiss();
      }, 10000);
    }
  }, [requests, dismiss, translateY]);

  if (!activeRequest) return null;

  return (
    <Animated.View style={[s.bannerContainer, { transform: [{ translateY }] }]}>
      <Pressable
        style={s.bannerCard}
        onPress={() => {
          const req = activeRequest;
          dismiss();
          onViewRequest(req);
        }}
      >
        <View style={s.bellIconBox}>
          <Icon name="sparkles" size={18} color="#FFFFFF" />
          <View style={s.pulseDot} />
        </View>

        <View style={s.textWrapper}>
          <View style={s.titleRow}>
            <Text style={s.title}>New visit request nearby!</Text>
            <Text style={s.earningTag}>{inr(activeRequest.earning_amount)}</Text>
          </View>
          <Text style={s.serviceText} numberOfLines={1}>
            {activeRequest.service_name} · {activeRequest.area} ({activeRequest.distance_km.toFixed(1)} km)
          </Text>
          <Text style={s.actionPrompt}>Tap to view & accept →</Text>
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          style={({ pressed }) => [s.closeBtn, pressed && s.closePressed]}
          hitSlop={10}
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
  bellIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand600,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  earningTag: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.success,
  },
  serviceText: {
    fontSize: 12,
    color: colors.inkSecondary,
    fontWeight: '500',
  },
  actionPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand600,
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
