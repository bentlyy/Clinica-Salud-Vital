import { describe, it, expect } from 'vitest';
import { bookingConfirmationTemplate } from '../../src/modules/booking/booking.email.js';

describe('bookingConfirmationTemplate', () => {
  it('generates confirmation email with confirm URL', () => {
    const html = bookingConfirmationTemplate({
      doctor: 'Dr. Juan',
      date: '2026-06-01',
      time: '10:00',
      confirmToken: 'abc123',
      frontendUrl: 'https://clinic.example.com',
    });

    expect(html).toContain('Dr. Juan');
    expect(html).toContain('2026-06-01');
    expect(html).toContain('10:00');
    expect(html).toContain('https://clinic.example.com/confirm/abc123');
    expect(html).toContain('Gestionar mi cita');
  });

  it('uses default frontendUrl when not provided', () => {
    const html = bookingConfirmationTemplate({
      doctor: 'Dr. Maria',
      date: '2026-06-02',
      time: '11:00',
      confirmToken: 'def456',
    });

    expect(html).toContain('http://localhost:5173/confirm/def456');
  });

  it('renders fallback text when confirmToken is missing', () => {
    const html = bookingConfirmationTemplate({
      doctor: 'Dr. Carlos',
      date: '2026-06-03',
      time: '12:00',
      frontendUrl: 'https://clinic.example.com',
    });

    expect(html).not.toContain('Gestionar mi cita');
    expect(html).toContain('Gracias por confiar en nosotros');
  });
});
