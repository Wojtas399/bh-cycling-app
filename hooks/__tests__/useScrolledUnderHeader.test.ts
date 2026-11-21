import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { useScrolledUnderHeader } from '../useScrolledUnderHeader';
import { layoutEvent, scrollEvent } from '@/test-utils/reactNative';
import { act, renderHook } from '@testing-library/react-native';

const HEADER_HEIGHT = 100;

function layout(y: number, height: number): LayoutChangeEvent {
  return layoutEvent({ x: 0, y, width: 320, height });
}

const BLOCK_SPANNING_116_TO_236 = layout(116, 120);
const BLOCK_PUSHED_DOWN_BY_A_LONGER_TITLE = layout(116, 220);

function scroll(y: number): NativeSyntheticEvent<NativeScrollEvent> {
  return scrollEvent({ x: 0, y });
}

async function renderScrolled() {
  return renderHook(() => useScrolledUnderHeader(HEADER_HEIGHT));
}

describe('useScrolledUnderHeader', () => {
  it('is not under the header before any scroll', async () => {
    const { result } = await renderScrolled();

    await act(() => result.current.onLayout(BLOCK_SPANNING_116_TO_236));

    expect(result.current.scrolledUnder).toBe(false);
  });

  it("is under the header once the block's bottom has scrolled up to the header's", async () => {
    const { result } = await renderScrolled();

    await act(() => result.current.onLayout(BLOCK_SPANNING_116_TO_236));
    await act(() => result.current.onScroll(scroll(135)));

    expect(result.current.scrolledUnder).toBe(false);

    await act(() => result.current.onScroll(scroll(136)));

    expect(result.current.scrolledUnder).toBe(true);
  });

  it('is no longer under the header once scrolled back', async () => {
    const { result } = await renderScrolled();

    await act(() => result.current.onLayout(BLOCK_SPANNING_116_TO_236));
    await act(() => result.current.onScroll(scroll(400)));
    await act(() => result.current.onScroll(scroll(0)));

    expect(result.current.scrolledUnder).toBe(false);
  });

  it('is never under the header before the block is laid out', async () => {
    const { result } = await renderScrolled();

    await act(() => result.current.onScroll(scroll(400)));

    expect(result.current.scrolledUnder).toBe(false);
  });

  it('follows the block when a refresh brings a longer title that pushes its bottom down under the current scroll offset', async () => {
    const { result } = await renderScrolled();

    await act(() => result.current.onLayout(BLOCK_SPANNING_116_TO_236));
    await act(() => result.current.onScroll(scroll(200)));
    await act(() =>
      result.current.onLayout(BLOCK_PUSHED_DOWN_BY_A_LONGER_TITLE),
    );

    expect(result.current.scrolledUnder).toBe(false);
  });
});
