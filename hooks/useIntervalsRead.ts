import { type IntervalsScope, lacksScope } from './intervalsScopes';
import {
  type IntervalsAvailability,
  useIntervalsAvailability,
} from './useIntervalsAvailability';
import { useIntervalsConnection } from './useIntervalsConnection';
import { useRefetchQuery } from './useRefetchQuery';
import { useStableSelect } from './useStableSelect';
import { bindSelectArgs } from '@/lib/bindSelectArgs';
import type { IntervalsCredentials } from '@/lib/intervalsQueries';
import {
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';

type QueryOptionsFactory<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> = (
  credentials: IntervalsCredentials | null,
  ...args: Args
) => UseQueryOptions<TQueryFnData, DefaultError, TData, TQueryKey>;

type SelectingQueryOptionsFactory<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> = QueryOptionsFactory<
  [...Args, select: (stored: TQueryFnData) => TData],
  TQueryFnData,
  TData,
  TQueryKey
>;

type StoredSelect<TQueryFnData, TData, SelectArgs extends unknown[]> = (
  stored: TQueryFnData,
  ...selectArgs: SelectArgs
) => TData;

interface UnselectedRead<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
> {
  queryOptions: QueryOptionsFactory<Args, TQueryFnData, TData, TQueryKey>;
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
  queryOptions: SelectingQueryOptionsFactory<
    Args,
    TQueryFnData,
    TData,
    TQueryKey
  >;
  args: Args;
  select: StoredSelect<TQueryFnData, TData, SelectArgs>;
  selectArgs: SelectArgs;
  requiredScope?: IntervalsScope;
}

export interface IntervalsRead<TData> {
  availability: IntervalsAvailability;
  query: UseQueryResult<TData>;
  refetch: () => Promise<void>;
  lacksScope: boolean;
}

type SelectBinding<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
> =
  | [
      kind: 'unselected',
      queryOptions: QueryOptionsFactory<Args, TQueryFnData, TData, TQueryKey>,
    ]
  | [
      kind: 'selected',
      queryOptions: SelectingQueryOptionsFactory<
        Args,
        TQueryFnData,
        TData,
        TQueryKey
      >,
      select: StoredSelect<TQueryFnData, TData, SelectArgs>,
      ...selectArgs: SelectArgs,
    ];

function selectBindingOf<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
>(
  read:
    | UnselectedRead<Args, TQueryFnData, TData, TQueryKey>
    | SelectedRead<Args, TQueryFnData, TData, TQueryKey, SelectArgs>,
): SelectBinding<Args, TQueryFnData, TData, TQueryKey, SelectArgs> {
  return 'select' in read
    ? ['selected', read.queryOptions, read.select, ...read.selectArgs]
    : ['unselected', read.queryOptions];
}

function bindSelectToQueryOptions<
  Args extends unknown[],
  TQueryFnData,
  TData,
  TQueryKey extends QueryKey,
  SelectArgs extends unknown[],
>(
  ...binding: SelectBinding<Args, TQueryFnData, TData, TQueryKey, SelectArgs>
): QueryOptionsFactory<Args, TQueryFnData, TData, TQueryKey> {
  if (binding[0] === 'unselected') return binding[1];

  const [, queryOptions, select, ...selectArgs] = binding;
  const selectStored = bindSelectArgs(select, ...selectArgs);

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
  const queryOptionsWithStableSelect = useStableSelect(
    bindSelectToQueryOptions,
    ...selectBindingOf(read),
  );
  const options = queryOptionsWithStableSelect(
    lacksRequiredScope ? null : credentials,
    ...read.args,
  );
  const query = useQuery(options);
  const refetch = useRefetchQuery(options.queryKey);

  return { availability, query, refetch, lacksScope: lacksRequiredScope };
}
