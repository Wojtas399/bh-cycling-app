const pl = {
  signUp: {
    title: 'Utwórz konto',
    subtitle: 'Zarejestruj się, aby zacząć',
    email: 'E-mail',
    password: 'Hasło',
    confirmPassword: 'Potwierdź hasło',
    signUpButton: 'Zarejestruj się',
    or: 'lub',
    signUpWithGoogle: 'Zarejestruj się przez Google',
    hasAccount: 'Masz już konto? Zaloguj się',
    errors: {
      emailAlreadyInUse: 'Ten adres e-mail jest już zajęty.',
      invalidEmail: 'Podaj prawidłowy adres e-mail.',
      weakPassword: 'Hasło jest za słabe.',
      networkFailed: 'Brak połączenia z internetem.',
      generic: 'Wystąpił błąd. Spróbuj ponownie.',
      googleFailed: 'Rejestracja przez Google nie powiodła się.',
    },
    validation: {
      emailRequired: 'Podaj adres e-mail.',
      emailInvalid: 'Podaj prawidłowy adres e-mail.',
      passwordRequired: 'Podaj hasło.',
      passwordTooShort: 'Hasło musi mieć co najmniej 8 znaków.',
      confirmPasswordRequired: 'Potwierdź hasło.',
      passwordsMismatch: 'Hasła nie są zgodne.',
    },
  },
  signIn: {
    title: 'Zaloguj się',
    email: 'E-mail',
    password: 'Hasło',
    forgotPassword: 'Zapomniałeś hasła?',
    signInButton: 'Zaloguj się',
    or: 'lub',
    signInWithGoogle: 'Zaloguj się przez Google',
    noAccount: 'Nie masz konta? Zarejestruj się',
    errors: {
      invalidCredential: 'Nieprawidłowy e-mail lub hasło.',
      invalidEmail: 'Podaj prawidłowy adres e-mail.',
      tooManyRequests: 'Za dużo prób logowania. Spróbuj ponownie później.',
      networkFailed: 'Brak połączenia z internetem.',
      generic: 'Wystąpił błąd. Spróbuj ponownie.',
    },
    validation: {
      emailRequired: 'Podaj adres e-mail.',
      emailInvalid: 'Podaj prawidłowy adres e-mail.',
      passwordRequired: 'Podaj hasło.',
      googleFailed: 'Logowanie przez Google nie powiodło się.',
    },
  },
  forgotPassword: {
    title: 'Zapomniałeś hasła',
    subtitle:
      'Wpisz swój adres e-mail, a wyślemy Ci instrukcje resetowania hasła.',
    email: 'E-mail',
    sendButton: 'Wyślij link resetujący',
    rememberPassword: 'Pamiętasz hasło? Zaloguj się',
    success: {
      title: 'Sprawdź skrzynkę',
      subtitle:
        'Wysłaliśmy instrukcje resetowania hasła na podany adres e-mail.',
      backToSignIn: 'Wróć do logowania',
      resendButton: 'Wyślij ponownie',
    },
    errors: {
      invalidEmail: 'Podaj prawidłowy adres e-mail.',
      userNotFound: 'Nie znaleziono konta z tym adresem e-mail.',
      tooManyRequests: 'Za dużo prób. Spróbuj ponownie później.',
      networkFailed: 'Brak połączenia z internetem.',
      generic: 'Wystąpił błąd. Spróbuj ponownie.',
    },
    validation: {
      emailRequired: 'Podaj adres e-mail.',
      emailInvalid: 'Podaj prawidłowy adres e-mail.',
    },
  },
} as const;

export default pl;
