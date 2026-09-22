import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ThankYouPage from '@/modules/onboarding/pages/ThankYouPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const t = (key: string) => {
      const map: Record<string, string> = {
        title: '¡Gracias por tu solicitud!',
        subtitle: 'Hemos recibido tus datos correctamente.',
        description: 'Nuestro equipo revisará la solicitud.',
        notes: 'Recibirás un correo de confirmación.',
        back: 'Volver al inicio',
        newRequest: 'Enviar otra solicitud',
      };
      return map[key] ?? key;
    };
    return { t, i18n: { language: 'es' } };
  },
}));

describe('ThankYouPage', () => {
  it('renders success message and actions', () => {
    render(
      <MemoryRouter>
        <ThankYouPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('¡Gracias por tu solicitud!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Enviar otra solicitud' })).toHaveAttribute('href', '/contratar');
  });
});