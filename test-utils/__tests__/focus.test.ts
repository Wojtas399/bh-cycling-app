import { restoreDefaultFocus } from '../focus';
import { focusManager } from '@tanstack/react-query';

describe('restoreDefaultFocus', () => {
  it('hands focus back to the default listener after a test set it by hand', () => {
    focusManager.setFocused(false);

    restoreDefaultFocus();

    expect(focusManager.isFocused()).toBe(true);
  });
});
