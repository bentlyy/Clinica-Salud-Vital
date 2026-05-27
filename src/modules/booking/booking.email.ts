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
    <h2>Reserva pre-confirmada</h2>
    <p>Tu cita ha sido agendada. Para asegurarla, confirma con el bot\u00f3n de abajo:</p>

    <ul>
      <li><strong>Doctor:</strong> ${escapeHtml(doctor)}</li>
      <li><strong>Fecha:</strong> ${escapeHtml(date)}</li>
      <li><strong>Hora:</strong> ${escapeHtml(time)}</li>
    </ul>

    ${confirmUrl ? `
      <p style="text-align: center;">
        <a href="${confirmUrl}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Confirmar mi cita
        </a>
      </p>
      <p style="color: #e53935; font-size: 13px;">
        Si no confirmas tu cita, tu RUT ser\u00e1 bloqueado por 7 d\u00edas.
      </p>
    ` : '<p>Gracias por confiar en nosotros.</p>'}
  `;
};