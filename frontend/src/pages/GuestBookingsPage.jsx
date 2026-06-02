import { useState } from 'react';
import { getGuestBookings } from '../api/bookings';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';
import { useI18n } from '../i18n/useI18n';

export default function GuestBookingsPage() {
  const { t } = useI18n();
  const [rut, setRut] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError(null);
    setSearched(false);

    if (!validateRut(cleanRut(rut))) { setError(t('guest_bookings.rut_invalid')); return; }

    try {
      setLoading(true);
      const data = await getGuestBookings(cleanRut(rut));
      setBookings(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || t('guest_bookings.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 8 }}>{t('guest_bookings.title')}</h1>
      <p style={{ marginBottom: 24 }}>{t('guest_bookings.rut_hint')}</p>

      <form onSubmit={handleSearch} className="card" style={{ padding: 24, marginBottom: 24 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">{t('guest_bookings.rut_label')}</label>
            <input value={rut} onChange={(e) => setRut(formatRut(e.target.value))} placeholder={t('guest_bookings.rut_placeholder')} className="form-input" />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? t('guest_bookings.searching') : t('guest_bookings.search')}
          </button>
        </div>
      </form>

      {searched && bookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>{t('guest_bookings.empty_title')}</h3>
          <p>{t('guest_bookings.empty_desc')}</p>
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
                {b.confirmed ? t('guest_bookings.status_confirmed') : b.status === 'no_show' ? t('guest_bookings.status_cancelled') : t('guest_bookings.status_pending')}
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
