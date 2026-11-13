import { initReactI18next } from 'react-i18next';

import pl from './locales/pl';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'pl';

// i18next documents `use` on the default instance; the named export is the same function.
// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
  },
  lng: deviceLanguage,
  fallbackLng: 'pl',
  interpolation: {
    escapeValue: false,
    defaultVariables: { minPasswordLength: MIN_PASSWORD_LENGTH },
  },
});

export default i18n;
