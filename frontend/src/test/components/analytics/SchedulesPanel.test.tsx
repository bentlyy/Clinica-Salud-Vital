import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SchedulesPanel } from '@/modules/analytics/components/SchedulesPanel';
import type { ScheduleRecord } from '@/modules/analytics/types/analytics.types';

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    best_schedules: 'Mejores horarios',
    schedule_map_description: 'Mapa de horarios',
    schedule_recommendations: 'Recomendaciones de horario',
    day: 'Día',
    best_time: 'Mejor hora',
    occupancy: 'Ocupación',
  };
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const data: ScheduleRecord[] = [
  { day: 'Lunes', bestTime: '09:00', occupancy: 75, hours: [{ time: '09:00', score: 80 }] },
  { day: 'Miércoles', bestTime: '15:00', occupancy: 40, hours: [] },
];

describe('SchedulesPanel', () => {
  it('renders the five week days with their heatmap hours', () => {
    render(
      <AppThemeProvider>
        <SchedulesPanel data={data} />
      </AppThemeProvider>,
    );
    for (const day of ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']) {
      // each day appears in the heatmap and, when present in data, in the table
      expect(screen.getAllByText(day).length).toBeGreaterThanOrEqual(1);
    }
    // 5 heatmap cells per hour + 1 table cell for the two hours with data.
    // Heatmap cells contain "HH:MM" followed by the score, so use a regex.
    expect(screen.getAllByText(/^09:00/).length).toBe(6);
    expect(screen.getAllByText(/^10:00/).length).toBe(5);
    expect(screen.getAllByText(/^15:00/).length).toBe(6);
    expect(screen.getAllByText(/80%$/).length).toBe(1); // scored hour
    expect(screen.getByText('Mejores horarios')).toBeInTheDocument();
  });

  it('renders the recommendations table with occupancy badges', () => {
    render(
      <AppThemeProvider>
        <SchedulesPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Recomendaciones de horario')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });
});
