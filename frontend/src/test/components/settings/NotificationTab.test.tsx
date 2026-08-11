import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { NotificationTab } from '@/modules/settings/components/NotificationTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        notifications_placeholder: 'Notificaciones próximamente',
        placeholder_coming_soon: 'Próximamente',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

function renderTab() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <NotificationTab />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('NotificationTab', () => {
  it('renders the placeholder page with the notifications title', () => {
    renderTab();
    expect(screen.getByText('Notificaciones próximamente')).toBeInTheDocument();
  });

  it('shows the "coming soon" hint', () => {
    renderTab();
    expect(screen.getByText('Próximamente')).toBeInTheDocument();
  });
});
