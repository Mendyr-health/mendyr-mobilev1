import type { Tone } from '@/components/ui';
import type { IconName } from '@/components/icons';
import type { CopyKey } from '@/i18n';
import type { BookingStatus } from '@/lib/types';

export const ACTIVE: BookingStatus[] = ['created', 'searching', 'assigned', 'confirmed', 'en_route', 'in_progress'];

export const isActive = (s: BookingStatus) => ACTIVE.includes(s);
export const isUpcoming = isActive;

/** Status colours from the design contract. */
export function statusTone(s: BookingStatus): Tone {
  switch (s) {
    case 'created':
    case 'searching':
      return 'warning';
    case 'assigned':
    case 'confirmed':
      return 'primary';
    case 'en_route':
    case 'in_progress':
      return 'accent';
    case 'completed':
      return 'success';
    case 'failed':
    case 'no_show':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function statusIcon(s: BookingStatus): IconName {
  switch (s) {
    case 'created':
    case 'searching':
      return 'hourglass';
    case 'assigned':
    case 'confirmed':
      return 'verified';
    case 'en_route':
      return 'navigation';
    case 'in_progress':
      return 'heartPulse';
    case 'completed':
      return 'checkCircle';
    case 'cancelled':
      return 'ban';
    default:
      return 'alert';
  }
}

/** Short label for chips/list rows. */
export const statusLabelKey = (s: BookingStatus): CopyKey => `status.${s}` as CopyKey;
/** Sentence for the booking detail hero ("Priya is on the way"). */
export const statusHeadlineKey = (s: BookingStatus): CopyKey => `status.headline.${s}` as CopyKey;
