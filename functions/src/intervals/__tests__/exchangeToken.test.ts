import { exchangeIntervalsTokenHandler } from '../exchangeToken';
import type { ExchangeIntervalsTokenData } from '../types';
import type { CallableRequest } from 'firebase-functions/v2/https';

const setMock = jest.fn().mockResolvedValue(undefined);
const docMock = jest.fn(() => ({ set: setMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock }),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

function buildRequest(
  data: ExchangeIntervalsTokenData,
  uid = 'user-1',
): CallableRequest<ExchangeIntervalsTokenData> {
  return {
    data,
    auth: uid ? { uid, token: {} as never } : undefined,
  } as CallableRequest<ExchangeIntervalsTokenData>;
}

describe('exchangeIntervalsTokenHandler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTERVALS_CLIENT_ID = 'server-configured-client-id';
    process.env.INTERVALS_CLIENT_SECRET = 'test-secret';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('writes the integration document and returns athlete identity on a valid code', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token-abc',
        scope: 'ACTIVITY:READ,CALENDAR:READ',
        athlete: { id: 'athlete-1', name: 'Jane Rider' },
      }),
    }) as unknown as typeof fetch;

    const result = await exchangeIntervalsTokenHandler(
      buildRequest({ code: 'valid-code' }),
    );

    expect(result).toEqual({
      athleteId: 'athlete-1',
      athleteName: 'Jane Rider',
    });
    expect(docMock).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(setMock).toHaveBeenCalledWith({
      accessToken: 'token-abc',
      athleteId: 'athlete-1',
      athleteName: 'Jane Rider',
      scope: 'ACTIVITY:READ,CALENDAR:READ',
      connectedAt: 'MOCK_TIMESTAMP',
    });

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string> },
    ];

    expect(requestInit.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    expect(new URLSearchParams(requestInit.body).get('client_id')).toBe(
      'server-configured-client-id',
    );
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
      exchangeIntervalsTokenHandler(buildRequest({ code: 'valid-code' })),
    ).rejects.toMatchObject({ code: 'internal' });

    expect(setMock).not.toHaveBeenCalled();
  });

  it('returns a structured error and writes nothing for an expired/invalid code', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_grant' }),
    }) as unknown as typeof fetch;

    await expect(
      exchangeIntervalsTokenHandler(buildRequest({ code: 'expired-code' })),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(setMock).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated call before contacting Intervals.icu', async () => {
    global.fetch = jest.fn();

    await expect(
      exchangeIntervalsTokenHandler(buildRequest({ code: 'any-code' }, '')),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it('surfaces a network failure as a structured error', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    await expect(
      exchangeIntervalsTokenHandler(buildRequest({ code: 'valid-code' })),
    ).rejects.toMatchObject({ code: 'unavailable' });

    expect(setMock).not.toHaveBeenCalled();
  });
});
