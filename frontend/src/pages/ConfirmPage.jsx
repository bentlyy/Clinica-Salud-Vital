import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmBooking } from '../api/bookings';
import { useParams } from 'react-router-dom';

export default function ConfirmPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Token no proporcionado'); return; }
    confirmBooking(token)
      .then((r) => {
        if (r.alreadyConfirmed) { setStatus('info'); setMessage('Esta cita ya fue confirmada anteriormente.'); return; }
        setStatus('success'); setMessage('Tu cita ha sido confirmada correctamente.');
      })
      .catch(() => { setStatus('error'); setMessage('Error al confirmar la cita. El enlace puede estar vencido.'); });
  }, [token]);

  const icons = { loading: '⏳', success: '✅', error: '❌', info: 'ℹ️' };
  const titles = { loading: 'Confirmando...', success: 'Cita Confirmada', error: 'Error de Confirmación', info: 'Información' };
  const colors = { success: 'var(--primary-700)', error: 'var(--danger-600)', info: 'var(--chart-warning)' };

  return (
    <div className="page-container" style={{ maxWidth: 500 }}>
      <div className="card" style={{ textAlign: 'center', padding: 48, borderLeft: `4px solid ${colors[status] || 'var(--gray-300)'}` }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{icons[status]}</div>
        <h2 style={{ color: colors[status], marginBottom: 8 }}>{titles[status]}</h2>
        <p style={{ fontSize: 16, marginBottom: 24 }}>{message}</p>
        {status !== 'loading' && (
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Volver al Inicio
          </button>
        )}
      </div>
    </div>
  );
}
