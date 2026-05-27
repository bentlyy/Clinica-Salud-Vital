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