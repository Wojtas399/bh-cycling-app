import type { FieldValues, Path } from 'react-hook-form';

import type { FormBinding } from '@/hooks/formBinding';
import { useFormTextField } from '@/hooks/useFormTextField';

/**
 * Binds each named field the way `FormTextField` does, so a hook test types
 * into fields and reads their errors. Call inside a `renderHook` callback with
 * the same names in the same order on every render.
 */
export function useBoundFields<T extends FieldValues, N extends Path<T>>(
  form: FormBinding<T>,
  names: readonly N[],
) {
  const fields = {} as Record<N, ReturnType<typeof useFormTextField<T>>>;

  for (const name of names) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed list
    fields[name] = useFormTextField({ form, name });
  }

  return fields;
}
