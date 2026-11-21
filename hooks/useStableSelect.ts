import { useMemo } from 'react';

export function useStableSelect<Args extends readonly unknown[], Select>(
  buildSelect: (...args: Args) => Select,
  ...args: Args
): Select {
  return useMemo(
    () => buildSelect(...args),
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo -- keyed on every argument, however many the select is built from
    [buildSelect, ...args],
  );
}
