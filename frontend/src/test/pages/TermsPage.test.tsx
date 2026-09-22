import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TermsPage from '@/modules/legal/pages/TermsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const t = (key: string) => {
      const map: Record<string, string> = {
        back: 'Volver al inicio',
        updated: 'Última actualización',
        'terms.title': 'Términos y Condiciones',
        'terms.intro': 'Texto introductorio de términos.',
        'terms.serviceTitle': 'El servicio',
        'terms.serviceBody': 'Descripción del servicio.',
        'terms.accountTitle': 'Cuenta y responsabilidades',
        'terms.accountBody': 'Responsabilidades del usuario.',
        'terms.contentTitle': 'Datos de salud',
        'terms.contentBody': 'Tratamiento de datos de salud.',
        'terms.billingTitle': 'Pagos y planes',
        'terms.billingBody': 'Información de pagos.',
        'terms.liabilityTitle': 'Limitación de responsabilidad',
        'terms.liabilityBody': 'Limitaciones legales.',
        'terms.terminationTitle': 'Terminación',
        'terms.terminationBody': 'Condiciones de terminación.',
      };
      return map[key] ?? key;
    };
    return { t, i18n: { language: 'es' } };
  },
}));

describe('TermsPage', () => {
  it('renders title and core sections', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Términos y Condiciones')).toBeInTheDocument();
    expect(screen.getByText('El servicio')).toBeInTheDocument();
    expect(screen.getByText('Pagos y planes')).toBeInTheDocument();
    expect(screen.getByText('Terminación')).toBeInTheDocument();
  });

  it('renders back to home link', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Volver al inicio' });
    expect(link).toHaveAttribute('href', '/');
  });
});