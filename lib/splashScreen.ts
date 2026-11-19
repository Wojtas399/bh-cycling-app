import * as SplashScreen from 'expo-splash-screen';

let hidden = false;

/**
 * Hides the splash the first time it is called. The root view calls it from
 * `onLayout`, which runs again on every re-layout, such as a rotation.
 */
export function hideSplashScreen(): void {
  if (hidden) return;

  hidden = true;
  // Nothing in the app can recover from a failed hide, so it is dropped
  // rather than left as an unhandled rejection.
  SplashScreen.hideAsync().catch(() => {});
}
