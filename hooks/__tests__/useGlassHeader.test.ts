import { type LayoutChangeEvent, Platform } from 'react-native';

import { useGlassHeader } from '../useGlassHeader';
import { act, renderHook } from '@testing-library/react-native';

const STATUS_BAR = 59;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

function layoutWithHeight(height: number): LayoutChangeEvent {
  return {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  } as LayoutChangeEvent;
}

describe('useGlassHeader', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('starts a pushed screen’s content below the whole header', async () => {
    Platform.OS = 'ios';

    const { result } = await renderHook(() => useGlassHeader('pushed'));

    await act(() => result.current.onLayout(layoutWithHeight(111)));

    expect(result.current.height).toBe(111);
    expect(result.current.scrollInsetTop).toBe(111);
  });

  it('leaves the status bar out of an iOS tab screen’s scroll inset, which the scroll view adjusts for itself', async () => {
    Platform.OS = 'ios';

    const { result } = await renderHook(() => useGlassHeader('tab'));

    await act(() => result.current.onLayout(layoutWithHeight(111)));

    expect(result.current.scrollViewProps.contentInsetAdjustmentBehavior).toBe(
      'automatic',
    );
    expect(result.current.scrollInsetTop).toBe(111 - STATUS_BAR);
    expect(result.current.height).toBe(111);
  });

  it('starts an Android tab screen’s scroll content below the whole header', async () => {
    Platform.OS = 'android';

    const { result } = await renderHook(() => useGlassHeader('tab'));

    await act(() => result.current.onLayout(layoutWithHeight(104)));

    expect(result.current.scrollInsetTop).toBe(104);
  });

  it('never pulls content up before the header has laid out', async () => {
    Platform.OS = 'ios';

    const { result } = await renderHook(() => useGlassHeader('tab'));

    expect(result.current.height).toBe(0);
    expect(result.current.scrollInsetTop).toBe(0);
  });
});
