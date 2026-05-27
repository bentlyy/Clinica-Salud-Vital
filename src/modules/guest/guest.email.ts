import { escapeHtml } from '../../shared/escape.js';

interface GuestConfirmationParams {
  name: string;
  doctor: string;
  date: string;
  time: string;
  confirmToken: string;
  frontendUrl: string;
}

export const guestConfirmationEmail = ({ name, doctor, date, time, confirmToken, frontendUrl }: GuestConfirmationParams): string => {
  const confirmUrl = `${escapeHtml(frontendUrl)}/confirm/${encodeURIComponent(confirmToken)}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Hola ${escapeHtml(name)}</h2>
      <p>Tu cita médica ha sido pre-reservada. Para confirmarla, haz clic en el botón de abajo:</p>

      <ul style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
        <li><strong>Doctor:</strong> ${escapeHtml(doctor)}</li>
        <li><strong>Fecha:</strong> ${escapeHtml(date)}</li>
        <li><strong>Hora:</strong> ${escapeHtml(time)}</li>
      </ul>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${confirmUrl}"
           style="background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Confirmar mi cita
        </a>
      </div>

      <p style="color: #e53935; font-size: 13px;">
        Si no confirmas tu cita, tu RUT ser\u00e1 bloqueado por 7 d\u00edas y no podr\u00e1s reservar nuevamente.
      </p>
    </div>
  `;
};