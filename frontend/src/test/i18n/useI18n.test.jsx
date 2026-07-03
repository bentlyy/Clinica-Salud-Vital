import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../i18n/translations.js', () => ({
  default: {
    es: {
      'greeting': 'Hola',
      'farewell': 'Adiós',
      'with_param': 'Hola {name}',
    },
    en: {
      'greeting': 'Hello',
      'farewell': 'Goodbye',
      'with_param': 'Hello {name}',
    },
    pt: {
      'greeting': 'Olá',
    },
    fr: {
      'greeting': 'Bonjour',
    },
  },
}));

import { useI18n, getStoredLocale, setStoredLocale, I18nContext, I18nProvider } from '../../i18n/useI18n';
import { useContext } from 'react';

function TestConsumer({ locale }) {
  const i18n = useI18n(locale);
  return (
    <div>
      <span data-testid="t-greeting">{i18n.t('greeting')}</span>
      <span data-testid="t-farewell">{i18n.t('farewell')}</span>
      <span data-testid="t-missing">{i18n.t('nonexistent_key')}</span>
      <span data-testid="t-param">{i18n.t('with_param', { name: 'Mundo' })}</span>
      <span data-testid="locale">{i18n.locale}</span>
    </div>
  );
}

describe('useI18n', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('t function', () => {
    it('returns translation for existing key in locale', () => {
      render(<TestConsumer locale="en" />);
      expect(screen.getByTestId('t-greeting').textContent).toBe('Hello');
    });

    it('returns fallback locale translation when key missing in current locale', () => {
      render(<TestConsumer locale="pt" />);
      expect(screen.getByTestId('t-farewell').textContent).toBe('Adiós');
    });

    it('returns key itself when not found in any locale', () => {
      render(<TestConsumer locale="en" />);
      expect(screen.getByTestId('t-missing').textContent).toBe('nonexistent_key');
    });

    it('interpolates params into translation', () => {
      render(<TestConsumer locale="en" />);
      expect(screen.getByTestId('t-param').textContent).toBe('Hello Mundo');
    });

    it('handles unknown locale by falling back to es', () => {
      render(<TestConsumer locale="de" />);
      expect(screen.getByTestId('t-greeting').textContent).toBe('Hola');
    });
  });

  describe('locale property', () => {
    it('returns the provided locale', () => {
      render(<TestConsumer locale="en" />);
      expect(screen.getByTestId('locale').textContent).toBe('en');
    });

    it('returns es for unknown locale', () => {
      render(<TestConsumer locale="de" />);
      expect(screen.getByTestId('locale').textContent).toBe('es');
    });
  });

  describe('tAll function', () => {
    it('returns translations for all locales', () => {
      function TAllConsumer() {
        const i18n = useI18n('en');
        const all = i18n.tAll('greeting');
        return (
          <div>
            <span data-testid="all-es">{all.es}</span>
            <span data-testid="all-en">{all.en}</span>
            <span data-testid="all-pt">{all.pt}</span>
            <span data-testid="all-fr">{all.fr}</span>
          </div>
        );
      }
      render(<TAllConsumer />);
      expect(screen.getByTestId('all-es').textContent).toBe('Hola');
      expect(screen.getByTestId('all-en').textContent).toBe('Hello');
      expect(screen.getByTestId('all-pt').textContent).toBe('Olá');
      expect(screen.getByTestId('all-fr').textContent).toBe('Bonjour');
    });

    it('falls back to key when missing in all locales', () => {
      function TAllConsumer() {
        const i18n = useI18n('en');
        const all = i18n.tAll('nonexistent');
        return <span data-testid="all-fallback">{all.es}</span>;
      }
      render(<TAllConsumer />);
      expect(screen.getByTestId('all-fallback').textContent).toBe('nonexistent');
    });
  });

  describe('locale changed event', () => {
    function LocaleChangeDetector() {
      const i18n = useI18n('en');
      return <span data-testid="t-value">{i18n.t('greeting')}</span>;
    }

    it('re-renders on locale:changed event', () => {
      render(<LocaleChangeDetector />);
      expect(screen.getByTestId('t-value').textContent).toBe('Hello');
      window.dispatchEvent(new CustomEvent('locale:changed', { detail: 'es' }));
      expect(screen.getByTestId('t-value').textContent).toBe('Hello');
    });
  });
});

describe('getStoredLocale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns stored locale from localStorage', () => {
    localStorage.setItem('app_locale', 'en');
    expect(getStoredLocale()).toBe('en');
  });
});

describe('setStoredLocale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores locale in localStorage', () => {
    setStoredLocale('en');
    expect(localStorage.getItem('app_locale')).toBe('en');
  });

  it('dispatches locale:changed event', () => {
    const handler = vi.fn();
    window.addEventListener('locale:changed', handler);
    setStoredLocale('en');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'locale:changed',
        detail: 'en',
      })
    );
    window.removeEventListener('locale:changed', handler);
  });
});

describe('I18nProvider', () => {
  it('provides context with t function', () => {
    function Consumer() {
      const ctx = useContext(I18nContext);
      return <span data-testid="ctx-t">{ctx.t('greeting')}</span>;
    }
    render(
      <I18nProvider locale="en">
        <Consumer />
      </I18nProvider>
    );
    expect(screen.getByTestId('ctx-t').textContent).toBe('Hello');
  });

  it('provides default value when no locale provided', () => {
    function Consumer() {
      const ctx = useContext(I18nContext);
      return <span data-testid="ctx-locale">{ctx.locale}</span>;
    }
    localStorage.setItem('app_locale', 'fr');
    render(
      <I18nProvider>
        <Consumer />
      </I18nProvider>
    );
    expect(screen.getByTestId('ctx-locale').textContent).toBe('fr');
  });
});
