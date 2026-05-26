import { useEffect, useState } from 'react';
import { getMyBookings, deleteBooking } from '../api/bookings';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

export default function MyBookingsPage() {
  const { t } = useI18n();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMyBookings()
      .then((res) => setBookings(Array.isArray(res) ? res : (res.data || [])))
      .catch(() => setError(t('my_bookings.error_loading')))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm(t('my_bookings.cancel_confirm'))) return;
    try {
      setCancellingId(id);
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || t('my_bookings.error_cancelling'));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>{t('my_bookings.title')}</h1>
        <button onClick={() => navigate('/booking')} className="btn btn-primary">
          {t('my_bookings.new_booking')}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <p style={{ color: 'var(--text-muted)' }}>{t('my_bookings.loading')}</p>}

      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>{t('my_bookings.empty_title')}</h3>
          <p>{t('my_bookings.empty_desc')}</p>
          <button onClick={() => navigate('/booking')} className="btn btn-primary">{t('my_bookings.book_now')}</button>
        </div>
      )}

      <div className="grid" style={{ gap: 12 }}>
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{b.doctor_name}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 14 }}>{b.specialty}</p>
              </div>
              <span className={`badge ${b.confirmed ? 'badge-success' : b.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                {b.confirmed ? t('my_bookings.status_confirmed') : b.status === 'cancelled' ? t('my_bookings.status_cancelled') : t('my_bookings.status_pending')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 14 }}>
              <span>📅 {b.date}</span>
              <span>🕐 {b.time}</span>
              <span>⏱ {b.duration} min</span>
            </div>
            {b.status !== 'cancelled' && (
              <button
                onClick={() => handleCancel(b.id)}
                disabled={cancellingId === b.id}
                className="btn btn-danger btn-sm"
              >
                {cancellingId === b.id ? t('my_bookings.cancelling') : t('my_bookings.cancel')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
