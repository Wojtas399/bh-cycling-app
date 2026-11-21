import { AppState, Platform } from 'react-native';

import { focusManager } from '@tanstack/react-query';

export function setupAppFocus(): void {
  if (Platform.OS === 'web') return;

  focusManager.setEventListener(handleFocus => {
    const subscription = AppState.addEventListener('change', state =>
      handleFocus(state === 'active'),
    );

    return () => subscription.remove();
  });
}
