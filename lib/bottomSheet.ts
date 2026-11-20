import { Platform } from 'react-native';

export const ANDROID_SHEET_TOAST_HOST = Platform.OS === 'android';

export interface SheetSurface {
  paintsBackground: boolean;
  forcesDarkScheme: boolean;
}

export function sheetSurface(
  os: typeof Platform.OS,
  liquidGlassAvailable: boolean,
): SheetSurface {
  return {
    paintsBackground: !liquidGlassAvailable,
    forcesDarkScheme: os === 'ios' && !liquidGlassAvailable,
  };
}

export function signalOnDetach(onDetach: (() => void) | undefined) {
  return () => () => onDetach?.();
}
