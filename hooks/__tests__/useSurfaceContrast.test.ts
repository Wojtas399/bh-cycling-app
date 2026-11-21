import { AccessibilityInfo, AppState, Platform } from 'react-native';

import { useSurfaceContrast } from '../useSurfaceContrast';
import { emitterSubscription } from '@/test-utils/reactNative';
import { act, renderHook, waitFor } from '@testing-library/react-native';

describe('useSurfaceContrast', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  function settings({
    reduceTransparency = false,
    darkerSystemColors = false,
    highTextContrast = false,
  }) {
    jest
      .spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled')
      .mockResolvedValue(reduceTransparency);
    jest
      .spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled')
      .mockResolvedValue(darkerSystemColors);
    jest
      .spyOn(AccessibilityInfo, 'isHighTextContrastEnabled')
      .mockResolvedValue(highTextContrast);
  }

  it('reads Reduce Transparency and Increase Contrast on iOS', async () => {
    Platform.OS = 'ios';
    settings({ reduceTransparency: true, darkerSystemColors: true });

    const { result } = await renderHook(() => useSurfaceContrast());

    await waitFor(() =>
      expect(result.current).toEqual({
        reduceTransparency: true,
        increaseContrast: true,
      }),
    );
  });

  it('reads high text contrast as Increase Contrast on Android', async () => {
    Platform.OS = 'android';
    settings({ darkerSystemColors: false, highTextContrast: true });

    const { result } = await renderHook(() => useSurfaceContrast());

    await waitFor(() =>
      expect(result.current).toEqual({
        reduceTransparency: false,
        increaseContrast: true,
      }),
    );
  });

  it('follows Reduce Transparency while the app is open', async () => {
    Platform.OS = 'ios';
    settings({ reduceTransparency: false });
    const changed = captureListener(AccessibilityInfo);

    const { result } = await renderHook(() => useSurfaceContrast());

    await waitFor(() => expect(result.current.reduceTransparency).toBe(false));

    await act(async () => {
      changed('reduceTransparencyChanged', true);
    });

    expect(result.current.reduceTransparency).toBe(true);
  });

  it.each([
    ['ios', { darkerSystemColors: true }],
    ['android', { highTextContrast: true }],
  ] as const)(
    'reads Increase Contrast again when the app returns to the foreground on %s',
    async (os, turnedOn) => {
      Platform.OS = os;
      settings({});
      const appStateChanged = captureListener(AppState);

      const { result } = await renderHook(() => useSurfaceContrast());

      await waitFor(() => expect(result.current.increaseContrast).toBe(false));

      settings(turnedOn);
      await act(async () => {
        appStateChanged('change', 'active');
      });

      expect(result.current.increaseContrast).toBe(true);
    },
  );

  it('waits for the app to be active before reading again', async () => {
    Platform.OS = 'ios';
    settings({});
    const appStateChanged = captureListener(AppState);

    const { result } = await renderHook(() => useSurfaceContrast());

    await waitFor(() => expect(result.current.increaseContrast).toBe(false));

    settings({ darkerSystemColors: true });
    await act(async () => {
      appStateChanged('change', 'background');
    });

    expect(result.current.increaseContrast).toBe(false);
  });

  it('keeps the last value when a setting cannot be read', async () => {
    Platform.OS = 'ios';
    settings({ darkerSystemColors: true });
    const appStateChanged = captureListener(AppState);

    const { result } = await renderHook(() => useSurfaceContrast());

    await waitFor(() => expect(result.current.increaseContrast).toBe(true));

    jest
      .spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled')
      .mockRejectedValue(new Error('not available'));
    await act(async () => {
      appStateChanged('change', 'active');
    });

    expect(result.current.increaseContrast).toBe(true);
  });

  it('stops listening once nothing uses it', async () => {
    Platform.OS = 'ios';
    settings({});
    const removeAccessibility = jest.fn();
    const removeAppState = jest.fn();

    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue(emitterSubscription(removeAccessibility));
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: removeAppState });

    const first = await renderHook(() => useSurfaceContrast());
    const second = await renderHook(() => useSurfaceContrast());

    await first.unmount();

    expect(removeAccessibility).not.toHaveBeenCalled();
    expect(removeAppState).not.toHaveBeenCalled();

    await second.unmount();

    expect(removeAccessibility).toHaveBeenCalled();
    expect(removeAppState).toHaveBeenCalled();
  });
});

/** Records the listeners a module subscribes and fires them by event name. */
function captureListener(emitter: {
  addEventListener: (...args: never[]) => unknown;
}) {
  const listeners = new Map<string, (value: unknown) => void>();

  jest
    .spyOn(emitter, 'addEventListener')
    .mockImplementation((event: string, listener: (value: unknown) => void) => {
      listeners.set(event, listener);

      return { remove: jest.fn() };
    });

  return (event: string, value: unknown) => listeners.get(event)?.(value);
}
