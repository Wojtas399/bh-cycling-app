import { AppState, Platform } from 'react-native';

import { focusManager } from '@tanstack/react-query';

/**
 * Tells TanStack Query the app is focused whenever it returns to the
 * foreground, so stale queries on screen refetch. Call it once at app start.
 * On web the library's own `visibilitychange` listener already does this.
 */
export function setupAppFocus(): void {
  if (Platform.OS === 'web') return;

  focusManager.setEventListener(handleFocus => {
    const subscription = AppState.addEventListener('change', state =>
      handleFocus(state === 'active'),
    );

    return () => subscription.remove();
  });
}
