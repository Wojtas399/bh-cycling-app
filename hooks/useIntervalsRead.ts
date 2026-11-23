import { useIntervalsAvailability } from './useIntervalsAvailability';
import { useRefetchQuery } from './useRefetchQuery';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';
import {
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
  useQuery,
} from '@tanstack/react-query';

type ReadQueryOptions<
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> = UseQueryOptions<TQueryFnData, DefaultError, TData, TQueryKey>;

interface UnselectedRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> {
  queryOptions: (
    credentials: IntervalsCredentials | null,
    ...args: Args
  ) => ReadQueryOptions<TQueryFnData, TData, TQueryKey>;
  args: Args;
}

export function useIntervalsRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
>(read: UnselectedRead<Args, TQueryFnData, TData, TQueryKey>) {
  const { availability, credentials } = useIntervalsAvailability();
  const options = read.queryOptions(credentials, ...read.args);
  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
