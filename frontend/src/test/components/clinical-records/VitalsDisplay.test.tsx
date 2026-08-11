import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { VitalsDisplay } from '@/modules/clinical-records/components/VitalsDisplay';

vi.mock('framer-motion', () => {
  const PassThrough = (props: { children?: React.ReactNode }) => props.children ?? null;
  return {
    motion: new Proxy(PassThrough, {
      apply: () => PassThrough,
      get: () => PassThrough,
    }),
  };
});

function renderVitals(vitals: Record<string, string>) {
  return render(
    <AppThemeProvider>
      <VitalsDisplay vitals={vitals} />
    </AppThemeProvider>,
  );
}

describe('VitalsDisplay', () => {
  it('shows the empty message when there are no vitals', () => {
    renderVitals({});
    expect(screen.getByText('No hay signos vitales registrados')).toBeInTheDocument();
  });

  it('renders vital cards with label, value and unit', () => {
    renderVitals({
      temperature: '36.5',
      blood_pressure: '120/80',
      heart_rate: '72',
    });

    expect(screen.getByText('Temperatura')).toBeInTheDocument();
    expect(screen.getByText('36.5')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();

    expect(screen.getByText('Presión Arterial')).toBeInTheDocument();
    expect(screen.getByText('120/80')).toBeInTheDocument();
    expect(screen.getByText('mmHg')).toBeInTheDocument();

    expect(screen.getByText('Frecuencia Cardíaca')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('lpm')).toBeInTheDocument();
  });

  it('ignores empty and undefined values', () => {
    renderVitals({ temperature: '', blood_pressure: undefined as unknown as string, weight: '70' });
    expect(screen.queryByText('Temperatura')).not.toBeInTheDocument();
    expect(screen.queryByText('Presión Arterial')).not.toBeInTheDocument();
    expect(screen.getByText('Peso')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
  });
});
