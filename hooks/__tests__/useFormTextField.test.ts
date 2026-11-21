import { useForm } from 'react-hook-form';

import { type FormBinding, noServerErrorOnAnyField } from '../formBinding';
import { useFormTextField } from '../useFormTextField';
import { flushPromises } from '@/test-utils/settle';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

interface Values {
  email: string;
  password: string;
}

async function setup() {
  return renderHook(() => {
    const { control, setFocus } = useForm<Values>({
      defaultValues: { email: '', password: '' },
    });
    const form: FormBinding<Values> = {
      control,
      setFocus,
      busy: false,
      onFieldChange: () => {},
      serverError: noServerErrorOnAnyField,
    };

    return {
      email: useFormTextField({ form, name: 'email', next: 'password' }),
      password: useFormTextField({ form, name: 'password' }),
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
      await flushPromises();
    });

    expect(focusPassword).toHaveBeenCalledTimes(1);
    expect(focusEmail).not.toHaveBeenCalled();
  });

  it('shows a validation error over a server error on the same field', async () => {
    const hook = await renderHook(() => {
      const { control, setFocus, setError } = useForm<Values>({
        defaultValues: { email: '', password: '' },
      });
      const form: FormBinding<Values> = {
        control,
        setFocus,
        busy: false,
        onFieldChange: () => {},
        serverError: () => 'errors.emailTaken',
      };

      return { setError, email: useFormTextField({ form, name: 'email' }) };
    });

    expect(hook.result.current.email.error).toBe('errors.emailTaken');

    await act(async () => {
      hook.result.current.setError('email', { message: 'validation.email' });
    });

    expect(hook.result.current.email.error).toBe('validation.email');
  });

  it('leaves the last field without a next key', async () => {
    const hook = await setup();

    expect(hook.result.current.password.returnKeyType).toBeUndefined();
    expect(hook.result.current.password.onSubmitEditing).toBeUndefined();
  });
});
