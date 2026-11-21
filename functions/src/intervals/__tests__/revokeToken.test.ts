import { revokeIntervalsToken } from '../revokeToken';
import { Timestamp } from 'firebase-admin/firestore';
import type * as firestore from 'firebase-admin/firestore';

const getMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock }));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock }),
  Timestamp: jest.requireActual<typeof firestore>('firebase-admin/firestore')
    .Timestamp,
}));

function mockIntegration(accessToken: string | undefined) {
  const data =
    accessToken === undefined
      ? undefined
      : {
          accessToken,
          athleteId: 'athlete-1',
          athleteName: 'Jane Rider',
          scope: 'ACTIVITY:READ,CALENDAR:READ',
          connectedAt: Timestamp.now(),
        };

  getMock.mockResolvedValue({ exists: data !== undefined, data: () => data });
}

describe('revokeIntervalsToken', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls disconnect-app with the stored token as bearer', async () => {
    mockIntegration('token-1');

    await revokeIntervalsToken('user-1');

    expect(docMock).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/disconnect-app',
      { method: 'DELETE', headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it('logs an error and skips the revoke call when the integration doc is malformed', async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({ accessToken: 42 }),
    });

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('does nothing when there is no integration doc', async () => {
    mockIntegration(undefined);

    await revokeIntervalsToken('user-1');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats 401 as already disconnected', async () => {
    mockIntegration('token-1');
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
  });

  it('does not throw on other HTTP failures, so callers can always proceed', async () => {
    mockIntegration('token-1');
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
  });

  it('does not throw on network failure', async () => {
    mockIntegration('token-1');
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
  });

  it('does not throw when reading the integration doc fails', async () => {
    getMock.mockRejectedValue(new Error('firestore down'));

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
