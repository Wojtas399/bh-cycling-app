import { type FieldValues, type Path, useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { FormBinding } from '@/hooks/formBinding';
import { isTranslationKey } from '@/lib/validation';

export interface UseFormTextFieldOptions<T extends FieldValues> {
  form: FormBinding<T>;
  name: Path<T>;
  /** Focus this field on the keyboard's `next` key. */
  next?: Path<T>;
}

export function useFormTextField<T extends FieldValues>({
  form,
  name,
  next,
}: UseFormTextFieldOptions<T>) {
  const { t } = useTranslation();
  const deps = form.deps?.[name];
  const { field, fieldState } = useController({
    control: form.control,
    name,
    rules: deps ? { deps } : undefined,
  });

  const validationError = fieldState.error?.message;

  return {
    ref: field.ref,
    value: typeof field.value === 'string' ? field.value : '',
    onChangeText: (text: string) => {
      field.onChange(text);
      form.onFieldChange();
    },
    onBlur: field.onBlur,
    // A validation error wins over a server error on the same field.
    error: validationError
      ? isTranslationKey(validationError)
        ? t(validationError)
        : validationError
      : form.serverError(name),
    editable: !form.busy,
    ...(next
      ? {
          returnKeyType: 'next' as const,
          submitBehavior: 'submit' as const,
          onSubmitEditing: () => form.setFocus(next),
        }
      : {}),
  };
}
