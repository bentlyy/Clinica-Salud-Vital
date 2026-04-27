export const bookingConfirmationTemplate = ({ doctor, date, time }) => {
  return `
    <h2>Reserva confirmada</h2>
    <p>Tu cita ha sido agendada correctamente.</p>

    <ul>
      <li><strong>Doctor:</strong> ${doctor}</li>
      <li><strong>Fecha:</strong> ${date}</li>
      <li><strong>Hora:</strong> ${time}</li>
    </ul>

    <p>Gracias por confiar en nosotros.</p>
  `;
};