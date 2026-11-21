import { focusManager } from '@tanstack/react-query';

export function restoreDefaultFocus(): void {
  focusManager.setFocused(undefined);
}
