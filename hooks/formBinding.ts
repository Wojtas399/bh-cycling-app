import type {
  Control,
  FieldValues,
  Path,
  UseFormSetFocus,
} from 'react-hook-form';

export interface FormBinding<T extends FieldValues> {
  control: Control<T>;
  setFocus: UseFormSetFocus<T>;
  busy: boolean;
  onFieldChange: () => void;
  serverError: (name: Path<T>) => string;
  deps?: Partial<Record<Path<T>, Path<T>[]>>;
}

export function formErrorsOnly(): string {
  return '';
}
