import { revokeIntervalsToken } from '../revokeToken';

const getMock = jest.fn();
const docMock = jest.fn(() => ({ get: getMock }));
const fetchMock = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: docMock }),
}));

function mockIntegration(data: { accessToken: string } | undefined) {
  getMock.mockResolvedValue({ exists: data !== undefined, data: () => data });
}

describe('revokeIntervalsToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('calls disconnect-app with the stored token as bearer', async () => {
    mockIntegration({ accessToken: 'token-1' });

    await revokeIntervalsToken('user-1');

    expect(docMock).toHaveBeenCalledWith('users/user-1/integrations/intervals');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/disconnect-app',
      { method: 'DELETE', headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it('does nothing when there is no integration doc', async () => {
    mockIntegration(undefined);

    await revokeIntervalsToken('user-1');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats 401 as already disconnected', async () => {
    mockIntegration({ accessToken: 'token-1' });
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
  });

  it('does not throw on other HTTP failures', async () => {
    mockIntegration({ accessToken: 'token-1' });
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
  });

  it('does not throw on network failure', async () => {
    mockIntegration({ accessToken: 'token-1' });
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
  });

  it('does not throw when reading the integration doc fails', async () => {
    getMock.mockRejectedValue(new Error('firestore down'));

    await expect(revokeIntervalsToken('user-1')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
