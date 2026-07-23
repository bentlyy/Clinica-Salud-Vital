/* ==========================================================================
   I18n Context — React Provider for internationalization
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { translations } from './translations';

/* =========================================================================
   Types
   ========================================================================= */

export type Locale = 'es' | 'en';

interface I18nContextValue {
  /** Current locale */
  locale: Locale;
  /** Set locale and persist to localStorage */
  setLocale: (locale: Locale) => void;
  /** Translation function — resolves keys with optional interpolation */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/* =========================================================================
   Helpers
   ========================================================================= */

const STORAGE_KEY = 'app_locale';

const SUPPORTED_LOCALES: Locale[] = ['es', 'en'];

/** Detect initial locale from localStorage → navigator → fallback 'es' */
function detectLocale(): Locale {
  // 1. Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
        return stored as Locale;
      }
    } catch {
      // localStorage may be unavailable (SSR, private browsing)
    }

    // 2. Check navigator.language
    const browserLang = navigator.language?.toLowerCase() ?? '';
    if (browserLang.startsWith('en')) {
      return 'en';
    }
  }

  // 3. Default to Spanish
  return 'es';
}

/**
 * Interpolate a string like "Hola {name}" with { name: 'Juan' }
 * Supports {key} and {{key}} syntax.
 */
function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{\{?(\w+)\}?\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : match;
  });
}

/* =========================================================================
   Context
   ========================================================================= */

const I18nContext = createContext<I18nContextValue | null>(null);

/* =========================================================================
   Provider
   ========================================================================= */

interface I18nProviderProps {
  children: ReactNode;
  /** Optional initial locale override (useful for testing) */
  defaultLocale?: Locale;
}

export function I18nProvider({ children, defaultLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    () => defaultLocale ?? detectLocale(),
  );

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // Silently fail if localStorage is unavailable
    }
    // Update html lang attribute for accessibility
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      // Resolve from current locale → Spanish → raw key
      const localeDict = translations[locale] as Record<string, string>;
      const fallbackDict = translations.es as Record<string, string>;

      const value: string | undefined =
        localeDict[key] ?? fallbackDict[key] ?? key;

      if (params && value !== key) {
        return interpolate(value, params);
      }

      return value;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/* =========================================================================
   Hook
   ========================================================================= */

/**
 * Access the i18n context.
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useI18n();
 *
 * <p>{t('auth.login')}</p>
 * <p>{t('landing.heroTitle')}</p>
 * <p>{t('common.greeting', { name: 'Juan' })}</p>
 * <button onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}>
 *   {locale === 'es' ? 'EN' : 'ES'}
 * </button>
 * ```
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error(
      '[I18n] useI18n must be used within an <I18nProvider>. ' +
        'Wrap your component tree with <I18nProvider>.',
    );
  }

  return context;
}
