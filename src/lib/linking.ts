import { router, type Href } from 'expo-router';
import { Linking } from 'react-native';

function digits(phone: string) {
  return phone.replace(/[^\d+]/g, '');
}

/** Opens the dialer. Callers must only offer this when a phone number is present. */
export function callNumber(phone: string) {
  return Linking.openURL(`tel:${digits(phone)}`).catch(() => false);
}

/** WhatsApp chat: https://wa.me/<number without +>. */
export function openWhatsApp(phone: string, text?: string) {
  const number = digits(phone).replace(/^\+/, '');
  const suffix = text ? `?text=${encodeURIComponent(text)}` : '';
  return Linking.openURL(`https://wa.me/${number}${suffix}`).catch(() => false);
}

export function openEmail(email: string) {
  return Linking.openURL(`mailto:${email}`).catch(() => false);
}

export function openDirections(latitude: number, longitude: number) {
  return Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
  ).catch(() => false);
}

/** Banner/notification deeplinks: an in-app route ("/book?service=<id>", "/service/<id>",
 * "/support", "/bookings") or an https:// URL, which opens externally. */
export function openDeeplink(link: string | null | undefined) {
  if (!link) return;
  if (/^https?:\/\//i.test(link)) {
    Linking.openURL(link).catch(() => {});
    return;
  }
  const path = link.startsWith('/') ? link : `/${link}`;
  router.push(path as Href);
}
