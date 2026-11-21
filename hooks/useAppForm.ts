import { type FieldValues, type UseFormProps, useForm } from 'react-hook-form';

import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import type * as v from 'valibot';

type FixedOptions = 'resolver' | 'mode' | 'reValidateMode' | 'shouldFocusError';

export function useAppForm<Input extends FieldValues, Output>(
  schema: v.GenericSchema<Input, Output>,
  options: Omit<UseFormProps<Input, unknown, Output>, FixedOptions> = {},
) {
  return useForm<Input, unknown, Output>({
    ...options,
    resolver: standardSchemaResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
  });
}
