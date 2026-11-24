import { isRouteKey } from './intervalsQueries';
import type { QueryKey, QueryStatus } from '@tanstack/react-query';

export interface RefreshCandidate {
  queryKey: QueryKey;
  state: { status: QueryStatus };
}

export function refreshIncludes({
  queryKey,
  state,
}: RefreshCandidate): boolean {
  return !(isRouteKey(queryKey) && state.status === 'success');
}
