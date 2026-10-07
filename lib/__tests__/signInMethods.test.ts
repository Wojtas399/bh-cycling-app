import { getSignInMethods } from '../signInMethods';

function userWith(...providerIds: string[]) {
  return { providerData: providerIds.map(providerId => ({ providerId })) };
}

describe('getSignInMethods', () => {
  it('maps the password provider to email', () => {
    expect(getSignInMethods(userWith('password'))).toEqual(['email']);
  });

  it('maps the google.com provider to google', () => {
    expect(getSignInMethods(userWith('google.com'))).toEqual(['google']);
  });

  it('returns both methods for a linked account', () => {
    expect(getSignInMethods(userWith('password', 'google.com'))).toEqual([
      'email',
      'google',
    ]);
  });

  it('ignores unknown providers', () => {
    expect(getSignInMethods(userWith('facebook.com', 'password'))).toEqual([
      'email',
    ]);
  });

  it('returns an empty list when there is no user or no provider data', () => {
    expect(getSignInMethods(null)).toEqual([]);
    expect(getSignInMethods(userWith())).toEqual([]);
  });
});
