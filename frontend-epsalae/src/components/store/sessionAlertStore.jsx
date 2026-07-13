import { create } from 'zustand';

/**
 * Transient (non-persisted) flag set whenever an API response carries
 * `deviceMismatch: true` — i.e. the backend refreshed a session whose
 * fingerprint no longer matches the device that created it. Read by
 * DeviceMismatchBanner; cleared when the user dismisses it or navigates to
 * the sessions page to review.
 */
export const useSessionAlertStore = create((set) => ({
  deviceMismatch: false,
  setDeviceMismatch: (value) => set({ deviceMismatch: value }),
}));
