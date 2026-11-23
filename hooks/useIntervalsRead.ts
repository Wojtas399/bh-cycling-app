import { type IntervalsScope, lacksScope } from './intervalsScopes';
import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from './useIntervalsAvailability';
import { useIntervalsConnection } from './useIntervalsConnection';
import { useRefetchQuery } from './useRefetchQuery';
import { useStableSelect } from './useStableSelect';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';
import {
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';

type ReadQueryOptions<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> = (
  credentials: IntervalsCredentials | null,
  ...args: Args
) => UseQueryOptions<TQueryFnData, DefaultError, TData, TQueryKey>;

type ReadSelect<TQueryFnData, TData, SelectArgs extends unknown[]> = (
  stored: TQueryFnData,
  ...selectArgs: SelectArgs
) => TData;

interface UnselectedRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> {
  queryOptions: ReadQueryOptions<Args, TQueryFnData, TData, TQueryKey>;
  args: Args;
  requiredScope?: IntervalsScope;
}

interface SelectedRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
> {
  queryOptions: ReadQueryOptions<
    [...Args, select: ReadSelect<TQueryFnData, TData, []>],
    TQueryFnData,
    TData,
    TQueryKey
  >;
  args: Args;
  select: ReadSelect<TQueryFnData, TData, SelectArgs>;
  selectArgs: SelectArgs;
  requiredScope?: IntervalsScope;
}

export interface IntervalsRead<TData> {
  availability: IntervalsAvailability;
  query: UseQueryResult<TData>;
  refetch: () => Promise<void>;
  lacksScope: boolean;
}

type ReadParts<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
> =
  | [
      kind: 'unselected',
      queryOptions: UnselectedRead<
        Args,
        TQueryFnData,
        TData,
        TQueryKey
      >['queryOptions'],
    ]
  | [
      kind: 'selected',
      queryOptions: SelectedRead<
        Args,
        TQueryFnData,
        TData,
        TQueryKey,
        SelectArgs
      >['queryOptions'],
      select: ReadSelect<TQueryFnData, TData, SelectArgs>,
      ...selectArgs: SelectArgs,
    ];

function readParts<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
>(
  read:
    | UnselectedRead<Args, TQueryFnData, TData, TQueryKey>
    | SelectedRead<Args, TQueryFnData, TData, TQueryKey, SelectArgs>,
): ReadParts<Args, TQueryFnData, TData, TQueryKey, SelectArgs> {
  return 'select' in read
    ? ['selected', read.queryOptions, read.select, ...read.selectArgs]
    : ['unselected', read.queryOptions];
}

function bindSelect<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
>(
  ...parts: ReadParts<Args, TQueryFnData, TData, TQueryKey, SelectArgs>
): ReadQueryOptions<Args, TQueryFnData, TData, TQueryKey> {
  if (parts[0] === 'unselected') return parts[1];

  const [, queryOptions, select, ...selectArgs] = parts;
  const selectStored = (stored: TQueryFnData) => select(stored, ...selectArgs);

  return (credentials, ...args) =>
    queryOptions(credentials, ...args, selectStored);
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
  const { scope } = useIntervalsConnection();
  const lacksRequiredScope =
    read.requiredScope !== undefined && lacksScope(scope, read.requiredScope);
  const queryOptions = useStableSelect(
    bindSelect<Args, TQueryFnData, TData, TQueryKey, SelectArgs>,
    ...readParts(read),
  );
  const options = queryOptions(
    lacksRequiredScope ? null : credentials,
    ...read.args,
  );
  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch, lacksScope: lacksRequiredScope };
}
