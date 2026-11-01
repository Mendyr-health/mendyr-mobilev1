import { api } from '@/lib/api';
import { query } from '@/lib/format';
import type { DevicePosition } from '@/lib/location';
import type { GeoLocation, ProfessionalProfile, ProfessionalType, Service } from '@/lib/types';
import { PROFESSIONS } from '@/constants/professions';

export type ProDetails = {
  professionalType: ProfessionalType;
  registrationNo: string;
  years: string;
  radiusKm: number;
  bio: string;
  /** Either a device position, or a pincode (+ city) to geocode. */
  position: DevicePosition | null;
  pincode: string;
  city: string;
};

export function emptyProDetails(radiusKm: number): ProDetails {
  return { professionalType: 'nurse', registrationNo: '', years: '', radiusKm, bio: '', position: null, pincode: '', city: '' };
}

/** Returns an error message key-free string, or null when the form is complete. */
export function validateProDetails(d: ProDetails): string | null {
  if (!d.registrationNo.trim()) return 'registration';
  const years = Number(d.years || '0');
  if (Number.isNaN(years) || years < 0 || years > 60) return 'years';
  if (!d.position && !/^[1-9]\d{5}$/.test(d.pincode.trim())) return 'location';
  return null;
}

/** Create the professional profile for the signed-in user: geocode the base location,
 * opt into every service of the profession and set default weekly hours. Requires a session
 * (the geo endpoints are authenticated), so it runs after /auth/register. */
export async function onboardProfessional(d: ProDetails): Promise<ProfessionalProfile> {
  let location = d.position;
  if (!location) {
    const geo = await api<GeoLocation>(`/geo/locate${query({ pincode: d.pincode.trim(), city: d.city.trim() || null })}`);
    location = { latitude: geo.latitude, longitude: geo.longitude };
  }
  const council = PROFESSIONS.find((p) => p.type === d.professionalType)?.requiresCouncil ?? false;
  let serviceIds: string[] = [];
  try {
    const services = await api<Service[]>('/services');
    serviceIds = services.filter((s) => s.required_professional_type === d.professionalType).map((s) => s.id);
  } catch {
    /* empty list = every service the profession can do */
  }
  const profile = await api<ProfessionalProfile>('/professionals/onboard', {
    method: 'POST',
    body: {
      professional_type: d.professionalType,
      years_of_experience: Number(d.years || '0'),
      council_registration_number: council ? d.registrationNo.trim() : null,
      license_number: council ? null : d.registrationNo.trim(),
      languages_spoken: ['English', 'Hindi'],
      bio: d.bio.trim() || null,
      location,
      service_radius_km: d.radiusKm,
      service_ids: serviceIds,
    },
  });
  try {
    await api('/professionals/me/availability/slots', {
      method: 'PUT',
      body: [0, 1, 2, 3, 4, 5, 6].map((day_of_week) => ({ day_of_week, start_time: '09:00:00', end_time: '18:00:00' })),
    });
  } catch {
    /* hours can be set later from Profile → Availability */
  }
  return profile;
}
