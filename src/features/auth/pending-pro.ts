import type { ProDetails } from './pro-onboarding';

// Holds what the professional typed at sign-up when onboarding failed, so the
// finish-onboarding screen can prefill it instead of asking again.
let pending: ProDetails | null = null;

export function setPendingProDetails(details: ProDetails | null) {
  pending = details;
}

export function takePendingProDetails(): ProDetails | null {
  const value = pending;
  pending = null;
  return value;
}
