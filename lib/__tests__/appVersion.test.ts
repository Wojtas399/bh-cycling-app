import { formatAppVersion } from '../appVersion';

describe('formatAppVersion', () => {
  it('returns the bare version on production', () => {
    expect(formatAppVersion('1.0.0', 'production')).toBe('1.0.0');
  });

  it('appends (staging) on non-production builds', () => {
    expect(formatAppVersion('1.0.0', 'staging')).toBe('1.0.0 (staging)');
  });

  it('treats an unknown environment as non-production', () => {
    expect(formatAppVersion('2.1.0', undefined)).toBe('2.1.0 (staging)');
  });

  it('returns an empty string when the version is unknown', () => {
    expect(formatAppVersion(undefined, 'production')).toBe('');
  });
});
