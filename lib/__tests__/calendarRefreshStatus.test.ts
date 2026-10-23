import { calendarRefreshStatus } from '../calendarRefreshStatus';

const LOADED = { itemsByDate: {}, notes: [] };

describe('calendarRefreshStatus', () => {
  it('is disabled while the first load is in flight', () => {
    expect(
      calendarRefreshStatus({ data: undefined, isError: false }, false),
    ).toBe('disabled');
  });

  it('stays enabled after a failed load, so the athlete can retry', () => {
    expect(
      calendarRefreshStatus({ data: undefined, isError: true }, false),
    ).toBe('idle');
  });

  it('is idle once data is loaded', () => {
    expect(calendarRefreshStatus({ data: LOADED, isError: false }, false)).toBe(
      'idle',
    );
  });

  it('is refreshing while a refresh the athlete asked for is in flight', () => {
    expect(calendarRefreshStatus({ data: LOADED, isError: false }, true)).toBe(
      'refreshing',
    );
    expect(
      calendarRefreshStatus({ data: undefined, isError: true }, true),
    ).toBe('refreshing');
  });
});
