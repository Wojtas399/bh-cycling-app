import type { FieldValues, Path } from 'react-hook-form';

import type { FormBinding } from '@/hooks/formBinding';
import { useFormTextField } from '@/hooks/useFormTextField';

export function useBoundFields<T extends FieldValues, N extends Path<T>>(
  form: FormBinding<T>,
  names: readonly N[],
) {
  const fields = {} as Record<N, ReturnType<typeof useFormTextField<T>>>;

  for (const name of names) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- callers pass the same names in the same order on every render
    fields[name] = useFormTextField({ form, name });
  }

  return fields;
}
