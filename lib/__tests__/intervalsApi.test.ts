import {
  IntervalsApiError,
  IntervalsAuthError,
  getActivities,
  getActivity,
  getActivityMap,
  getAthleteSettings,
  getCalendarEvent,
  getCalendarEvents,
  getWellness,
  getWellnessRange,
  isNotFoundError,
} from '../intervalsApi';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body));
}

function mockFetchOnce(response: Response) {
  jest.spyOn(global, 'fetch').mockResolvedValue(response);
}

describe('intervalsApi', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('getActivities constructs the correct URL and returns typed data on 200', async () => {
    const activities = [{ id: '1', name: 'Ride' }];

    mockFetchOnce(jsonResponse(activities));

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

    mockFetchOnce(jsonResponse(events));

    const result = await getCalendarEvents('token-1', 'athlete-1', {
      oldest: '2026-01-01',
    });

    expect(result).toEqual(events);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/athlete-1/events?oldest=2026-01-01',
      { headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it('getCalendarEvents sends the category as a query param', async () => {
    mockFetchOnce(jsonResponse([]));

    await getCalendarEvents('token-1', 'athlete-1', {
      oldest: '2026-09-22',
      newest: '2026-10-24',
      category: 'NOTE',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/athlete-1/events?oldest=2026-09-22&newest=2026-10-24&category=NOTE',
      { headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it('sends a multi-value param as one comma-joined value, the only form intervals.icu reads', async () => {
    mockFetchOnce(jsonResponse([]));

    await getCalendarEvents('token-1', 'athlete-1', {
      oldest: '2026-11-08',
      newest: '2026-12-08',
      category: ['RACE_A', 'RACE_B', 'RACE_C'],
    });

    const url = new URL(String(jest.mocked(global.fetch).mock.calls[0][0]));

    expect(Object.fromEntries(url.searchParams)).toEqual({
      oldest: '2026-11-08',
      newest: '2026-12-08',
      category: 'RACE_A,RACE_B,RACE_C',
    });
  });

  it("getAthleteSettings reads the token owner athlete's Ride power zones and FTP on 200", async () => {
    const athlete = {
      sportSettings: [
        { types: ['Run', 'TrailRun'], power_zones: [70, 85, 100], ftp: 320 },
        {
          types: ['Ride', 'VirtualRide', 'GravelRide'],
          power_zones: [55, 75, 90, 105, 120, 150, 999],
          ftp: 265,
        },
      ],
    };

    mockFetchOnce(jsonResponse(athlete));

    const result = await getAthleteSettings('token-1');

    expect(result).toEqual({
      powerZones: [55, 75, 90, 105, 120, 150, 999],
      ftp: 265,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/0',
      { headers: { Authorization: 'Bearer token-1' } },
    );
  });

  it.each([
    ['no sport settings', {}],
    [
      'no Ride sport settings',
      { sportSettings: [{ types: ['Run'], power_zones: [70, 85] }] },
    ],
  ])(
    'getAthleteSettings returns no power zones or FTP when the athlete has %s',
    async (_, athlete) => {
      mockFetchOnce(jsonResponse(athlete));

      expect(await getAthleteSettings('token-1')).toEqual({
        powerZones: undefined,
        ftp: undefined,
      });
    },
  );

  it.each([
    [
      'getActivities',
      (signal: AbortSignal) =>
        getActivities('token-1', 'athlete-1', undefined, { signal }),
    ],
    [
      'getCalendarEvents',
      (signal: AbortSignal) =>
        getCalendarEvents('token-1', 'athlete-1', undefined, { signal }),
    ],
    [
      'getAthleteSettings',
      (signal: AbortSignal) => getAthleteSettings('token-1', { signal }),
    ],
    [
      'getCalendarEvent',
      (signal: AbortSignal) =>
        getCalendarEvent('token-1', 'athlete-1', 42, { signal }),
    ],
    [
      'getActivity',
      (signal: AbortSignal) =>
        getActivity('token-1', 'i42', { intervals: true }, { signal }),
    ],
    [
      'getActivityMap',
      (signal: AbortSignal) => getActivityMap('token-1', 'i42', { signal }),
    ],
    [
      'getWellness',
      (signal: AbortSignal) =>
        getWellness('token-1', 'athlete-1', '2026-11-02', { signal }),
    ],
  ])('%s passes the abort signal through to fetch', async (_name, call) => {
    const controller = new AbortController();

    mockFetchOnce(jsonResponse([]));

    await call(controller.signal);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('throws IntervalsAuthError on a 401 response', async () => {
    mockFetchOnce(new Response(null, { status: 401 }));

    await expect(
      getActivities('bad-token', 'athlete-1'),
    ).rejects.toBeInstanceOf(IntervalsAuthError);
  });

  it('throws IntervalsApiError on any other non-2xx response', async () => {
    mockFetchOnce(new Response(null, { status: 500 }));

    await expect(getActivities('token-1', 'athlete-1')).rejects.toBeInstanceOf(
      IntervalsApiError,
    );
  });

  describe('getCalendarEvent', () => {
    it('reads a single event by id with the bearer token', async () => {
      const event = { id: 42, name: 'Sweet spot' };

      mockFetchOnce(jsonResponse(event));

      const result = await getCalendarEvent('token-1', 'athlete-1', 42);

      expect(result).toEqual(event);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://intervals.icu/api/v1/athlete/athlete-1/events/42',
        { headers: { Authorization: 'Bearer token-1' } },
      );
    });

    it('throws IntervalsAuthError on a 401 response', async () => {
      mockFetchOnce(new Response(null, { status: 401 }));

      await expect(
        getCalendarEvent('bad-token', 'athlete-1', 42),
      ).rejects.toBeInstanceOf(IntervalsAuthError);
    });

    it('throws IntervalsApiError carrying the status of a 404', async () => {
      mockFetchOnce(new Response(null, { status: 404 }));

      await expect(
        getCalendarEvent('token-1', 'athlete-1', 42),
      ).rejects.toMatchObject({ name: 'IntervalsApiError', status: 404 });
    });
  });

  describe('getActivity', () => {
    it('reads one Activity with its intervals and the bearer token', async () => {
      const activity = { id: 'i42', name: 'Morning ride', type: 'Ride' };

      mockFetchOnce(jsonResponse(activity));

      const result = await getActivity('token-1', 'i42', { intervals: true });

      expect(result).toEqual(activity);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://intervals.icu/api/v1/activity/i42?intervals=true',
        { headers: { Authorization: 'Bearer token-1' } },
      );
    });

    it('throws IntervalsAuthError on a 401 response', async () => {
      mockFetchOnce(new Response(null, { status: 401 }));

      await expect(getActivity('bad-token', 'i42')).rejects.toBeInstanceOf(
        IntervalsAuthError,
      );
    });

    it('throws IntervalsApiError carrying the status of a 404', async () => {
      mockFetchOnce(new Response(null, { status: 404 }));

      await expect(getActivity('token-1', 'i1')).rejects.toMatchObject({
        name: 'IntervalsApiError',
        status: 404,
      });
    });
  });

  describe('getActivityMap', () => {
    it("reads the Activity's map with the bearer token", async () => {
      const map = {
        latlngs: [
          [52.1, 21.0],
          [52.2, 21.1],
        ],
        bounds: [
          [52.1, 21.0],
          [52.2, 21.1],
        ],
      };

      mockFetchOnce(jsonResponse(map));

      const result = await getActivityMap('token-1', 'i42');

      expect(result).toEqual(map);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://intervals.icu/api/v1/activity/i42/map',
        { headers: { Authorization: 'Bearer token-1' } },
      );
    });

    it('throws IntervalsAuthError on a 401 response', async () => {
      mockFetchOnce(new Response(null, { status: 401 }));

      await expect(getActivityMap('bad-token', 'i42')).rejects.toBeInstanceOf(
        IntervalsAuthError,
      );
    });

    it('throws IntervalsApiError carrying the status of a 404', async () => {
      mockFetchOnce(new Response(null, { status: 404 }));

      await expect(getActivityMap('token-1', 'i42')).rejects.toMatchObject({
        name: 'IntervalsApiError',
        status: 404,
      });
    });
  });

  describe('getWellness', () => {
    it("reads one day's Wellness Entry with the bearer token", async () => {
      const entry = { id: '2026-11-02', sleepSecs: 28620, hrv: 52 };

      mockFetchOnce(jsonResponse(entry));

      const result = await getWellness('token-1', 'athlete-1', '2026-11-02');

      expect(result).toEqual(entry);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://intervals.icu/api/v1/athlete/athlete-1/wellness/2026-11-02',
        { headers: { Authorization: 'Bearer token-1' } },
      );
    });

    it('throws IntervalsAuthError on a 401 response', async () => {
      mockFetchOnce(new Response(null, { status: 401 }));

      await expect(
        getWellness('bad-token', 'athlete-1', '2026-11-02'),
      ).rejects.toBeInstanceOf(IntervalsAuthError);
    });

    it('throws IntervalsApiError carrying the status of a missing-scope 403', async () => {
      mockFetchOnce(new Response(null, { status: 403 }));

      await expect(
        getWellness('token-1', 'athlete-1', '2026-11-02'),
      ).rejects.toMatchObject({ name: 'IntervalsApiError', status: 403 });
    });
  });

  describe('getWellnessRange', () => {
    const RANGE = {
      oldest: '2025-11-07',
      newest: '2026-11-06',
      fields: ['id', 'ctl', 'atl', 'ctlLoad'],
    } as const;

    it('reads the Wellness rows of a date range, projected to the fields asked for', async () => {
      const rows = [{ id: '2026-11-06', ctl: 42.6, atl: 50.4, ctlLoad: 85 }];

      mockFetchOnce(jsonResponse(rows));

      const result = await getWellnessRange('token-1', 'athlete-1', RANGE);

      expect(result).toEqual(rows);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer token-1' },
        }),
      );

      const url = new URL(String(jest.mocked(global.fetch).mock.calls[0][0]));

      expect(`${url.origin}${url.pathname}`).toBe(
        'https://intervals.icu/api/v1/athlete/athlete-1/wellness',
      );
      expect(Object.fromEntries(url.searchParams)).toEqual({
        oldest: '2025-11-07',
        newest: '2026-11-06',
        fields: 'id,ctl,atl,ctlLoad',
      });
    });

    it('passes the abort signal through to fetch', async () => {
      const controller = new AbortController();

      mockFetchOnce(jsonResponse([]));

      await getWellnessRange('token-1', 'athlete-1', RANGE, {
        signal: controller.signal,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws IntervalsAuthError on a 401 response', async () => {
      mockFetchOnce(new Response(null, { status: 401 }));

      await expect(
        getWellnessRange('bad-token', 'athlete-1', RANGE),
      ).rejects.toBeInstanceOf(IntervalsAuthError);
    });

    it('throws IntervalsApiError carrying the status of a missing-scope 403', async () => {
      mockFetchOnce(new Response(null, { status: 403 }));

      await expect(
        getWellnessRange('token-1', 'athlete-1', RANGE),
      ).rejects.toMatchObject({ name: 'IntervalsApiError', status: 403 });
    });
  });
});

describe('isNotFoundError', () => {
  it('is true for an Intervals.icu 404', () => {
    expect(isNotFoundError(new IntervalsApiError(404))).toBe(true);
  });

  it('is false for any other Intervals.icu failure', () => {
    expect(isNotFoundError(new IntervalsApiError(500))).toBe(false);
    expect(isNotFoundError(new IntervalsAuthError())).toBe(false);
  });

  it('is false for errors that are not from Intervals.icu', () => {
    expect(isNotFoundError(new Error('Network request failed'))).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});
