import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from './useIntervalsAvailability';
import { useRefetchQuery } from './useRefetchQuery';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';
import {
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
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

interface SelectedRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
> {
  queryOptions: (
    credentials: IntervalsCredentials | null,
    ...args: [...Args, select: (stored: TQueryFnData) => TData]
  ) => ReadQueryOptions<TQueryFnData, TData, TQueryKey>;
  args: Args;
  select: (stored: TQueryFnData, ...selectArgs: SelectArgs) => TData;
  selectArgs: SelectArgs;
}

interface IntervalsRead<TData> {
  availability: IntervalsAvailability;
  query: UseQueryResult<TData>;
  refetch: () => Promise<void>;
}

export function useIntervalsRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
>(
  read: UnselectedRead<Args, TQueryFnData, TData, TQueryKey>,
): IntervalsRead<TData>;
export function useIntervalsRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
>(
  read: SelectedRead<Args, TQueryFnData, TData, TQueryKey, SelectArgs>,
): IntervalsRead<TData>;
export function useIntervalsRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
>(
  read:
    | UnselectedRead<Args, TQueryFnData, TData, TQueryKey>
    | SelectedRead<Args, TQueryFnData, TData, TQueryKey, SelectArgs>,
): IntervalsRead<TData> {
  const { availability, credentials } = useIntervalsAvailability();
  const options =
    'select' in read
      ? read.queryOptions(credentials, ...read.args, (stored: TQueryFnData) =>
          read.select(stored, ...read.selectArgs),
        )
      : read.queryOptions(credentials, ...read.args);
  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch };
}
