import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { AvailabilityGrid } from '@/modules/availability/components/AvailabilityGrid';
import type { AvailabilityRule } from '@/modules/availability/types/availability.types';

vi.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      no_rules_configured: 'No hay horarios configurados',
      empty_message: 'Configura tu primer horario',
      delete: 'Eliminar',
      available_slot: 'Disponible',
      no_availability: 'Sin disponibilidad',
    };
    return { t: (key: string) => translations[key] ?? key, i18n: { language: 'es' } };
  },
}));

const rule: AvailabilityRule = {
  id: 1,
  doctor_id: 2,
  day_of_week: 1,
  start_time: '08:00',
  end_time: '12:00',
  created_at: '2026-08-01T10:00:00Z',
};

function renderGrid(overrides: { rules?: AvailabilityRule[]; onDelete?: (id: number) => void } = {}) {
  return render(
    <AppThemeProvider>
      <AvailabilityGrid rules={overrides.rules ?? []} onDelete={overrides.onDelete} />
    </AppThemeProvider>,
  );
}

describe('AvailabilityGrid', () => {
  it('shows the empty message when there are no rules', () => {
    renderGrid();
    expect(screen.getByText('No hay horarios configurados')).toBeInTheDocument();
    expect(screen.getByText('Configura tu primer horario')).toBeInTheDocument();
  });

  it('renders day headers when there are rules', () => {
    renderGrid({ rules: [rule] });
    expect(screen.getByText('Lunes')).toBeInTheDocument();
    expect(screen.getByText('Martes')).toBeInTheDocument();
    expect(screen.getByText('Domingo')).toBeInTheDocument();
  });

  it('renders the legend', () => {
    renderGrid({ rules: [rule] });
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('Sin disponibilidad')).toBeInTheDocument();
  });

  it('calls onDelete when clicking the delete button of an active block', () => {
    const onDelete = vi.fn();
    renderGrid({ rules: [rule], onDelete });
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('does not render delete buttons when onDelete is not provided', () => {
    renderGrid({ rules: [rule] });
    expect(screen.queryByRole('button', { name: /Eliminar/i })).not.toBeInTheDocument();
  });
});
