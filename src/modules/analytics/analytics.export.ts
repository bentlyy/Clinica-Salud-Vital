import * as XLSX from 'xlsx';
import * as analyticsService from './analytics.service.js';

export const generateAnalyticsExcel = async (tenantId?: string): Promise<Buffer> => {
  const wb = XLSX.utils.book_new();

  const [
    dashboard,
    bookingsByMonth,
    topDoctors,
    statusDist,
    noShows,
    diagnoses,
    demand,
    schedules,
    vitals,
  ] = await Promise.all([
    analyticsService.getDashboardStats(tenantId).catch(() => ({})),
    analyticsService.getBookingsByMonth(12, tenantId).catch(() => []),
    analyticsService.getTopDoctors(50, tenantId).catch(() => []),
    analyticsService.getBookingStatusDistribution(tenantId).catch(() => []),
    analyticsService.getNoShowsByDoctor(tenantId).catch(() => []),
    analyticsService.getDiagnoses(tenantId).catch(() => []),
    analyticsService.getDemandForecast(90, tenantId).catch(() => []),
    analyticsService.getOptimalSchedules(tenantId).catch(() => []),
    analyticsService.getVitalSignsAnomalies(tenantId).catch(() => []),
  ]);

  addSheet(wb, 'Dashboard', [
    ['Métrica', 'Valor'],
    ['Total Pacientes', dashboard.total_patients ?? ''],
    ['Total Doctores', dashboard.total_doctors ?? ''],
    ['Total Citas', dashboard.total_bookings ?? ''],
    ['Citas Hoy', dashboard.today_bookings ?? ''],
    ['Citas Confirmadas', dashboard.confirmed_bookings ?? ''],
    ['Citas Canceladas', dashboard.cancelled_bookings ?? ''],
  ]);

  if (bookingsByMonth.length) {
    const header = Object.keys(bookingsByMonth[0] ?? {});
    addSheet(wb, 'Citas por Mes', [
      header,
      ...bookingsByMonth.map((r: Record<string, unknown>) => header.map(k => String(r[k] ?? ''))),
    ]);
  }

  if (topDoctors.length) {
    addSheet(wb, 'Top Doctores', [
      ['Doctor', 'Especialidad', 'Citas'],
      ...topDoctors.map(r => [r.doctor, r.specialty, r.count]),
    ]);
  }

  if (noShows.length) {
    addSheet(wb, 'No-Shows por Doctor', [
      ['Doctor', 'Total Citas', 'No-Asistencias', 'Tasa (%)'],
      ...noShows.map(r => [r.doctor, r.total, r.noShows, r.total > 0 ? ((r.noShows / r.total) * 100).toFixed(1) : '0']),
    ]);
  }

  if (diagnoses.length) {
    addSheet(wb, 'Diagnósticos', [
      ['Diagnóstico', 'Cantidad'],
      ...diagnoses.map(r => [r.diagnosis, r.count]),
    ]);
  }

  if (demand.length) {
    const demandData = demand as Record<string, unknown>[];
    const header = Object.keys(demandData[0] ?? {});
    addSheet(wb, 'Demanda / Pronóstico', [
      header,
      ...demandData.map(r => header.map(k => String(r[k] ?? ''))),
    ]);
  }

  if (schedules.length) {
    addSheet(wb, 'Horarios Óptimos', [
      ['Día', 'Mejor Hora', 'Ocupación (%)'],
      ...schedules.map(r => [r.day, r.bestTime, r.occupancy]),
    ]);
  }

  if (vitals.length) {
    addSheet(wb, 'Signos Vitales', [
      ['Paciente ID', 'Fecha', 'Presión', 'FC (lpm)', 'Temperatura (°C)', 'Anomalía'],
      ...vitals.map(r => [
        r.patientId,
        r.date,
        r.pressure,
        r.heartRate,
        r.temperature,
        r.anomaly ? 'Sí' : 'No',
      ]),
    ]);
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

function addSheet(wb: XLSX.WorkBook, name: string, data: unknown[][]) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const colWidths = data[0]?.map((_, i) => {
    const max = data.reduce((len, row) => Math.max(len, String(row[i] ?? '').length), 0);
    return { wch: Math.min(max + 3, 40) };
  }) || [];
  ws['!cols'] = colWidths;
  const safeName = name.replace(/[:\\\/\?\*\[\]]/g, '_').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName);
}
