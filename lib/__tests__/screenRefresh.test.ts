import { intervalsKeys } from '../intervalsQueries';
import { refreshIncludes } from '../screenRefresh';
import type { QueryKey, QueryStatus } from '@tanstack/react-query';

const ATHLETE_ID = 'athlete-1';

function query(queryKey: QueryKey, status: QueryStatus) {
  return { queryKey, state: { status } };
}

describe('refreshIncludes', () => {
  it('leaves out a Route that has loaded, since a recorded GPS track does not change', () => {
    expect(
      refreshIncludes(query(intervalsKeys.route(ATHLETE_ID, 'i42'), 'success')),
    ).toBe(false);
  });

  it.each<[string, QueryStatus]>([
    ['failed', 'error'],
    ['pending', 'pending'],
  ])('includes a %s Route', (_, status) => {
    expect(
      refreshIncludes(query(intervalsKeys.route(ATHLETE_ID, 'i42'), status)),
    ).toBe(true);
  });

  it('includes a query that is not a Route whatever its status', () => {
    const queryKey = intervalsKeys.workout(ATHLETE_ID, 7);
    const statuses: QueryStatus[] = ['success', 'error', 'pending'];

    expect(
      statuses.map(status => refreshIncludes(query(queryKey, status))),
    ).toEqual([true, true, true]);
  });
});
