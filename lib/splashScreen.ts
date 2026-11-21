import { ignoreFailure } from './ignoreFailure';
import * as SplashScreen from 'expo-splash-screen';

let hidden = false;

export function hideSplashScreen(): void {
  if (hidden) return;

  hidden = true;
  ignoreFailure(() => SplashScreen.hideAsync());
}
