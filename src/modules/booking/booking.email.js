export const bookingConfirmationTemplate = ({ doctor, date, time, confirmToken, frontendUrl }) => {
  const confirmUrl = confirmToken ? `${frontendUrl || 'http://localhost:5173'}/confirm/${confirmToken}` : null;

  return `
    <h2>Reserva pre-confirmada</h2>
    <p>Tu cita ha sido agendada. Para asegurarla, confirma con el botón de abajo:</p>

    <ul>
      <li><strong>Doctor:</strong> ${doctor}</li>
      <li><strong>Fecha:</strong> ${date}</li>
      <li><strong>Hora:</strong> ${time}</li>
    </ul>

    ${confirmUrl ? `
      <p style="text-align: center;">
        <a href="${confirmUrl}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Confirmar mi cita
        </a>
      </p>
      <p style="color: #e53935; font-size: 13px;">
        ⚠️ Si no confirmas tu cita, tu RUT será bloqueado por 7 días.
      </p>
    ` : '<p>Gracias por confiar en nosotros.</p>'}
  `;
};
