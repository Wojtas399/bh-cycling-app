import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from './constants';
import { test as base } from '@e2e-dev/mobile';
import { expect } from 'e2e';

/**
 * The mobile `test`, with every test starting signed out on the sign-in
 * screen. On iOS the Firebase session lives in the keychain, which
 * `app.clearState()` leaves behind.
 */
export const test = base.extend<{ signedOut: void }>({
  signedOut: async ({ app, device, platform, screen }, use) => {
    await app.clearState();

    if (platform === 'ios') await device.clearKeychain();

    await app.open();
    await expect(screen.getByPlaceholder(EMAIL_PLACEHOLDER)).toBeVisible(
      LOAD_TIMEOUT,
    );
    await use();
  },
});
