import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';

export interface SurfaceContrast {
  reduceTransparency: boolean;
  /** Increase Contrast on iOS, high text contrast on Android. */
  increaseContrast: boolean;
}

// One store for every surface, so a card mounting mid-scroll paints with the
// settings already known instead of reading them again.
let snapshot: SurfaceContrast = {
  reduceTransparency: false,
  increaseContrast: false,
};
const listeners = new Set<() => void>();
let stopWatching: (() => void) | undefined;

function update(key: keyof SurfaceContrast, value: boolean) {
  if (snapshot[key] === value) return;

  snapshot = { ...snapshot, [key]: value };
  listeners.forEach(listener => listener());
}

/** A setting that can't be read (a missing native module) keeps its value. */
function read(setting: () => Promise<boolean>, key: keyof SurfaceContrast) {
  setting().then(
    value => update(key, value),
    () => {},
  );
}

function readIncreaseContrast(): Promise<boolean> {
  return Platform.OS === 'ios'
    ? AccessibilityInfo.isDarkerSystemColorsEnabled()
    : AccessibilityInfo.isHighTextContrastEnabled();
}

function watch(): () => void {
  read(
    () => AccessibilityInfo.isReduceTransparencyEnabled(),
    'reduceTransparency',
  );
  read(readIncreaseContrast, 'increaseContrast');

  const reduceTransparencySubscription = AccessibilityInfo.addEventListener(
    'reduceTransparencyChanged',
    value => update('reduceTransparency', value),
  );
  const appStateSubscription = AppState.addEventListener('change', state => {
    if (state === 'active') {
      read(readIncreaseContrast, 'increaseContrast');
    }
  });

  return () => {
    reduceTransparencySubscription.remove();
    appStateSubscription.remove();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1) {
    stopWatching = watch();
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stopWatching?.();
      stopWatching = undefined;
    }
  };
}

/**
 * The accessibility settings that change how surfaces paint: Reduce
 * Transparency (followed live) and Increase Contrast or high text contrast
 * (read again when the app returns to the foreground). Only the surface
 * primitives call it; screens and controls never read these settings.
 */
export function useSurfaceContrast(): SurfaceContrast {
  return useSyncExternalStore(subscribe, () => snapshot);
}
