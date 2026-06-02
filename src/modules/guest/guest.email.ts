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
  const cancelUrl = `${escapeHtml(frontendUrl)}/confirm/${encodeURIComponent(confirmToken)}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
      <h2 style="color: #1976d2;">Hola ${escapeHtml(name)}</h2>
      <p>Tu cita m\u00e9dica ha sido registrada exitosamente. Aqu\u00ed est\u00e1n los detalles:</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;background:#f5f5f5"><strong>Doctor:</strong></td><td style="padding:8px">${escapeHtml(doctor)}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5"><strong>Fecha:</strong></td><td style="padding:8px">${escapeHtml(date)}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5"><strong>Hora:</strong></td><td style="padding:8px">${escapeHtml(time)}</td></tr>
      </table>

      <p style="font-size:14px;color:#666;">
        Si necesitas cancelar o reagendar, haz clic en el siguiente enlace:
      </p>
      <p style="text-align:center;">
        <a href="${cancelUrl}">Gestionar mi cita</a>
      </p>
    </div>
  `;
};