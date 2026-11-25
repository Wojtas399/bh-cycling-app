import { sentryOptions } from '../sentryConfig';

const DSN = 'https://public@o1.ingest.sentry.io/2';

describe('sentryOptions', () => {
  it('turns Sentry off when the build has no DSN', () => {
    expect(
      sentryOptions({ dsn: undefined, appEnv: 'production', isDev: false }),
    ).toBeNull();
    expect(
      sentryOptions({ dsn: '', appEnv: 'production', isDev: false }),
    ).toBeNull();
  });
});
