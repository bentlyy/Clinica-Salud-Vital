import { escapeHtml } from '../../shared/escape.js';

interface DoctorCredentialsParams {
  name: string;
  email: string;
  setupToken: string;
  loginUrl: string;
}

export const doctorCredentialsEmail = ({ name, email, setupToken, loginUrl }: DoctorCredentialsParams): string => {
  const setupUrl = `${escapeHtml(loginUrl)}/setup-password?token=${encodeURIComponent(setupToken)}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Bienvenido/a, ${escapeHtml(name)}</h2>
      <p>Tu cuenta de doctor ha sido creada en <strong>Cl\u00ednica Salud Vital</strong>.</p>

      <p><strong>Email:</strong> ${escapeHtml(email)}</p>

      <p>Para establecer tu contrase\u00f1a y acceder al sistema, haz clic en el siguiente enlace:</p>

      <p style="text-align: center;">
        <a href="${setupUrl}" style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Establecer mi contrase\u00f1a
        </a>
      </p>

      <p style="font-size: 13px;">
        Este enlace expira en 24 horas. Si no solicitaste esta cuenta, ignora este mensaje.
      </p>
    </div>
  `;
};

interface InvitationEmailParams {
  name: string;
  email: string;
  inviteToken: string;
  frontendUrl: string;
  role: string;
  tenantName?: string;
}

export const invitationEmail = ({ name, email, inviteToken, frontendUrl, role, tenantName }: InvitationEmailParams): string => {
  const inviteUrl = `${escapeHtml(frontendUrl)}/register?invite=${encodeURIComponent(inviteToken)}`;
  const roleLabel = role === 'doctor' ? 'médico' : role === 'lab_technician' ? 'técnico de laboratorio' : 'paciente';
  const clinicName = tenantName || 'la clínica';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 56px; height: 56px; background: #1976d2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 28px;">+</span>
        </div>
      </div>

      <h2 style="color: #333; text-align: center;">Has sido invitado/a</h2>

      <p style="color: #555; font-size: 15px;">Hola ${escapeHtml(name)},</p>

      <p style="color: #555; font-size: 15px;">
        Has sido invitado/a a registrarte como <strong>${roleLabel}</strong> en ${escapeHtml(clinicName)}.
      </p>

      <p style="color: #555; font-size: 15px;">
        Para crear tu cuenta y acceder al sistema, haz clic en el siguiente enlace:
      </p>

      <p style="text-align: center; margin: 28px 0;">
        <a href="${inviteUrl}" style="background: #1976d2; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
          Crear mi cuenta
        </a>
      </p>

      <p style="font-size: 13px; color: #888;">
        <strong>Email:</strong> ${escapeHtml(email)}<br>
        Este enlace expira en 7 d\u00edas. Si no esperabas esta invitaci\u00f3n, ignora este mensaje.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">

      <p style="font-size: 12px; color: #aaa; text-align: center;">
        Cl\u00ednica Salud Vital
      </p>
    </div>
  `;
};