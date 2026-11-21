import { callableRequest } from '../../../test-utils/callableRequest';
import { exchangeIntervalsTokenHandler } from '../exchangeToken';

const setMock = jest.fn().mockResolvedValue(undefined);
const docMock = jest.fn(() => ({ set: setMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock }),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

function buildRequest(code: string) {
  return callableRequest({ code }, { uid: 'user-1' });
}

describe('exchangeIntervalsTokenHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    });
    expect(docMock).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(setMock).toHaveBeenCalledWith({
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

    expect(setMock).not.toHaveBeenCalled();
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

    expect(setMock).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated call before contacting Intervals.icu', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      exchangeIntervalsTokenHandler(callableRequest({ code: 'any-code' })),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it('surfaces a network failure as a structured error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(
      exchangeIntervalsTokenHandler(buildRequest('valid-code')),
    ).rejects.toMatchObject({ code: 'unavailable' });

    expect(setMock).not.toHaveBeenCalled();
  });
});
