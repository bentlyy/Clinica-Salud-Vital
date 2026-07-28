import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { Resource } from 'i18next';

import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';

const locales = { es, en, pt, fr } as const;
const resources: Resource = {};

for (const [lang, data] of Object.entries(locales)) {
  resources[lang] = {};
  for (const [namespace, value] of Object.entries(data)) {
    (resources[lang] as Record<string, unknown>)[namespace] = value;
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    ns: [...Object.keys(es)],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng: string) => {
  document.documentElement.lang = lng;
});

export default i18n;
