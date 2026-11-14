import { useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

/**
 * Whether a block at the top of a scroll view has scrolled fully under its
 * glass header, so the header can take over what the block showed. Pass the
 * header's height from `useGlassHeader`. `onLayout` goes on the block, a
 * direct child of the scroll content, and `onScroll` on the scroll view.
 */
export function useScrolledUnderHeader(headerHeight: number) {
  const [blockBottom, setBlockBottom] = useState<number | null>(null);
  const [scrolledUnder, setScrolledUnder] = useState(false);
  const offset = useRef(0);

  function isUnder(scrollY: number, bottom: number | null): boolean {
    return bottom !== null && scrollY + headerHeight >= bottom;
  }

  function onLayout(event: LayoutChangeEvent) {
    const { y, height } = event.nativeEvent.layout;
    const bottom = y + height;

    setBlockBottom(bottom);
    setScrolledUnder(isUnder(offset.current, bottom));
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    offset.current = event.nativeEvent.contentOffset.y;
    setScrolledUnder(isUnder(offset.current, blockBottom));
  }

  return { scrolledUnder, onLayout, onScroll };
}
