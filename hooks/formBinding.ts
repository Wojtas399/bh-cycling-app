import type {
  Control,
  FieldValues,
  Path,
  UseFormSetFocus,
} from 'react-hook-form';

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
