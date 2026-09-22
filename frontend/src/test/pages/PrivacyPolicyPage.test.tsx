import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicyPage from '@/modules/legal/pages/PrivacyPolicyPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const t = (key: string) => {
      const map: Record<string, string> = {
        back: 'Volver al inicio',
        updated: 'Última actualización',
        'privacy.title': 'Política de Privacidad',
        'privacy.intro': 'Texto de introducción de privacidad.',
        'privacy.dataTitle': 'Datos que recopilamos',
        'privacy.dataBody': 'Recopilamos datos de cuenta.',
        'privacy.useTitle': 'Uso de los datos',
        'privacy.useBody': 'Usamos los datos para operar.',
        'privacy.shareTitle': 'Compartición de datos',
        'privacy.shareBody': 'No vendemos tus datos.',
        'privacy.securityTitle': 'Seguridad',
        'privacy.securityBody': 'Aplicamos medidas de seguridad.',
        'privacy.rightsTitle': 'Tus derechos',
        'privacy.rightsBody': 'Puedes solicitar acceso.',
        'privacy.retentionTitle': 'Retención',
        'privacy.retentionBody': 'Conservamos los datos.',
      };
      return map[key] ?? key;
    };
    return { t, i18n: { language: 'es' } };
  },
}));

describe('PrivacyPolicyPage', () => {
  it('renders title and sections', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Política de Privacidad')).toBeInTheDocument();
    expect(screen.getByText('Datos que recopilamos')).toBeInTheDocument();
    expect(screen.getByText('Tus derechos')).toBeInTheDocument();
  });

  it('renders back to home link', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Volver al inicio' });
    expect(link).toHaveAttribute('href', '/');
  });
});