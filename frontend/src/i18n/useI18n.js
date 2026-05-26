import { createContext, createElement, useMemo, useState, useEffect } from 'react';
import fallbackTranslations from './translations';
import api from '../api/axios';

export const I18nContext = createContext(null);

const FALLBACK_LOCALE = 'es';
const LOCALE_KEY = 'app_locale';
const CACHE_KEY = 'app_translations_cache';
const CACHE_TTL = 5 * 60 * 1000;

let cachedTranslations = null;
let fetchPromise = null;

const loadTranslations = async () => {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        cachedTranslations = data;
        return data;
      }
    } catch { /* ignore */ }
  }

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await api.get('/i18n/translations');
      const data = res.data;
      cachedTranslations = data;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    } catch {
      cachedTranslations = fallbackTranslations;
      return fallbackTranslations;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

export const getStoredLocale = () => {
  return localStorage.getItem(LOCALE_KEY) || navigator.language?.slice(0, 2) || FALLBACK_LOCALE;
};

export const setStoredLocale = (locale) => {
  localStorage.setItem(LOCALE_KEY, locale);
  window.dispatchEvent(new CustomEvent('locale:changed', { detail: locale }));
};

const supportedLocales = Object.keys(fallbackTranslations);

export const useI18n = (locale) => {
  const [translations, setTranslations] = useState(cachedTranslations || fallbackTranslations);
  const [localeVersion, setLocaleVersion] = useState(0);

  useEffect(() => {
    if (!cachedTranslations) {
      loadTranslations().then(setTranslations);
    }
  }, []);

  useEffect(() => {
    const handler = () => setLocaleVersion((v) => v + 1);
    window.addEventListener('locale:changed', handler);
    return () => window.removeEventListener('locale:changed', handler);
  }, []);

  const currentLocale = locale || getStoredLocale();
  const lang = supportedLocales.includes(currentLocale) ? currentLocale : FALLBACK_LOCALE;

  return useMemo(() => {
    const dict = translations[lang] || fallbackTranslations[lang];

    const t = (key, params) => {
      let msg = dict?.[key];
      if (!msg) {
        msg = fallbackTranslations[FALLBACK_LOCALE]?.[key] || key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          msg = msg.replace(`{${k}}`, String(v));
        }
      }
      return msg;
    };

    const tAll = (key) => {
      const result = {};
      for (const locale of supportedLocales) {
        result[locale] = translations[locale]?.[key] || fallbackTranslations[locale]?.[key] || key;
      }
      return result;
    };

    return { t, tAll, locale: lang };
  }, [lang, translations, localeVersion]);
};

export const I18nProvider = ({ children, locale }) => {
  const i18n = useI18n(locale);
  return createElement(I18nContext.Provider, { value: i18n }, children);
};

export default useI18n;
