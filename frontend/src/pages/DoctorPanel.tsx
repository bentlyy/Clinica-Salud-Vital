import { useEffect, useState } from 'react';
import { getDoctorBookings } from '../api/doctors';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';
import Alert from '../components/ui/Alert';

export default function DoctorPanel() {
  const { t } = useI18n();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDoctorBookings()
      .then((res) => setBookings(Array.isArray(res) ? res : (res.data || [])))
      .catch(() => setError(t('doctor_panel.error_loading')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer maxWidth="xl">
      <PageHeader title={t('doctor_panel.title')} />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-3" style={{ marginBottom: 32 }}>
        <Card variant="subtle" padding="lg" hover onClick={() => navigate('/doctor/calendar')}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <h3>{t('doctor_panel.calendar')}</h3>
          <p>{t('doctor_panel.calendar_desc')}</p>
        </Card>
        <Card variant="subtle" padding="lg" hover onClick={() => navigate('/doctor/availability')}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏰</div>
          <h3>{t('doctor_panel.availability')}</h3>
          <p>{t('doctor_panel.availability_desc')}</p>
        </Card>
        <Card variant="subtle" padding="lg" hover onClick={() => navigate('/doctor/clinical-records')}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <h3>{t('doctor_panel.clinical_records')}</h3>
          <p>{t('doctor_panel.clinical_records_desc')}</p>
        </Card>
        <Card variant="subtle" padding="lg" hover onClick={() => navigate('/doctor/lab-results')}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔬</div>
          <h3>{t('doctor_panel.lab_results')}</h3>
          <p>{t('doctor_panel.lab_results_desc')}</p>
        </Card>
      </div>

      <h2 style={{ fontSize: 'var(--ds-text-2xl)', fontWeight: 600, marginBottom: 16 }}>{t('doctor_panel.my_agenda')}</h2>

      {loading && <p style={{ color: 'var(--ds-text-tertiary)' }}>{t('doctor_panel.loading')}</p>}
      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <p>{t('doctor_panel.no_bookings')}</p>
        </div>
      )}

      <div className="grid">
        {bookings.map((b) => (
          <Card key={b.id} padding="md">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{b.patient_email || b.guest_name || t('doctor_panel.patient')}</strong>
                {b.guest_rut && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ds-text-tertiary)' }}>{t('doctor_panel.rut')}: {b.guest_rut}</p>}
                {b.guest_phone && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ds-text-tertiary)' }}>{t('doctor_panel.phone')}: {b.guest_phone}</p>}
              </div>
              <Badge variant={b.confirmed ? 'success' : 'warning'}>
                {b.confirmed ? t('doctor_panel.status_confirmed') : t('doctor_panel.status_pending')}
              </Badge>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--ds-text-secondary)' }}>
              <span>📅 {b.date}</span>
              <span>🕐 {b.time}</span>
              <span>⏱ {b.duration} {t('doctor_panel.minutes')}</span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
