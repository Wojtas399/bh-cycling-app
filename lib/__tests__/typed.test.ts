import { entries, fromEntries, pick, readJson } from '../typed';

describe('typed', () => {
  it('rebuilds an object from its own entries', () => {
    const metrics = { load: 52, intensityPct: 71, label: 'tempo' };

    expect(entries(metrics)).toEqual([
      ['load', 52],
      ['intensityPct', 71],
      ['label', 'tempo'],
    ]);
    expect(fromEntries(entries(metrics))).toEqual(metrics);
  });

  it('picks only the listed keys the source has, leaving missing ones out', () => {
    const interval: { start_time?: number; end_time?: number; zone?: number } =
      { start_time: 0, zone: 3 };

    expect(pick(interval, ['start_time', 'end_time'])).toStrictEqual({
      start_time: 0,
    });
  });

  it('reads a response body as JSON, unparsed', async () => {
    const body = [{ id: 'i1', name: 'Morning ride', distance: 'not a number' }];

    await expect(
      readJson<{ id: string }[]>(new Response(JSON.stringify(body))),
    ).resolves.toEqual(body);
  });
});
