import type * as ReactNative from 'react-native';

import type * as BottomSheetModule from '@/lib/bottomSheet';
import { sheetSurface, signalOnDetach } from '@/lib/bottomSheet';

function bottomSheetModuleOn(os: typeof ReactNative.Platform.OS) {
  let loaded: typeof BottomSheetModule | undefined;

  jest.isolateModules(() => {
    jest.requireActual<typeof ReactNative>('react-native').Platform.OS = os;
    loaded = jest.requireActual<typeof BottomSheetModule>('@/lib/bottomSheet');
  });

  return loaded!;
}

describe('ANDROID_SHEET_TOAST_HOST', () => {
  it('gives an Android sheet its own toast host, because the sheet is a Dialog window above the root host', () => {
    expect(bottomSheetModuleOn('android').ANDROID_SHEET_TOAST_HOST).toBe(true);
  });

  it('leaves an iOS sheet to the root toast host, which stays above sheets', () => {
    expect(bottomSheetModuleOn('ios').ANDROID_SHEET_TOAST_HOST).toBe(false);
  });
});

describe('sheetSurface', () => {
  it('shows the system glass on iOS 26, unpainted and dark through the app-wide scheme', () => {
    expect(sheetSurface('ios', true)).toEqual({
      paintsBackground: false,
      forcesDarkScheme: false,
    });
  });

  it('paints an iOS sheet without Liquid Glass and forces its dark scheme', () => {
    expect(sheetSurface('ios', false)).toEqual({
      paintsBackground: true,
      forcesDarkScheme: true,
    });
  });

  it('paints an Android sheet, which takes no per-sheet scheme', () => {
    expect(sheetSurface('android', false)).toEqual({
      paintsBackground: true,
      forcesDarkScheme: false,
    });
  });
});

describe('signalOnDetach', () => {
  it('signals once the sheet’s content detaches, because Expo UI unmounts it only after the dismissal has finished', () => {
    const onDismissed = jest.fn();
    const refCallback = signalOnDetach(onDismissed);

    const detach = refCallback();

    expect(onDismissed).not.toHaveBeenCalled();

    detach();

    expect(onDismissed).toHaveBeenCalledTimes(1);
  });

  it('signals the callback it was made with, so a sheet needs a stable onDismissed', () => {
    const first = jest.fn();
    const second = jest.fn();

    const detachFirst = signalOnDetach(first)();

    signalOnDetach(second)();
    detachFirst();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('detaches quietly when nobody waits for the dismissal', () => {
    expect(() => signalOnDetach(undefined)()()).not.toThrow();
  });
});
