import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ConsentBanner, getCookieConsent, setCookieConsent } from '@/shared/components/cookies/ConsentBanner';

const KEY = 'vitaria_cookie_consent';

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const t = (key: string) => {
      const map: Record<string, string> = {
        message: 'Usamos cookies para mejorar tu experiencia.',
        accept: 'Aceptar todas',
        decline: 'Solo necesarias',
        privacy: 'Política de privacidad',
      };
      return map[key] ?? key;
    };
    return { t, i18n: { language: 'es' } };
  },
}));

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('getCookieConsent / setCookieConsent', () => {
  it('returns null when nothing stored', () => {
    expect(getCookieConsent()).toBeNull();
  });

  it('persists and parses a valid choice', () => {
    setCookieConsent({ analytics: true });
    expect(getCookieConsent()).toEqual({ analytics: true });
  });

  it('returns null for corrupted payloads', () => {
    localStorage.setItem(KEY, '{not-json');
    expect(getCookieConsent()).toBeNull();
  });
});

describe('ConsentBanner', () => {
  it('is hidden when consent already given', () => {
    setCookieConsent({ analytics: false });
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows dialog and links to privacy policy', () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacidad');
  });

  it('stores consent on accept', () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar todas' }));
    expect(getCookieConsent()).toEqual({ analytics: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stores consent on decline', () => {
    render(
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Solo necesarias' }));
    expect(getCookieConsent()).toEqual({ analytics: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});