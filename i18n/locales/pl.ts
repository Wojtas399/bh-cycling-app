const pl = {
  common: {
    back: 'Wstecz',
    /** The button out of a screen with nothing to show. */
    goBack: 'Wróć',
    close: 'Zamknij',
    showPassword: 'Pokaż hasło',
    hidePassword: 'Ukryj hasło',
    /** A Strava Activity's label: intervals.icu doesn't share its name. */
    stravaActivity: 'Aktywność ze Stravy',
  },
  // Validation messages shared across forms (ADR 0006).
  validation: {
    emailRequired: 'Podaj adres e-mail.',
    emailInvalid: 'Podaj prawidłowy adres e-mail.',
    passwordRequired: 'Podaj hasło.',
    passwordTooShort:
      'Hasło musi mieć co najmniej {{minPasswordLength}} znaków.',
    passwordsMismatch: 'Hasła nie są zgodne.',
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
      confirmPasswordRequired: 'Potwierdź hasło.',
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
      /** The Version row's subtitle on a downloaded OTA update. */
      update: 'Aktualizacja {{id}} · {{date}}',
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
      newPasswordSameAsCurrent: 'Nowe hasło musi różnić się od obecnego.',
      confirmPasswordRequired: 'Potwierdź nowe hasło.',
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
  },
  /** Fitness, Fatigue and Form: Home's Fitness card and the chart share these. */
  fitness: {
    /** Labels, by `FitnessDay` key. */
    labels: {
      fitness: 'Fitness',
      fatigue: 'Zmęczenie',
      form: 'Forma',
      load: 'Obciążenie',
    },
    /** The screen-reader label while the values load. */
    loading: 'Wczytywanie Fitness',
    /** The Home card on a day without values. */
    noValueToday: 'Brak danych na dziś.',
    /** The Home card's link to the chart screen. */
    seeMore: 'Zobacz więcej',
    /** The Home card's screen-reader button label: its values and where it leads. */
    cardLabel:
      'Fitness {{fitness}}, Zmęczenie {{fatigue}}, Forma {{form}}. Otwiera ekran Fitness i zmęczenie',
    /** The same on a day without values. */
    cardLabelNoValue: 'Brak danych na dziś. Otwiera ekran Fitness i zmęczenie',
    chart: {
      title: 'Fitness i zmęczenie',
      /** The readout's date for today. */
      today: 'Dziś',
      /** By `FitnessRange`. */
      ranges: {
        '6w': '6 tygodni',
        '3m': '3 miesiące',
        '1y': 'rok',
      },
      /** No day in the year has values. */
      empty: 'Brak danych Fitness z Intervals.icu.',
      error: 'Nie udało się wczytać danych Fitness.',
      retry: 'Spróbuj ponownie',
    },
  },
  home: {
    wellness: {
      title: 'Wellness',
      /** The loading card's screen-reader label. */
      loading: 'Wczytywanie Wellness',
      empty: 'Brak danych na dziś.',
      /** Row labels, by `WellnessRow` key. */
      rows: {
        readiness: 'Gotowość',
        sleep: 'Sen',
        sleepScore: 'Ocena snu',
        hrv: 'HRV',
        hrvSdnn: 'HRV (SDNN)',
        restingHr: 'Tętno spocz.',
      },
    },
    /** The next-race card at the top of Home. */
    nextRace: {
      eyebrow: 'Następny wyścig',
      /** The countdown as drawn: "Dziś", "Jutro", else the number over "dni". */
      today: 'Dziś',
      tomorrow: 'Jutro',
      days: 'dni',
      /** The card's screen-reader label; `when` is one of `when.*`. */
      accessibilityLabel:
        'Najbliższy wyścig: {{priority}}, {{name}}, {{when}}. Otwiera szczegóły wyścigu',
      when: {
        today: 'dziś',
        tomorrow: 'jutro',
        /** Every count but 1 takes "dni", and 1 is "jutro". */
        days: 'za {{days}} dni',
      },
    },
    upcomingWorkouts: {
      title: 'Dziś i jutro',
      empty: 'Brak treningów i aktywności na dziś i jutro.',
      today: 'Dziś',
      tomorrow: 'Jutro',
    },
  },
  note: {
    /** The title of a Note without a name. */
    untitled: 'Notatka',
    empty: 'Brak treści',
    /** A Note button's screen-reader label. */
    accessibilityLabel: 'Notatka: {{title}}, {{when}}',
    /** Monday first, like the Calendar's weekdays. */
    weekdaysShort: ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'niedz.'],
    monthsShort: [
      'sty',
      'lut',
      'mar',
      'kwi',
      'maj',
      'cze',
      'lip',
      'sie',
      'wrz',
      'paź',
      'lis',
      'gru',
    ],
  },
  noteDetails: {
    notFound: {
      title: 'Notatka nie istnieje',
      body: 'Ta notatka mogła zostać usunięta z Intervals.icu.',
    },
    error: 'Nie udało się wczytać notatki.',
    retry: 'Spróbuj ponownie',
    loading: 'Wczytywanie notatki',
  },
  race: {
    /** A Race Priority as shown and spoken: "Wyścig A". */
    priority: 'Wyścig {{priority}}',
    /** Read on a paired Race's tile: "Wyścig A: {name}, {sport}, ukończony, …". */
    completed: 'ukończony',
    /** The Race Detail Sheet's rows. */
    sport: 'Sport',
    date: 'Termin',
    duration: 'Planowany czas',
    distance: 'Planowany dystans',
  },
  /** An Activity's sport, by `sportLabel(type)`. */
  sport: {
    ride: 'Jazda rowerem',
    run: 'Bieg',
    walk: 'Marsz',
    swim: 'Pływanie',
    strength: 'Trening siłowy',
    rowing: 'Wiosłowanie',
    winter: 'Sporty zimowe',
    yoga: 'Joga i pilates',
    /** A sport `sportLabel` doesn't know. */
    other: 'Aktywność',
  },
  activityTile: {
    load: 'Obciążenie {{load}}',
  },
  calendar: {
    monthly: 'Miesięczny',
    weekly: 'Tygodniowy',
    previous: 'Poprzedni',
    next: 'Następny',
    /** The header pill that goes back to today's month or week. */
    today: 'Dziś',
    refresh: 'Odśwież',
    error: 'Nie udało się wczytać kalendarza.',
    emptyDay: 'Brak treningów w tym dniu.',
    /** The day sheet's section of Note cards. */
    notes: 'Notatki',
    /** A month-grid day's screen-reader summary, after the day's label. */
    dayCounts: {
      /** A lone Race; several read as `races`, never "1 wyścig: A". */
      race: 'wyścig {{priority}}',
      races_few: '{{count}} wyścigi: {{priorities}}',
      races_many: '{{count}} wyścigów: {{priorities}}',
      races_other: '{{count}} wyścigu: {{priorities}}',
      workouts_one: '{{count}} trening',
      workouts_few: '{{count}} treningi',
      workouts_many: '{{count}} treningów',
      workouts_other: '{{count}} treningu',
      activities_one: '{{count}} aktywność',
      activities_few: '{{count}} aktywności',
      activities_many: '{{count}} aktywności',
      activities_other: '{{count}} aktywności',
      notes_one: '{{count}} notatka',
      notes_few: '{{count}} notatki',
      notes_many: '{{count}} notatek',
      notes_other: '{{count}} notatki',
    },
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
  workoutDetails: {
    title: 'Trening',
    status: {
      planned: 'Zaplanowany',
      missed: 'Pominięty',
      completed: 'Wykonany',
    },
    missedBanner:
      'Ten trening nie został wykonany — brak sparowanej aktywności.',
    profileLabel:
      'Profil treningu: {{duration}}, {{steps}}, maks. {{peak}}% FTP. {{power}}',
    /**
     * A profile strip's power, the last sentence of its label: in watts, or
     * in %FTP when the strip has no FTP.
     */
    profilePower: {
      watts: 'Moc szczytowa {{peak}} W, średnia {{average}} W',
      ftpPct: 'Moc szczytowa {{peak}}% FTP, średnia {{average}}% FTP',
    },
    /** The plan above the recorded Activity Profile, in one card. */
    comparedProfilesLabel: 'Plan i wykonanie. {{planned}}. {{recorded}}',
    /** Captions over the two strips of a completed Workout's profile card. */
    strip: {
      planned: 'Plan',
      recorded: 'Wykonanie',
    },
    /** The scrub readout under the profile card. */
    readout: {
      /** Hides the scrub pointer and the readout. */
      hide: 'Ukryj',
    },
    /** The time-in-zone rows under the profile card. */
    timeInZone: {
      /** A row as a screen reader reads it, on a card with one strip. */
      row: 'Strefa {{zone}}: {{time}}',
      /** A row with the plan's time and the ride's. */
      comparedRow: 'Strefa {{zone}}: plan {{planned}}, wykonanie {{recorded}}',
      /** Says which bar and time is which when a row has both, as "40m / 38m". */
      legend: 'Plan (blady pasek) / wykonanie',
    },
    steps_one: '{{count}} krok',
    steps_few: '{{count}} kroki',
    steps_many: '{{count}} kroków',
    steps_other: '{{count}} kroku',
    kroki: {
      title: 'Kroki',
      step: 'Krok',
      warmup: 'Rozgrzewka',
      cooldown: 'Schłodzenie',
      repeat: '{{reps}}× powtórz',
      repeatWithTotal: '{{reps}}× powtórz · łącznie {{total}}',
    },
    notFound: {
      title: 'Trening nie istnieje',
      body: 'Ten trening mógł zostać usunięty z Intervals.icu.',
    },
    error: 'Nie udało się wczytać treningu.',
    retry: 'Spróbuj ponownie',
    loading: 'Wczytywanie treningu',
    /** The full-screen map of a Workout with no Route. */
    routeMissing: 'Ten trening nie ma zapisanej trasy.',
    comparison: {
      title: 'Plan vs wykonanie',
      titleWithCompliance: 'Plan vs wykonanie · zgodność {{compliance}}%',
      planned: 'Plan',
      actual: 'Wykonanie',
      difference: 'Różnica',
      metrics: {
        duration: 'Czas',
        load: 'Obciążenie',
        intensity: 'Intensywność',
        work: 'Praca',
      },
    },
    activity: {
      title: 'Wykonanie',
      metrics: {
        movingTime: 'Czas jazdy',
        distance: 'Dystans',
        load: 'Obciążenie',
        intensity: 'Intensywność',
        averagePower: 'Śr. moc',
        normalizedPower: 'NP',
        averageHeartRate: 'Śr. tętno',
        maxHeartRate: 'Maks. tętno',
        cadence: 'Kadencja',
        elevationGain: 'Przewyższenie',
        calories: 'Kalorie',
        averageSpeed: 'Śr. prędkość',
        elapsedTime: 'Czas całkowity',
        variabilityIndex: 'VI',
      },
    },
    /** Wykonanie for a Workout completed by a Strava Activity. */
    stravaActivity: {
      title: 'Wykonanie',
      startTime: 'Rozpoczęta o {{time}}',
      noData:
        'Intervals.icu nie udostępnia danych aktywności ze Stravy, więc nie ma tu czasu, mocy ani tętna.',
      openOnStrava: 'Zobacz na Stravie',
    },
    plan: {
      title: 'Plan',
      duration: 'Czas',
      load: 'Obciążenie',
      intensity: 'Intensywność',
      work: 'Praca',
      distance: 'Dystans',
    },
    description: 'Opis',
  },
  /** An Activity's Route, shared by Workout Details and Activity Details. */
  route: {
    /** The banner at the top of a details screen. */
    title: 'Trasa',
    titleWithDistance: 'Trasa, {{distance}}',
    showMap: 'Pokaż mapę',
    pill: '{{distance}} · Pokaż mapę',
    hint: 'Otwiera mapę na pełnym ekranie',
    error: 'Nie udało się wczytać trasy.',
    retry: 'Spróbuj ponownie',
    loading: 'Wczytywanie trasy',
    /** The full-screen Route map. */
    map: {
      label: 'Mapa trasy',
      labelWithDistance: 'Mapa trasy, {{distance}}',
      distance: 'Dystans',
      start: 'Start',
      finish: 'Meta',
      chip: '{{label}}, {{value}}',
      attribution: 'Informacje o mapie',
    },
  },
  activityDetails: {
    title: 'Aktywność',
    /** The Race header's screen-reader label: "Wyścig A: {name}. Otwiera …". */
    raceHeader: '{{priority}}: {{name}}. Otwiera szczegóły wyścigu',
    /** The card of the Activity's summary metrics. */
    summary: 'Podsumowanie',
    profileLabel:
      'Profil aktywności: {{duration}}, {{segments}}, maks. {{peak}}% FTP. {{power}}',
    segments_one: '{{count}} odcinek',
    segments_few: '{{count}} odcinki',
    segments_many: '{{count}} odcinków',
    segments_other: '{{count}} odcinka',
    notFound: {
      title: 'Aktywność nie istnieje',
      body: 'Ta aktywność mogła zostać usunięta z Intervals.icu.',
    },
    /** A Strava Activity, which intervals.icu can't share. */
    unavailable: {
      title: 'Aktywność niedostępna',
      body: 'To aktywność ze Stravy. Intervals.icu nie udostępnia jej szczegółów innym aplikacjom.',
    },
    error: 'Nie udało się wczytać aktywności.',
    retry: 'Spróbuj ponownie',
    loading: 'Wczytywanie aktywności',
    /** The full-screen map of an Activity with no Route. */
    routeMissing: 'Ta aktywność nie ma zapisanej trasy.',
  },
  intervals: {
    title: 'Intervals.icu',
    connectPrompt: {
      message: 'Połącz konto Intervals.icu, aby zobaczyć swoje treningi.',
      action: 'Przejdź do ustawień',
    },
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
    /** Asks once for the Wellness scope that Fitness and Wellness are read with. */
    wellnessScopePrompt: {
      message:
        'Połącz ponownie Intervals.icu i zezwól na dostęp do Wellness, aby zobaczyć Fitness i Wellness.',
      action: 'Połącz ponownie',
    },
  },
} as const;

export default pl;
