import { useForm } from 'react-hook-form';

import type { FormBinding } from '../formBinding';
import { useFormTextField } from '../useFormTextField';
import '@/i18n';
import { act, renderHook } from '@testing-library/react-native';

interface Values {
  email: string;
  password: string;
  age: number;
}

async function setup() {
  return renderHook(() => {
    const { control, setFocus, setError } = useForm<Values>({
      defaultValues: { email: 'rider@example.com', password: '', age: 30 },
    });
    const form: FormBinding<Values> = {
      control,
      setFocus,
      busy: false,
      onFieldChange: () => {},
      serverError: () => '',
    };

    return {
      setError,
      email: useFormTextField({ form, name: 'email', next: 'password' }),
      password: useFormTextField({ form, name: 'password' }),
      age: useFormTextField({ form, name: 'age' }),
    };
  });
}

describe('useFormTextField', () => {
  it('focuses the next field on the keyboard next key', async () => {
    const hook = await setup();
    const focusEmail = jest.fn();
    const focusPassword = jest.fn();

    await act(async () => {
      hook.result.current.email.ref({ focus: focusEmail });
      hook.result.current.password.ref({ focus: focusPassword });
    });

    expect(hook.result.current.email.returnKeyType).toBe('next');

    await act(async () => {
      hook.result.current.email.onSubmitEditing?.();
      // RHF focuses on the next tick.
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(focusPassword).toHaveBeenCalledTimes(1);
    expect(focusEmail).not.toHaveBeenCalled();
  });

  it('leaves the last field without a next key', async () => {
    const hook = await setup();

    expect(hook.result.current.password.returnKeyType).toBeUndefined();
    expect(hook.result.current.password.onSubmitEditing).toBeUndefined();
  });

  it('shows the text a field holds', async () => {
    const hook = await setup();

    expect(hook.result.current.email.value).toBe('rider@example.com');
  });

  it('shows no text for a field whose value is not a string', async () => {
    const hook = await setup();

    expect(hook.result.current.age.value).toBe('');
  });

  it('translates a validation message that is a translation key', async () => {
    const hook = await setup();

    await act(async () => {
      hook.result.current.setError('email', {
        message: 'validation.emailInvalid',
      });
    });

    expect(hook.result.current.email.error).toBe(
      'Podaj prawidłowy adres e-mail.',
    );
  });

  it('shows a validation message that is not a translation key as written', async () => {
    const hook = await setup();

    await act(async () => {
      hook.result.current.setError('email', { message: 'Not a key' });
    });

    expect(hook.result.current.email.error).toBe('Not a key');
  });
});
