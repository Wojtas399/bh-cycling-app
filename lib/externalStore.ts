type Listener = () => void;

/**
 * The listeners of a store read through `useSyncExternalStore`. `start`, when
 * given, starts the store's source as the first listener subscribes and
 * returns how to stop it, which runs once the last listener has left.
 */
export function createListeners(start?: () => () => void) {
  const listeners = new Set<Listener>();
  let stop: (() => void) | undefined;

  // Arrow functions, so a store can export `subscribe` on its own.
  return {
    subscribe: (listener: Listener): (() => void) => {
      listeners.add(listener);
      stop ??= start?.();

      return () => {
        listeners.delete(listener);

        if (listeners.size > 0) return;

        stop?.();
        stop = undefined;
      };
    },
    notify: (): void => {
      listeners.forEach(listener => listener());
    },
  };
}

/** The subscribe of a store whose value never changes. */
export function subscribeToNothing(): () => void {
  return () => {};
}
