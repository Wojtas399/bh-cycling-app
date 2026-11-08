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
    await expect(screen.getByPlaceholder('you@example.com')).toBeVisible({
      timeout: 30_000,
    });
    await use();
  },
});
