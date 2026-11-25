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

  it('turns Sentry off in a debug run with Metro, even with a DSN', () => {
    expect(sentryOptions({ dsn: DSN, appEnv: 'dev', isDev: true })).toBeNull();
  });

  it('turns Sentry on in a release build with a DSN, tagged with its APP_ENV', () => {
    expect(
      sentryOptions({ dsn: DSN, appEnv: 'staging', isDev: false }),
    ).toMatchObject({ dsn: DSN, environment: 'staging' });
    expect(
      sentryOptions({ dsn: DSN, appEnv: 'production', isDev: false }),
    ).toMatchObject({ dsn: DSN, environment: 'production' });
  });

  it('keeps default PII, such as the IP address, out of events', () => {
    expect(
      sentryOptions({ dsn: DSN, appEnv: 'production', isDev: false }),
    ).toMatchObject({ sendDefaultPii: false });
  });

  it('sets no sample rate, since even a rate of 0 installs the tracing, replay or profiling integrations', () => {
    const options = sentryOptions({
      dsn: DSN,
      appEnv: 'production',
      isDev: false,
    });

    expect(options).not.toHaveProperty('tracesSampleRate');
    expect(options).not.toHaveProperty('tracesSampler');
    expect(options).not.toHaveProperty('profilesSampleRate');
    expect(options).not.toHaveProperty('replaysSessionSampleRate');
    expect(options).not.toHaveProperty('replaysOnErrorSampleRate');
  });
});

function releaseOptions() {
  return sentryOptions({ dsn: DSN, appEnv: 'production', isDev: false })!;
}

describe('beforeSend', () => {
  it('drops the Authorization header from the request, in any case', () => {
    const { beforeSend } = releaseOptions();

    expect(
      beforeSend({
        request: {
          url: 'https://intervals.icu/api/v1/athlete/0/events',
          headers: {
            Authorization: 'Bearer secret-token',
            accept: 'application/json',
          },
        },
      }).request?.headers,
    ).toEqual({ accept: 'application/json' });
    expect(
      beforeSend({
        request: { headers: { authorization: 'Basic c2VjcmV0' } },
      }).request?.headers,
    ).toEqual({});
  });
});
