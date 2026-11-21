import { useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

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
