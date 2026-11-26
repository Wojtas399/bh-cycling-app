import { callableRequest } from '../../../test-utils/callableRequest';
import { exchangeIntervalsTokenHandler } from '../exchangeToken';

const mockStoredDocs = new Map<string, unknown>();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (path: string) => ({
      set: async (data: unknown) => {
        mockStoredDocs.set(path, data);
      },
      delete: async () => {
        mockStoredDocs.delete(path);
      },
      get: async () => ({
        exists: mockStoredDocs.has(path),
        data: () => mockStoredDocs.get(path),
      }),
    }),
  }),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

const INTEGRATION_PATH = 'users/user-1/integrations/intervals';
const CONSENT_PATH = 'users/user-1/consents/healthData';
const CONNECTION_SCOPE = 'ACTIVITY:READ,CALENDAR:READ,SETTINGS:READ';
const SCOPE_WITH_WELLNESS = `${CONNECTION_SCOPE},WELLNESS:READ`;
const KEEP = { action: 'keep' };
const GRANT = { action: 'grant', consentVersion: 2, ageConfirmed: true };
const WITHDRAW = { action: 'withdraw' };

function buildRequest(code: string, healthData: unknown = KEEP) {
  return callableRequest(
    { code, codeVerifier: 'verifier-xyz', healthData },
    { uid: 'user-1' },
  );
}

function mockTokenResponse(scope: string) {
  return jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        access_token: 'token-abc',
        scope,
        athlete: { id: 'athlete-1', name: 'Jane Rider' },
      }),
      { status: 200 },
    ),
  );
}

describe('exchangeIntervalsTokenHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoredDocs.clear();
    process.env.INTERVALS_CLIENT_ID = 'server-configured-client-id';
    process.env.INTERVALS_CLIENT_SECRET = 'test-secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes the integration document and returns athlete identity on a valid code', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'token-abc',
          scope: 'ACTIVITY:READ,CALENDAR:READ',
          athlete: { id: 'athlete-1', name: 'Jane Rider' },
        }),
        { status: 200 },
      ),
    );

    const result = await exchangeIntervalsTokenHandler(
      buildRequest('valid-code'),
    );

    expect(result).toEqual({
      athleteId: 'athlete-1',
      athleteName: 'Jane Rider',
      healthDataConsentGiven: false,
    });
    expect(mockStoredDocs.get(INTEGRATION_PATH)).toEqual({
      accessToken: 'token-abc',
      athleteId: 'athlete-1',
      athleteName: 'Jane Rider',
      scope: 'ACTIVITY:READ,CALENDAR:READ',
      connectedAt: 'MOCK_TIMESTAMP',
    });

    const [, requestInit] = fetchSpy.mock.calls[0];

    expect(new Headers(requestInit?.headers).get('Content-Type')).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(
      new URLSearchParams(String(requestInit?.body)).get('client_id'),
    ).toBe('server-configured-client-id');
  });

  it('forwards the code verifier to Intervals.icu alongside the client secret, so only the app that started the authorization can redeem its code', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'token-abc',
          scope: 'ACTIVITY:READ,CALENDAR:READ',
          athlete: { id: 'athlete-1', name: 'Jane Rider' },
        }),
        { status: 200 },
      ),
    );

    await exchangeIntervalsTokenHandler(buildRequest('valid-code'));

    const [, requestInit] = fetchSpy.mock.calls[0];
    const body = new URLSearchParams(String(requestInit?.body));

    expect(body.get('code')).toBe('valid-code');
    expect(body.get('code_verifier')).toBe('verifier-xyz');
    expect(body.get('client_secret')).toBe('test-secret');
  });

  it('fails with internal and writes nothing when the token response is malformed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'token-abc',
          scope: 'ACTIVITY:READ,CALENDAR:READ',
        }),
        { status: 200 },
      ),
    );

    await expect(
      exchangeIntervalsTokenHandler(buildRequest('valid-code')),
    ).rejects.toMatchObject({ code: 'internal' });

    expect(mockStoredDocs.size).toBe(0);
  });

  it('returns a structured error and writes nothing for an expired/invalid code', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
      }),
    );

    await expect(
      exchangeIntervalsTokenHandler(buildRequest('expired-code')),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(mockStoredDocs.size).toBe(0);
  });

  it('rejects an unauthenticated call before contacting Intervals.icu', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      exchangeIntervalsTokenHandler(
        callableRequest({
          code: 'any-code',
          codeVerifier: 'any-verifier',
          healthData: KEEP,
        }),
      ),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockStoredDocs.size).toBe(0);
  });

  it('rejects a call without a code verifier before contacting Intervals.icu', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      exchangeIntervalsTokenHandler(
        callableRequest(
          { code: 'valid-code', healthData: KEEP },
          { uid: 'user-1' },
        ),
      ),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockStoredDocs.size).toBe(0);
  });

  it('surfaces a network failure as a structured error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(
      exchangeIntervalsTokenHandler(buildRequest('valid-code')),
    ).rejects.toMatchObject({ code: 'unavailable' });

    expect(mockStoredDocs.size).toBe(0);
  });

  describe('Health Data Consent', () => {
    it('records the consent with its version, the age statement and the time when a grant comes back with Wellness access', async () => {
      mockTokenResponse(SCOPE_WITH_WELLNESS);

      const result = await exchangeIntervalsTokenHandler(
        buildRequest('valid-code', GRANT),
      );

      expect(mockStoredDocs.get(CONSENT_PATH)).toEqual({
        givenAt: 'MOCK_TIMESTAMP',
        consentVersion: 2,
        ageConfirmed: true,
      });
      expect(result.healthDataConsentGiven).toBe(true);
    });

    it('records no consent but still saves the token when the athlete unticked Wellness on the Intervals.icu page', async () => {
      mockTokenResponse(CONNECTION_SCOPE);

      const result = await exchangeIntervalsTokenHandler(
        buildRequest('valid-code', GRANT),
      );

      expect(mockStoredDocs.has(CONSENT_PATH)).toBe(false);
      expect(mockStoredDocs.get(INTEGRATION_PATH)).toMatchObject({
        accessToken: 'token-abc',
        scope: CONNECTION_SCOPE,
      });
      expect(result.healthDataConsentGiven).toBe(false);
    });

    it('reads Wellness access from a scope separated by spaces, as OAuth returns it', async () => {
      mockTokenResponse('ACTIVITY:READ CALENDAR:READ WELLNESS:READ');

      const result = await exchangeIntervalsTokenHandler(
        buildRequest('valid-code', GRANT),
      );

      expect(result.healthDataConsentGiven).toBe(true);
    });

    it.each([
      ['without the age statement', { action: 'grant', consentVersion: 2 }],
      [
        'with a refused age statement',
        { action: 'grant', consentVersion: 2, ageConfirmed: false },
      ],
      ['without the consent version', { action: 'grant', ageConfirmed: true }],
    ])(
      'rejects a grant %s before contacting Intervals.icu',
      async (_case, healthData) => {
        const fetchSpy = mockTokenResponse(SCOPE_WITH_WELLNESS);

        await expect(
          exchangeIntervalsTokenHandler(buildRequest('valid-code', healthData)),
        ).rejects.toMatchObject({ code: 'invalid-argument' });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(mockStoredDocs.size).toBe(0);
      },
    );

    it('rejects a call without a healthData action before contacting Intervals.icu', async () => {
      const fetchSpy = mockTokenResponse(SCOPE_WITH_WELLNESS);

      await expect(
        exchangeIntervalsTokenHandler(
          callableRequest(
            { code: 'valid-code', codeVerifier: 'verifier-xyz' },
            { uid: 'user-1' },
          ),
        ),
      ).rejects.toMatchObject({ code: 'invalid-argument' });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('leaves an existing consent record untouched on keep, and says the consent is given while Wellness access is granted', async () => {
      const earlierRecord = {
        givenAt: 'EARLIER_TIMESTAMP',
        consentVersion: 1,
        ageConfirmed: true,
      };

      mockStoredDocs.set(CONSENT_PATH, earlierRecord);
      mockTokenResponse(SCOPE_WITH_WELLNESS);

      const result = await exchangeIntervalsTokenHandler(
        buildRequest('valid-code', KEEP),
      );

      expect(mockStoredDocs.get(CONSENT_PATH)).toEqual(earlierRecord);
      expect(result.healthDataConsentGiven).toBe(true);
    });

    it.each([
      ['an older', 0],
      ['a newer', 2],
    ])(
      'leaves a record for %s consent version untouched on keep, and says the consent is not given, since only the current version counts',
      async (_case, consentVersion) => {
        const otherVersionRecord = {
          givenAt: 'EARLIER_TIMESTAMP',
          consentVersion,
          ageConfirmed: true,
        };

        mockStoredDocs.set(CONSENT_PATH, otherVersionRecord);
        mockTokenResponse(SCOPE_WITH_WELLNESS);

        const result = await exchangeIntervalsTokenHandler(
          buildRequest('valid-code', KEEP),
        );

        expect(mockStoredDocs.get(CONSENT_PATH)).toEqual(otherVersionRecord);
        expect(result.healthDataConsentGiven).toBe(false);
      },
    );

    it('says the consent is not given on keep when Wellness access is not granted', async () => {
      mockStoredDocs.set(CONSENT_PATH, {
        givenAt: 'EARLIER_TIMESTAMP',
        consentVersion: 1,
        ageConfirmed: true,
      });
      mockTokenResponse(CONNECTION_SCOPE);

      const result = await exchangeIntervalsTokenHandler(
        buildRequest('valid-code', KEEP),
      );

      expect(result.healthDataConsentGiven).toBe(false);
    });

    it('deletes the consent record on withdraw, still saves the token and says the consent is not given', async () => {
      mockStoredDocs.set(CONSENT_PATH, {
        givenAt: 'EARLIER_TIMESTAMP',
        consentVersion: 1,
        ageConfirmed: true,
      });
      mockTokenResponse(CONNECTION_SCOPE);

      const result = await exchangeIntervalsTokenHandler(
        buildRequest('valid-code', WITHDRAW),
      );

      expect(mockStoredDocs.has(CONSENT_PATH)).toBe(false);
      expect(mockStoredDocs.get(INTEGRATION_PATH)).toMatchObject({
        accessToken: 'token-abc',
        scope: CONNECTION_SCOPE,
      });
      expect(result.healthDataConsentGiven).toBe(false);
    });

    it('keeps the consent record when Intervals.icu rejects the code of a withdraw, so the consent ends only once the Wellness access does', async () => {
      const earlierRecord = {
        givenAt: 'EARLIER_TIMESTAMP',
        consentVersion: 1,
        ageConfirmed: true,
      };

      mockStoredDocs.set(CONSENT_PATH, earlierRecord);
      jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
        }),
      );

      await expect(
        exchangeIntervalsTokenHandler(buildRequest('expired-code', WITHDRAW)),
      ).rejects.toMatchObject({ code: 'invalid-argument' });

      expect(mockStoredDocs.get(CONSENT_PATH)).toEqual(earlierRecord);
    });

    it('records no consent and says it is not given on keep without a record, whatever the scope', async () => {
      mockTokenResponse(SCOPE_WITH_WELLNESS);

      const result = await exchangeIntervalsTokenHandler(
        buildRequest('valid-code', KEEP),
      );

      expect(mockStoredDocs.has(CONSENT_PATH)).toBe(false);
      expect(result.healthDataConsentGiven).toBe(false);
    });
  });
});
