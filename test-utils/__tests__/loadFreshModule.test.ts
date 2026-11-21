import type * as ReactNative from 'react-native';

import { loadFreshModule } from '../loadFreshModule';
import type * as VerificationEmailModule from '@/lib/verificationEmail';

function loadVerificationEmail() {
  return loadFreshModule(() =>
    jest.requireActual<typeof VerificationEmailModule>(
      '@/lib/verificationEmail',
    ),
  );
}

describe('loadFreshModule', () => {
  it('loads the module again, so state an earlier load built up starts over', async () => {
    const earlier = loadVerificationEmail();

    await earlier.sendVerificationEmail({
      sendEmailVerification: async () => undefined,
    });

    expect(earlier.getVerificationEmailSentAt()).not.toBeNull();
    expect(loadVerificationEmail().getVerificationEmailSentAt()).toBeNull();
  });

  it('shares one fresh copy of each import within a load, apart from the copy outside it', () => {
    const outside = jest.requireActual<typeof ReactNative>('react-native');
    const { first, second } = loadFreshModule(() => ({
      first: jest.requireActual<typeof ReactNative>('react-native'),
      second: jest.requireActual<typeof ReactNative>('react-native'),
    }));

    expect(first).toBe(second);
    expect(first).not.toBe(outside);
  });
});
