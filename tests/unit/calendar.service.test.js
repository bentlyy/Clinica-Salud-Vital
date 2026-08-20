import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
  readPool: { query: mockQuery },
}));

import { formatDateUTC, escapeText, buildVEvent, buildCalendar } from '../../src/modules/calendar/ics.util.js';
import * as calendarService from '../../src/modules/calendar/calendar.service.js';
import { NotFoundError } from '../../src/utils/errors.js';

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const dow = today.getDay() === 0 ? 7 : today.getDay();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ics.util', () => {
  it('formatDateUTC formats a Date as YYYYMMDDTHHMMSSZ', () => {
    const date = new Date(Date.UTC(2026, 7, 13, 9, 5, 7));
    expect(formatDateUTC(date)).toBe('20260813T090507Z');
  });

  it('escapeText escapes commas, semicolons, newlines and backslashes', () => {
    expect(escapeText('Hola, Mundo; 2026\n\\ok')).toBe('Hola\\, Mundo\\; 2026\\n\\\\ok');
  });

  it('buildVEvent returns a valid VEVENT block', () => {
    const vevent = buildVEvent({
      uid: 'booking-1@clinica',
      dtstart: '20260813T090000Z',
      dtend: '20260813T093000Z',
      summary: 'Cita: Juan',
      description: 'RUT: 1-1',
    });

    expect(vevent).toContain('BEGIN:VEVENT');
    expect(vevent).toContain('UID:booking-1@clinica');
    expect(vevent).toContain('DTSTART:20260813T090000Z');
    expect(vevent).toContain('DTEND:20260813T093000Z');
    expect(vevent).toContain('SUMMARY:Cita: Juan');
    expect(vevent).toContain('END:VEVENT');
    expect(vevent).toContain('\r\n');
  });

  it('buildCalendar wraps events in a VCALENDAR with VERSION and CRLF', () => {
    const cal = buildCalendar(['BEGIN:VEVENT\r\nEND:VEVENT']);

    expect(cal).toContain('BEGIN:VCALENDAR');
    expect(cal).toContain('VERSION:2.0');
    expect(cal).toContain('PRODID');
    expect(cal).toContain('CALSCALE:GREGORIAN');
    expect(cal).toContain('BEGIN:VEVENT\r\nEND:VEVENT');
    expect(cal).toContain('END:VCALENDAR');
    expect(cal).toContain('\r\n');
  });
});

describe('calendarService.exportDoctorCalendarICS', () => {
  it('throws NotFoundError if doctor does not exist in tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(calendarService.exportDoctorCalendarICS(999, 'tenant-x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError with doctor profile message', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(calendarService.exportDoctorCalendarICS(999, 'tenant-x')).rejects.toThrow('Doctor profile not found');
  });

  it('builds an ICS with availability and confirmed booking events', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Ana' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7, day_of_week: dow, start_time: '09:00:00', end_time: '12:00:00' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: 42,
      date: todayStr,
      time: '10:00:00',
      duration: 30,
      patient_name: 'Juan Pérez',
      patient_rut: '11111111-1',
      doctor_name: 'Dr. Ana',
    }] });

    const result = await calendarService.exportDoctorCalendarICS(1, 'tenant-x');

    expect(result.filename).toBe('doctor-1-calendar.ics');
    expect(result.content).toContain('BEGIN:VCALENDAR');
    expect(result.content).toContain('BEGIN:VEVENT');
    expect(result.content).toContain('END:VEVENT');
    expect(result.content).toContain(`UID:booking-42`);
    expect(result.content).toContain(`UID:avail-7-${todayStr}`);
    expect(result.content).toContain('DTSTART:');
    expect(result.content).toContain('SUMMARY:Cita: Juan Pérez');
    expect(result.content.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('omits availability on full-day exception dates', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Ana' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7, day_of_week: dow, start_time: '09:00:00', end_time: '12:00:00' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, date: todayStr, is_full_day: true }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await calendarService.exportDoctorCalendarICS(1, 'tenant-x');

    expect(result.content).not.toContain(`UID:avail-7-${todayStr}`);
  });

  it('excludes cancelled bookings', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Ana' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: 9,
      date: todayStr,
      time: '10:00:00',
      duration: 30,
      status: 'cancelled',
      patient_name: 'X',
      patient_rut: '',
      doctor_name: 'Dr. Ana',
    }] });

    const result = await calendarService.exportDoctorCalendarICS(1, 'tenant-x');

    expect(result.content).not.toContain('UID:booking-9');
  });

  it('respects custom from/to range', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Ana' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 7, day_of_week: dow, start_time: '09:00:00', end_time: '12:00:00' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{
      id: 55,
      date: tomorrowStr,
      time: '10:00:00',
      duration: 30,
      patient_name: 'Paciente',
      patient_rut: '2-2',
      doctor_name: 'Dr. Ana',
    }] });

    const result = await calendarService.exportDoctorCalendarICS(1, 'tenant-x', { from: tomorrowStr, to: tomorrowStr });

    expect(result.content).toContain('UID:booking-55');
    expect(result.content).not.toContain(`UID:avail-7-${tomorrowStr}`);
  });
});
