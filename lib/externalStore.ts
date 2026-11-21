type Listener = () => void;
type StopSource = () => void;

export function createListeners(startSource?: () => StopSource) {
  const listeners = new Set<Listener>();
  let stopSource: StopSource | undefined;

  return {
    subscribe: (listener: Listener): (() => void) => {
      listeners.add(listener);
      stopSource ??= startSource?.();

      return () => {
        listeners.delete(listener);

        if (listeners.size > 0) return;

        stopSource?.();
        stopSource = undefined;
      };
    },
    notify: (): void => {
      listeners.forEach(listener => listener());
    },
  };
}

export function subscribeToNothing(): () => void {
  return () => {};
}
