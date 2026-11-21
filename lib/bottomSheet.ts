import { Platform } from 'react-native';

export const SHEET_HOSTS_ITS_OWN_TOASTS = Platform.OS === 'android';

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
