import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// Default fallback location (Bengaluru center) if GPS is denied or unavailable
export const DEFAULT_LOCATION: LocationData = {
  latitude: 12.9716,
  longitude: 77.5946,
  area: 'Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
};

export async function getCurrentDeviceLocation(): Promise<LocationData> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return DEFAULT_LOCATION;
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    let area = 'Current location';
    let city = 'Bengaluru';
    let state = 'Karnataka';
    let pincode = '560001';

    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (places && places.length > 0) {
        const p = places[0];
        city = p.city ?? p.subregion ?? city;
        area = p.district ?? p.street ?? p.name ?? city;
        state = p.region ?? state;
        pincode = p.postalCode ?? pincode;
      }
    } catch {
      // Reverse geocoding optional fallback
    }

    return {
      latitude: lat,
      longitude: lng,
      area,
      city,
      state,
      pincode,
    };
  } catch {
    return DEFAULT_LOCATION;
  }
}

