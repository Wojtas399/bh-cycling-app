const pl = {
  common: {
    back: 'Wstecz',
    close: 'Zamknij',
  },
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
  verifyEmail: {
    title: 'Zweryfikuj adres e-mail',
    subtitle:
      'Wysłaliśmy wiadomość na adres {{email}}. Kliknij link w e-mailu, aby zweryfikować swoje konto.',
    verifiedButton: 'Już zweryfikowałem',
    resendButton: 'Wyślij ponownie ({{seconds}}s)',
    signOut: 'Wyloguj się',
    errors: {
      notVerified: 'Adres e-mail nie został jeszcze zweryfikowany.',
      networkFailed: 'Brak połączenia z internetem.',
      generic: 'Wystąpił błąd. Spróbuj ponownie.',
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
      subtitle: 'Link do resetowania hasła został wysłany na adres {{email}}.',
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
  tabs: {
    home: 'Główna',
    calendar: 'Kalendarz',
    settings: 'Ustawienia',
  },
  settings: {
    title: 'Ustawienia',
    account: {
      title: 'Konto',
      email: 'E-mail',
      signInMethod: 'Sposób logowania',
      signInMethods: {
        email: 'E-mail',
        google: 'Google',
        emailAndGoogle: 'E-mail i Google',
      },
      changePassword: 'Zmień hasło',
      deleteAccount: 'Usuń konto',
    },
    integrations: {
      title: 'Integracje',
    },
    about: {
      title: 'O aplikacji',
      version: 'Wersja',
      privacyPolicy: 'Polityka prywatności',
      termsOfService: 'Regulamin',
    },
    logout: {
      label: 'Wyloguj się',
      confirmTitle: 'Wylogować się?',
      confirmBody: 'Zostaniesz wylogowany z aplikacji.',
      confirmButton: 'Wyloguj',
      cancelButton: 'Anuluj',
    },
  },
  changePassword: {
    title: 'Zmień hasło',
    currentPassword: 'Obecne hasło',
    newPassword: 'Nowe hasło',
    confirmPassword: 'Potwierdź nowe hasło',
    submitButton: 'Zmień hasło',
    forgotPassword: 'Nie pamiętasz obecnego hasła?',
    success: {
      title: 'Hasło zostało zmienione',
    },
    reset: {
      confirmTitle: 'Wysłać link do resetowania hasła na {{email}}?',
      confirmButton: 'Wyślij',
      cancelButton: 'Anuluj',
      successTitle: 'Sprawdź skrzynkę',
      successBody:
        'Link do resetowania hasła został wysłany na adres {{email}}.',
    },
    errors: {
      currentPasswordInvalid: 'Obecne hasło jest nieprawidłowe.',
      weakPassword: 'Hasło jest za słabe.',
      tooManyRequests: 'Za dużo prób. Spróbuj ponownie później.',
      networkFailed: 'Brak połączenia z internetem.',
      generic: 'Wystąpił błąd. Spróbuj ponownie.',
    },
    validation: {
      currentPasswordRequired: 'Podaj obecne hasło.',
      newPasswordRequired: 'Podaj nowe hasło.',
      newPasswordTooShort: 'Hasło musi mieć co najmniej {{count}} znaków.',
      newPasswordSameAsCurrent: 'Nowe hasło musi różnić się od obecnego.',
      confirmPasswordRequired: 'Potwierdź nowe hasło.',
      passwordsMismatch: 'Hasła nie są zgodne.',
    },
  },
  deleteAccount: {
    title: 'Usuń konto',
    warningTitle: 'Tej operacji nie można cofnąć',
    consequences: {
      data: 'Twoje konto i wszystkie dane w aplikacji BH Cycling zostaną trwale usunięte.',
      intervals:
        'Połączenie z Intervals.icu zostanie odłączone. Twoje treningi i aktywności na Intervals.icu pozostaną nienaruszone.',
      irreversible:
        'Aby potwierdzić, musisz ponownie potwierdzić swoją tożsamość.',
    },
    password: 'Hasło',
    googleHint:
      'Po naciśnięciu przycisku poprosimy Cię o ponowne zalogowanie przez Google.',
    deleteButton: 'Usuń konto na zawsze',
    deleted: 'Konto zostało usunięte',
    errors: {
      passwordInvalid: 'Hasło jest nieprawidłowe.',
      wrongGoogleAccount:
        'Wybrano inne konto Google niż to, na którym jesteś zalogowany. Spróbuj ponownie.',
      reauthRequired:
        'Minęło zbyt dużo czasu od ostatniego potwierdzenia tożsamości. Potwierdź ją ponownie i spróbuj jeszcze raz.',
      generic: 'Nie udało się usunąć konta. Spróbuj ponownie.',
    },
    validation: {
      passwordRequired: 'Podaj hasło.',
    },
  },
  home: {
    upcomingWorkouts: {
      title: 'Nadchodzące treningi',
      empty: 'Brak zaplanowanych treningów na dziś i jutro.',
      today: 'Dziś',
      tomorrow: 'Jutro',
    },
  },
  calendar: {
    monthly: 'Miesięczny',
    weekly: 'Tygodniowy',
    previous: 'Poprzedni',
    next: 'Następny',
    refresh: 'Odśwież',
    error: 'Nie udało się wczytać kalendarza.',
    emptyDay: 'Brak treningów w tym dniu.',
    monthNames: [
      'Styczeń',
      'Luty',
      'Marzec',
      'Kwiecień',
      'Maj',
      'Czerwiec',
      'Lipiec',
      'Sierpień',
      'Wrzesień',
      'Październik',
      'Listopad',
      'Grudzień',
    ],
    /** Month names as they read after a day number: "5 października". */
    monthNamesGenitive: [
      'stycznia',
      'lutego',
      'marca',
      'kwietnia',
      'maja',
      'czerwca',
      'lipca',
      'sierpnia',
      'września',
      'października',
      'listopada',
      'grudnia',
    ],
    /** Monday first, matching the grid's columns. */
    weekdays: [
      'Poniedziałek',
      'Wtorek',
      'Środa',
      'Czwartek',
      'Piątek',
      'Sobota',
      'Niedziela',
    ],
    weekdaysShort: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'],
  },
  intervals: {
    title: 'Intervals.icu',
    connectButton: 'Połącz',
    disconnectButton: 'Rozłącz',
    connectedAs: 'Połączono jako {{name}}',
    connected: 'Połączono z Intervals.icu',
    disconnectConfirmTitle: 'Rozłączyć Intervals.icu?',
    disconnectConfirmBody:
      'Twoje konto Intervals.icu zostanie odłączone od aplikacji.',
    disconnectConfirmButton: 'Rozłącz',
    disconnectCancelButton: 'Anuluj',
    errors: {
      exchangeFailed:
        'Nie udało się połączyć z Intervals.icu. Spróbuj ponownie.',
      disconnectFailed:
        'Nie udało się rozłączyć konta Intervals.icu. Spróbuj ponownie.',
    },
    reconnectBanner: {
      message: 'Połączenie z Intervals.icu wygasło.',
      action: 'Połącz ponownie',
    },
  },
} as const;

export default pl;
