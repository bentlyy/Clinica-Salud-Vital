import { useEffect, useState } from 'react';
import { getMyBookings, deleteBooking } from '../api/bookings';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';
import Alert from '../components/ui/Alert';

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
    <PageContainer>
      <PageHeader
        title={t('my_bookings.title')}
        actions={
          <Button variant="primary" onClick={() => navigate('/booking')}>
            {t('my_bookings.new_booking')}
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading && <p style={{ color: 'var(--ds-text-tertiary)' }}>{t('my_bookings.loading')}</p>}

      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>{t('my_bookings.empty_title')}</h3>
          <p>{t('my_bookings.empty_desc')}</p>
          <Button variant="primary" onClick={() => navigate('/booking')}>{t('my_bookings.book_now')}</Button>
        </div>
      )}

      <div className="grid">
        {bookings.map((b) => (
          <Card key={b.id} padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 16 }}>{b.doctor_name}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 14 }}>{b.specialty}</p>
              </div>
              <Badge variant={b.confirmed ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}>
                {b.confirmed ? t('my_bookings.status_confirmed') : b.status === 'cancelled' ? t('my_bookings.status_cancelled') : t('my_bookings.status_pending')}
              </Badge>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--ds-text-secondary)', marginBottom: 14 }}>
              <span>📅 {b.date}</span>
              <span>🕐 {b.time}</span>
              <span>⏱ {b.duration} min</span>
            </div>
            {b.status !== 'cancelled' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleCancel(b.id)}
                disabled={cancellingId === b.id}
              >
                {cancellingId === b.id ? t('my_bookings.cancelling') : t('my_bookings.cancel')}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
