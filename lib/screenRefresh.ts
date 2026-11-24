import { intervalsKeys } from './intervalsQueries';
import {
  type QueryKey,
  type QueryStatus,
  partialMatchKey,
} from '@tanstack/react-query';

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

function isRouteKey(queryKey: QueryKey): boolean {
  const [, athleteId] = queryKey;

  return (
    typeof athleteId === 'string' &&
    partialMatchKey(queryKey, intervalsKeys.routes(athleteId))
  );
}
