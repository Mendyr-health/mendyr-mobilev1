import React, { useEffect, useRef, useState } from 'react';
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

export function ProNotificationBanner({
  requests,
  onViewRequest,
}: ProNotificationBannerProps) {
  const [activeRequest, setActiveRequest] = useState<BookingRequest | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request browser notification permission on web if available
  useEffect(() => {
    if (Platform.OS === 'web' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const dismiss = React.useCallback(() => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveRequest(null);
    });
  }, [translateY]);

  useEffect(() => {
    if (!requests || requests.length === 0) return;

    if (isFirstLoadRef.current) {
      // On first mount, populate seen requests so we don't spam on app launch
      requests.forEach((r) => seenIdsRef.current.add(r.id));
      isFirstLoadRef.current = false;
      return;
    }

    // Find any new requests that arrived
    const newRequests = requests.filter((r) => !seenIdsRef.current.has(r.id));

    if (newRequests.length > 0) {
      const latest = newRequests[0];
      // Mark as seen
      newRequests.forEach((r) => seenIdsRef.current.add(r.id));

      // Trigger vibration
      try {
        Vibration.vibrate([0, 150, 80, 150]);
      } catch {
        // vibration optional
      }

      // Trigger Web system notification if granted
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

      // Show in-app banner
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

      // Auto-dismiss after 9 seconds
      timeoutRef.current = setTimeout(() => {
        dismiss();
      }, 9000);
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
        boxShadow: '0 8px 24px rgba(18, 98, 226, 0.18)',
      },
      default: {
        shadowColor: colors.brand600,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
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
