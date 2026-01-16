import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from '../locales/en.json';
import ptTranslation from '../locales/pt.json';

const LANGUAGE_STORAGE_KEY = 'qalite.language';
const storedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;

i18n.use(initReactI18next).init({
  resources: {
    en: {
      ...enTranslation,
    },
    pt: {
      ...ptTranslation,
    },
  },
  lng: storedLanguage ?? 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'pt'],
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
});

export default i18n;
