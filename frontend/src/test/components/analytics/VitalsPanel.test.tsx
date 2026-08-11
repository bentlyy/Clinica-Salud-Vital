import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { VitalsPanel } from '@/modules/analytics/components/VitalsPanel';
import type { VitalsRecord } from '@/modules/analytics/types/analytics.types';

vi.mock('react-i18next', () => {
  const translations: Record<string, string> = {
    total_records: 'Registros totales',
    anomalies_detected: 'Anomalías detectadas',
    normals: 'Normales',
    vital_anomalies: 'Anomalías vitales',
    vital_anomalies_description: 'Descripción',
    patient: 'Paciente',
    pressure: 'Presión',
    heart_rate: 'Frecuencia',
    temperature: 'Temperatura',
    anomalous: 'Anómalos',
  };
  return {
    useTranslation: () => ({
      t: (key: string) => translations[key] ?? key,
      i18n: { language: 'es' },
    }),
  };
});

const data: VitalsRecord[] = [
  { patientId: 'P1', date: '2026-01-01', pressure: '120/80', heartRate: 70, temperature: 36.5, anomaly: false },
  { patientId: 'P2', date: '2026-01-02', pressure: '160/100', heartRate: 95, temperature: 37.8, anomaly: true, pressureAnomaly: true, heartRateAnomaly: true },
  { patientId: 'P3', date: '2026-01-03', pressure: '110/70', heartRate: 72, temperature: 36.2, anomaly: false },
];

describe('VitalsPanel', () => {
  it('computes and renders the aggregate stats', () => {
    render(
      <AppThemeProvider>
        <VitalsPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('3')).toBeInTheDocument(); // total records
    expect(screen.getByText('1')).toBeInTheDocument(); // anomalies
    expect(screen.getByText('2')).toBeInTheDocument(); // normals
  });

  it('renders the anomaly cards with the vital details', () => {
    render(
      <AppThemeProvider>
        <VitalsPanel data={data} />
      </AppThemeProvider>,
    );
    expect(screen.getByText('Anomalías vitales')).toBeInTheDocument();
    expect(screen.getByText('Paciente: P2')).toBeInTheDocument();
    expect(screen.getByText(/Presión: 160\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Frecuencia: 95 lpm/)).toBeInTheDocument();
    expect(screen.getByText(/Temperatura: 37.8°C/)).toBeInTheDocument();
  });

  it('omits the anomaly section when there are no anomalies', () => {
    render(
      <AppThemeProvider>
        <VitalsPanel data={[data[0], data[2]]} />
      </AppThemeProvider>,
    );
    expect(screen.queryByText('Anomalías vitales')).not.toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2); // total records + normals
  });
});
