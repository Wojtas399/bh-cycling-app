import { initReactI18next } from 'react-i18next';

import pl from './locales/pl';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'pl';

i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
  },
  lng: deviceLanguage,
  fallbackLng: 'pl',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
