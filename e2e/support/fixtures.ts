import { EMAIL_PLACEHOLDER, LOAD_TIMEOUT } from './constants';
import { test as base } from '@e2e-dev/mobile';
import { expect } from 'e2e';

export const test = base.extend<{ signedOut: void }>({
  signedOut: async ({ app, device, platform, screen }, use) => {
    const firebaseSessionOutlivesClearStateInKeychain = platform === 'ios';

    await app.clearState();

    if (firebaseSessionOutlivesClearStateInKeychain) {
      await device.clearKeychain();
    }

    await app.open();
    await expect(screen.getByPlaceholder(EMAIL_PLACEHOLDER)).toBeVisible(
      LOAD_TIMEOUT,
    );
    await use();
  },
});
