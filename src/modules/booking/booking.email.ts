import { escapeHtml } from '../../shared/escape.js';

interface BookingConfirmationParams {
  doctor: string;
  date: string;
  time: string;
  confirmToken: string;
  frontendUrl?: string;
}

export const bookingConfirmationTemplate = ({ doctor, date, time, confirmToken, frontendUrl }: BookingConfirmationParams): string => {
  const baseUrl = escapeHtml(frontendUrl || 'http://localhost:5173');
  const confirmUrl = confirmToken ? `${baseUrl}/confirm/${encodeURIComponent(confirmToken)}` : null;

  return `
    <h2>Cita agendada</h2>
    <p>Tu cita ha sido registrada exitosamente. Aqu\u00ed est\u00e1n los detalles:</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;background:#f5f5f5"><strong>Doctor:</strong></td><td style="padding:8px">${escapeHtml(doctor)}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5"><strong>Fecha:</strong></td><td style="padding:8px">${escapeHtml(date)}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5"><strong>Hora:</strong></td><td style="padding:8px">${escapeHtml(time)}</td></tr>
    </table>

    ${confirmUrl ? `
      <p style="font-size:14px;color:#666;">
        Si necesitas cancelar o reagendar, haz clic en el siguiente enlace:
      </p>
      <p style="text-align:center;">
        <a href="${confirmUrl}">Gestionar mi cita</a>
      </p>
    ` : '<p>Gracias por confiar en nosotros.</p>'}
  `;
};

interface BookingRescheduledParams {
  doctor: string;
  oldDate: string;
  oldTime: string;
  date: string;
  time: string;
  frontendUrl?: string;
}

export const bookingRescheduledTemplate = ({ doctor, oldDate, oldTime, date, time, frontendUrl }: BookingRescheduledParams): string => {
  const baseUrl = escapeHtml(frontendUrl || 'http://localhost:5173');
  return `
    <h2>Cita reprogramada</h2>
    <p>Tu cita con el Dr./Dra. ${escapeHtml(doctor)} ha sido reprogramada:</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:8px;background:#f5f5f5"><strong>Fecha anterior:</strong></td><td style="padding:8px">${escapeHtml(oldDate)} ${escapeHtml(oldTime)}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5"><strong>Nueva fecha:</strong></td><td style="padding:8px">${escapeHtml(date)} ${escapeHtml(time)}</td></tr>
    </table>

    <p style="text-align:center;">
      <a href="${baseUrl}/bookings">Ver mis citas</a>
    </p>
    <p>Gracias por confiar en nosotros.</p>
  `;
};