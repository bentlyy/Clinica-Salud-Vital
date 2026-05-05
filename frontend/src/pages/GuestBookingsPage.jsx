import { useState } from 'react';
import { getGuestBookings } from '../api/bookings';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';

export default function GuestBookingsPage() {
  const [rut, setRut] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setSearched(false);

    if (!validateRut(cleanRut(rut))) { setError('RUT inválido'); return; }

    try {
      setLoading(true);
      const data = await getGuestBookings(cleanRut(rut));
      setBookings(data);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error buscando reservas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 8 }}>Buscar mis Reservas</h1>
      <p style={{ marginBottom: 24 }}>Ingresa tu RUT para ver tus citas médicas</p>

      <form onSubmit={handleSearch} className="card" style={{ padding: 24, marginBottom: 24 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">RUT</label>
            <input value={rut} onChange={(e) => setRut(formatRut(e.target.value))} placeholder="12.345.678-5" className="form-input" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {searched && bookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Sin reservas</h3>
          <p>No se encontraron reservas para este RUT</p>
        </div>
      )}

      <div className="grid" style={{ gap: 12 }}>
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{b.doctor_name}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 14 }}>{b.specialty}</p>
              </div>
              <span className={`badge ${b.confirmed ? 'badge-success' : b.status === 'no_show' ? 'badge-danger' : 'badge-warning'}`}>
                {b.confirmed ? 'Confirmada' : b.status === 'no_show' ? 'No Asistida' : 'Pendiente'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
              <span>📅 {b.date}</span>
              <span>🕐 {b.time}</span>
              <span>⏱ {b.duration} min</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
