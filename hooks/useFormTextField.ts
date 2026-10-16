import {
  type Control,
  type FieldValues,
  type Path,
  type UseFormSetFocus,
  useController,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { ParseKeys } from 'i18next';

/**
 * Everything a field needs from its form. A form hook builds one and hands it
 * to the screen, which passes it to every field unchanged.
 */
export interface FormBinding<T extends FieldValues> {
  control: Control<T>;
  setFocus: UseFormSetFocus<T>;
  /** Any of the form's mutations is pending. */
  busy: boolean;
  /** Runs on every edit; resets the form's mutations. */
  onFieldChange: () => void;
  /** The translated server error mapped to this field, if any. */
  serverError: (name: Path<T>) => string;
  /** Fields to re-validate when a field changes (cross-field rules). */
  deps?: Partial<Record<Path<T>, Path<T>[]>>;
}

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
    value: field.value as string,
    onChangeText: (text: string) => {
      field.onChange(text);
      form.onFieldChange();
    },
    onBlur: field.onBlur,
    // A validation error wins over a server error on the same field.
    error: validationError
      ? t(validationError as ParseKeys)
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
