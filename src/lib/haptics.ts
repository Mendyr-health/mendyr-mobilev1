import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

/** Light tick for taps, tab switches and toggles. Never throws. */
export function tick() {
  if (enabled) Haptics.selectionAsync().catch(() => {});
}

export function impact() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function success() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warning() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function error() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
