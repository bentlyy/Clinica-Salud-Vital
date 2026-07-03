import { describe, it, expect } from 'vitest';
import { doctorCredentialsEmail, invitationEmail } from '../../src/modules/doctor/doctor.email.js';
import { guestConfirmationEmail } from '../../src/modules/guest/guest.email.js';

describe('doctorCredentialsEmail', () => {
  const params = {
    name: 'Dr. Juan Pérez',
    email: 'juan@clinic.com',
    setupToken: 'token-abc-123',
    loginUrl: 'https://clinic.example.com',
  };

  it('includes doctor name in the email', () => {
    const html = doctorCredentialsEmail(params);
    expect(html).toContain('Dr. Juan Pérez');
  });

  it('includes the email address', () => {
    const html = doctorCredentialsEmail(params);
    expect(html).toContain('juan@clinic.com');
  });

  it('generates correct setup URL with token', () => {
    const html = doctorCredentialsEmail(params);
    expect(html).toContain('/setup-password?token=token-abc-123');
    expect(html).toContain('Establecer mi contraseña');
  });

  it('escapes HTML in name to prevent injection', () => {
    const html = doctorCredentialsEmail({ ...params, name: '<script>alert("xss")</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('encodes special characters in setup token', () => {
    const html = doctorCredentialsEmail({ ...params, setupToken: 'token+with/special?chars' });
    expect(html).toContain(encodeURIComponent('token+with/special?chars'));
  });
});

describe('invitationEmail', () => {
  const params = {
    name: 'Dra. María López',
    email: 'maria@clinic.com',
    inviteToken: 'invite-xyz-789',
    frontendUrl: 'https://clinic.example.com',
    role: 'doctor',
    tenantName: 'Clínica Salud Vital',
  };

  it('includes recipient name', () => {
    const html = invitationEmail(params);
    expect(html).toContain('María López');
  });

  it('includes role label for doctor', () => {
    const html = invitationEmail(params);
    expect(html).toContain('médico');
  });

  it('includes role label for lab_technician', () => {
    const html = invitationEmail({ ...params, role: 'lab_technician' });
    expect(html).toContain('técnico de laboratorio');
  });

  it('includes role label for patient', () => {
    const html = invitationEmail({ ...params, role: 'patient' });
    expect(html).toContain('paciente');
  });

  it('generates correct invite URL', () => {
    const html = invitationEmail(params);
    expect(html).toContain('/register?invite=invite-xyz-789');
    expect(html).toContain('Crear mi cuenta');
  });

  it('includes email in the body', () => {
    const html = invitationEmail(params);
    expect(html).toContain('maria@clinic.com');
  });

  it('mentions 7 day expiration', () => {
    const html = invitationEmail(params);
    expect(html).toContain('7 días');
  });

  it('uses default clinic name when not provided', () => {
    const html = invitationEmail({ ...params, tenantName: undefined });
    expect(html).toContain('la clínica');
  });

  it('escapes HTML in name', () => {
    const html = invitationEmail({ ...params, name: '<img onerror="alert(1)">' });
    expect(html).not.toContain('<img');
  });

  it('encodes invite token', () => {
    const html = invitationEmail({ ...params, inviteToken: 'token+special/chars' });
    expect(html).toContain(encodeURIComponent('token+special/chars'));
  });
});

describe('guestConfirmationEmail', () => {
  const params = {
    name: 'Pedro Navarro',
    doctor: 'Dr. Juan Pérez',
    date: '2026-07-15',
    time: '10:30',
    confirmToken: 'confirm-abc-456',
    frontendUrl: 'https://clinic.example.com',
  };

  it('includes guest name', () => {
    const html = guestConfirmationEmail(params);
    expect(html).toContain('Pedro Navarro');
  });

  it('includes doctor name', () => {
    const html = guestConfirmationEmail(params);
    expect(html).toContain('Dr. Juan Pérez');
  });

  it('includes date and time', () => {
    const html = guestConfirmationEmail(params);
    expect(html).toContain('2026-07-15');
    expect(html).toContain('10:30');
  });

  it('generates correct cancel URL', () => {
    const html = guestConfirmationEmail(params);
    expect(html).toContain('/confirm/confirm-abc-456');
    expect(html).toContain('Gestionar mi cita');
  });

  it('escapes HTML in name', () => {
    const html = guestConfirmationEmail({ ...params, name: '<b>test</b>' });
    expect(html).not.toContain('<b>');
  });

  it('encodes confirm token', () => {
    const html = guestConfirmationEmail({ ...params, confirmToken: 'token+special' });
    expect(html).toContain(encodeURIComponent('token+special'));
  });
});
