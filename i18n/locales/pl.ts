const pl = {
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
} as const;

export default pl;
