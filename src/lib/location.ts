import * as Location from 'expo-location';

export type DevicePosition = { latitude: number; longitude: number };

/** The device's current coordinates, or null when permission is denied or GPS is
 * unavailable. There is deliberately no city fallback: a wrong location is worse than none. */
export async function getDevicePosition(): Promise<DevicePosition | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}
