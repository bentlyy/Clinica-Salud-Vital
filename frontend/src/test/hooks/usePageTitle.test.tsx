import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DocumentTitle } from '@/shared/components/DocumentTitle';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const t = (key: string) => {
      const map: Record<string, string> = {
        'seo:title.home': 'Inicio',
        'seo:title.login': 'Iniciar sesión',
        'seo:title.privacy': 'Política de Privacidad',
        'seo:title.default': 'Vitaria',
      };
      return map[key] ?? key;
    };
    return { t, i18n: { language: 'es' } };
  },
}));

afterEach(() => {
  cleanup();
  document.title = 'Vitaria';
});

function RenderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<DocumentTitle />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('usePageTitle', () => {
  it('sets base title when no title provided', () => {
    function Prober() {
      usePageTitle();
      return <div>probe</div>;
    }
    render(<Prober />);
    expect(document.title).toBe('Vitaria');
  });

  it('appends title to base', () => {
    function Prober() {
      usePageTitle('Panel');
      return <div>probe</div>;
    }
    render(<Prober />);
    expect(document.title).toBe('Panel | Vitaria');
  });
});

describe('DocumentTitle', () => {
  it('sets title for home route', () => {
    RenderAt('/');
    expect(document.title).toBe('Inicio | Vitaria');
  });

  it('sets title for nested routes like privacy', () => {
    RenderAt('/privacidad');
    expect(document.title).toBe('Política de Privacidad | Vitaria');
  });

  it('falls back to default title for unknown routes', () => {
    RenderAt('/unknown-page-xyz');
    expect(document.title).toBe('Vitaria');
  });
});