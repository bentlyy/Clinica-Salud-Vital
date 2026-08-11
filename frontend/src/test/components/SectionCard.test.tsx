import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SectionCard } from '@/modules/dashboard/components/SectionCard';
import CalendarMonth from '@mui/icons-material/CalendarMonth';

function renderCard() {
  return render(
    <MemoryRouter>
      <AppThemeProvider>
        <SectionCard
          title="Mis Citas"
          description="Reserva y gestiona tus horas"
          icon={<CalendarMonth />}
          path="/bookings"
          color="#0d9488"
          bgColor="#ccfbf1"
        />
      </AppThemeProvider>
    </MemoryRouter>,
  );
}

describe('SectionCard', () => {
  it('renders the title and description', () => {
    renderCard();
    expect(screen.getByText('Mis Citas')).toBeInTheDocument();
    expect(screen.getByText('Reserva y gestiona tus horas')).toBeInTheDocument();
  });

  it('links to the given path', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /Mis Citas/ });
    expect(link).toHaveAttribute('href', '/bookings');
  });
});
