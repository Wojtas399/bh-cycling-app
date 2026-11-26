import { createListeners } from './externalStore';

let withdrawn = false;
const listeners = createListeners();

export function getHealthDataConsentWithdrawn(): boolean {
  return withdrawn;
}

export function setHealthDataConsentWithdrawn(value: boolean): void {
  if (withdrawn === value) return;

  withdrawn = value;
  listeners.notify();
}

export const subscribeHealthDataConsentWithdrawn = listeners.subscribe;
