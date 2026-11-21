import type {
  EmitterSubscription,
  HostInstance,
  LayoutChangeEvent,
  LayoutRectangle,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

const unreadHostInstance = {} as HostInstance;

export function syntheticEvent<T>(nativeEvent: T): NativeSyntheticEvent<T> {
  return {
    nativeEvent,
    currentTarget: unreadHostInstance,
    target: unreadHostInstance,
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    preventDefault: jest.fn(),
    isDefaultPrevented: () => false,
    stopPropagation: jest.fn(),
    isPropagationStopped: () => false,
    persist: jest.fn(),
    timeStamp: 0,
    type: '',
  };
}

export function layoutEvent(layout: LayoutRectangle): LayoutChangeEvent {
  return syntheticEvent({ layout });
}

export function scrollEvent(
  contentOffset: NativeScrollEvent['contentOffset'],
): NativeSyntheticEvent<NativeScrollEvent> {
  return syntheticEvent({
    contentOffset,
    contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
    contentSize: { width: 0, height: 0 },
    layoutMeasurement: { width: 0, height: 0 },
    zoomScale: 1,
  });
}

export function emitterSubscription(remove = jest.fn()): EmitterSubscription {
  return { remove } as unknown as EmitterSubscription;
}
