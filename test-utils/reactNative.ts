import type {
  EmitterSubscription,
  LayoutChangeEvent,
  LayoutRectangle,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

export function layoutEvent(layout: LayoutRectangle): LayoutChangeEvent {
  return { nativeEvent: { layout } } as LayoutChangeEvent;
}

export function scrollEvent(
  contentOffset: NativeScrollEvent['contentOffset'],
): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: { contentOffset },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

export function emitterSubscription(remove = jest.fn()): EmitterSubscription {
  return { remove } as unknown as EmitterSubscription;
}
