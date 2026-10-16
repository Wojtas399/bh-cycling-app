import type { FieldValues } from 'react-hook-form';

import FormField from '@/components/FormField';
import {
  type UseFormTextFieldOptions,
  useFormTextField,
} from '@/hooks/useFormTextField';

type FormTextFieldProps<T extends FieldValues> = UseFormTextFieldOptions<T> &
  Omit<
    React.ComponentProps<typeof FormField>,
    'value' | 'onChangeText' | 'onBlur' | 'error' | 'editable' | 'ref'
  >;

export default function FormTextField<T extends FieldValues>({
  form,
  name,
  next,
  ...props
}: FormTextFieldProps<T>) {
  const bound = useFormTextField({ form, name, next });

  return <FormField {...props} {...bound} />;
}
