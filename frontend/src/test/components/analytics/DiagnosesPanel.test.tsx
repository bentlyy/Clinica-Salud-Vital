import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { DiagnosesPanel } from '@/modules/analytics/components/DiagnosesPanel';
import type { DiagnosisRecord } from '@/modules/analytics/types/analytics.types';

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    top_diagnoses: 'Diagnósticos más frecuentes',
    top_diagnoses_chart: 'Casos',
    main_diagnoses: 'Diagnósticos principales',
    cases: 'casos',
  };
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => translations[key] ?? fallback ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const data: DiagnosisRecord[] = [
  { diagnosis: 'Hipertensión', count: 5, cie10: 'I10' },
  { diagnosis: 'Diabetes', count: 3 },
];

describe('DiagnosesPanel', () => {
  it('renders the titles and the diagnosis cards with counts', () => {
    render(
      <AppThemeProvider>
        <DiagnosesPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Diagnósticos más frecuentes')).toBeInTheDocument();
    expect(screen.getByText('Diagnósticos principales')).toBeInTheDocument();
    expect(screen.getByText('Hipertensión')).toBeInTheDocument();
    expect(screen.getByText('5 casos')).toBeInTheDocument();
    expect(screen.getByText('CIE-10: I10')).toBeInTheDocument();
    expect(screen.getByText('Diabetes')).toBeInTheDocument();
    expect(screen.getByText('3 casos')).toBeInTheDocument();
    expect(screen.getByText('CIE-10: N/A')).toBeInTheDocument();
  });

  it('shows an empty grid when there is no data', () => {
    const { container } = render(
      <AppThemeProvider>
        <DiagnosesPanel data={[]} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Diagnósticos principales')).toBeInTheDocument();
    expect(container.querySelectorAll('.MuiPaper-root').length).toBe(2);
  });
});
