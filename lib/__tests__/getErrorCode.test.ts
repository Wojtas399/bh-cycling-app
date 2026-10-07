import { getErrorCode } from '../getErrorCode';

describe('getErrorCode', () => {
  it('returns the code of an error that has one', () => {
    expect(getErrorCode({ code: 'auth/wrong-password' })).toBe(
      'auth/wrong-password',
    );
  });

  it('returns an empty string when the error has no code', () => {
    expect(getErrorCode(new Error('boom'))).toBe('');
  });

  it('returns an empty string for null, undefined and non-objects', () => {
    expect(getErrorCode(null)).toBe('');
    expect(getErrorCode(undefined)).toBe('');
    expect(getErrorCode('boom')).toBe('');
  });
});
