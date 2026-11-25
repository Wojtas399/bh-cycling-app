import { sentryOptions, sentryUser } from '../sentryConfig';

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

  it('turns Sentry off when the DSN is not an https URL, such as the e2e profile off value', () => {
    expect(
      sentryOptions({ dsn: 'off', appEnv: 'staging', isDev: false }),
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

  it('turns off the network breadcrumbs the native iOS SDK records, since they skip the JS breadcrumb scrubber', () => {
    expect(
      sentryOptions({ dsn: DSN, appEnv: 'production', isDev: false }),
    ).toMatchObject({ enableNetworkBreadcrumbs: false });
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

describe('beforeBreadcrumb', () => {
  it("filters tokens and the OAuth code and state out of a breadcrumb's URLs and message", () => {
    const { beforeBreadcrumb } = releaseOptions();

    expect(
      beforeBreadcrumb({
        type: 'http',
        category: 'fetch',
        data: {
          method: 'GET',
          url: 'https://example.com/cb?code=abc&scope=ACTIVITY',
          status_code: 200,
        },
      }),
    ).toEqual({
      type: 'http',
      category: 'fetch',
      data: {
        method: 'GET',
        url: 'https://example.com/cb?code=[Filtered]&scope=ACTIVITY',
        status_code: 200,
      },
    });
    expect(
      beforeBreadcrumb({
        category: 'console',
        message:
          'Opened blackhorsecyclingapp://oauth?state=xyz&access_token=t1',
      }).message,
    ).toBe(
      'Opened blackhorsecyclingapp://oauth?state=[Filtered]&access_token=[Filtered]',
    );
  });

  it("drops bodies, the Authorization header and tokens from a breadcrumb's data, at any depth", () => {
    const { beforeBreadcrumb } = releaseOptions();

    expect(
      beforeBreadcrumb({
        type: 'http',
        category: 'xhr',
        data: {
          url: 'https://intervals.icu/api/v1/athlete/0/wellness',
          body: '{"weight":72}',
          request_body: '{"weight":72}',
          response_body: '[{"id":"2026-11-25"}]',
          request_body_size: 13,
          response_body_size: 21,
          Authorization: 'Bearer t1',
          headers: { authorization: 'Bearer t1', accept: 'application/json' },
          refreshToken: 't2',
        },
      }).data,
    ).toEqual({
      url: 'https://intervals.icu/api/v1/athlete/0/wellness',
      request_body_size: 13,
      response_body_size: 21,
      headers: { accept: 'application/json' },
    });
  });

  it('keeps fields named code or state, which are secrets only as OAuth query parameters', () => {
    const { beforeBreadcrumb } = releaseOptions();

    expect(
      beforeBreadcrumb({
        category: 'app.lifecycle',
        data: { state: 'background', code: 'auth/network-request-failed' },
      }).data,
    ).toEqual({ state: 'background', code: 'auth/network-request-failed' });
  });
});

describe('sentryUser', () => {
  it('names a signed-in athlete by Firebase uid alone', () => {
    const athlete = {
      uid: 'firebase-uid-1',
      email: 'athlete@example.com',
      displayName: 'Athlete',
      phoneNumber: '+48123456789',
    };

    expect(sentryUser(athlete)).toEqual({ id: 'firebase-uid-1' });
  });

  it('clears the user once the athlete has signed out', () => {
    expect(sentryUser(null)).toBeNull();
  });
});
