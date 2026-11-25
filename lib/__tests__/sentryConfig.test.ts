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

  it('filters tokens and the OAuth code and state out of the request URL', () => {
    const { beforeSend } = releaseOptions();

    expect(
      beforeSend({
        request: {
          url: 'blackhorsecyclingapp://oauth?code=abc123&state=xyz&scope=ACTIVITY',
        },
      }).request?.url,
    ).toBe(
      'blackhorsecyclingapp://oauth?code=[Filtered]&state=[Filtered]&scope=ACTIVITY',
    );
    expect(
      beforeSend({
        request: {
          url: 'https://example.com/cb?Access_Token=t1&refresh_token=t2#id_token=t3',
        },
      }).request?.url,
    ).toBe(
      'https://example.com/cb?Access_Token=[Filtered]&refresh_token=[Filtered]#id_token=[Filtered]',
    );
  });

  it('filters tokens and the OAuth code and state out of the query string, in each of its forms', () => {
    const { beforeSend } = releaseOptions();
    const queryString = (query_string: string | Record<string, string>) =>
      beforeSend({ request: { query_string } }).request?.query_string;

    expect(queryString('code=abc&scope=ACTIVITY')).toBe(
      'code=[Filtered]&scope=ACTIVITY',
    );
    expect(queryString({ state: 'xyz', oldest: '2026-11-01' })).toEqual({
      state: '[Filtered]',
      oldest: '2026-11-01',
    });
    expect(
      beforeSend({
        request: {
          query_string: [
            ['access_token', 't1'],
            ['newest', '2026-11-30'],
          ],
        },
      }).request?.query_string,
    ).toEqual([
      ['access_token', '[Filtered]'],
      ['newest', '2026-11-30'],
    ]);
  });

  it('drops the request body and cookies', () => {
    const { beforeSend } = releaseOptions();
    const { request } = beforeSend({
      request: {
        url: 'https://intervals.icu/api/v1/athlete/0/events',
        method: 'POST',
        data: { name: 'Sweet spot 3x15' },
        cookies: { session: 'abc' },
      },
    });

    expect(request).toEqual({
      url: 'https://intervals.icu/api/v1/athlete/0/events',
      method: 'POST',
    });
  });
});
