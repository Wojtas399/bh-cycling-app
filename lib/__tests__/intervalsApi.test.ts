import {
  IntervalsApiError,
  IntervalsAuthError,
  getActivities,
  getAthleteSettings,
  getCalendarEvents,
} from '../intervalsApi';

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
}) {
  global.fetch = jest
    .fn()
    .mockResolvedValue(response) as unknown as typeof fetch;
}

describe('intervalsApi', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getActivities constructs the correct URL and returns typed data on 200', async () => {
    const activities = [{ id: '1', name: 'Ride' }];

    mockFetchOnce({ ok: true, status: 200, json: async () => activities });

    const result = await getActivities('token-1', 'athlete-1', {
      oldest: '2026-01-01',
      newest: '2026-01-31',
    });

    expect(result).toEqual(activities);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/athlete-1/activities?oldest=2026-01-01&newest=2026-01-31',
      { headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it('getCalendarEvents constructs the correct URL and returns typed data on 200', async () => {
    const events = [{ id: 1, name: 'Planned ride' }];

    mockFetchOnce({ ok: true, status: 200, json: async () => events });

    const result = await getCalendarEvents('token-1', 'athlete-1', {
      oldest: '2026-01-01',
    });

    expect(result).toEqual(events);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/athlete-1/events?oldest=2026-01-01',
      { headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it('getAthleteSettings reads the token owner athlete and returns typed data on 200', async () => {
    const settings = { powerZones: [55, 75, 90, 105, 120, 150, 200] };

    mockFetchOnce({ ok: true, status: 200, json: async () => settings });

    const result = await getAthleteSettings('token-1');

    expect(result).toEqual(settings);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/0',
      { headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it('throws IntervalsAuthError on a 401 response', async () => {
    mockFetchOnce({ ok: false, status: 401 });

    await expect(
      getActivities('bad-token', 'athlete-1'),
    ).rejects.toBeInstanceOf(IntervalsAuthError);
  });

  it('throws IntervalsApiError on any other non-2xx response', async () => {
    mockFetchOnce({ ok: false, status: 500 });

    await expect(getActivities('token-1', 'athlete-1')).rejects.toBeInstanceOf(
      IntervalsApiError,
    );
  });
});
