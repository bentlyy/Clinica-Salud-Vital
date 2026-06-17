import { useEffect, useState } from 'react';
import { getDoctorBookings } from '../api/doctors';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

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
    <div className="page-container-wide">
      <h1 style={{ marginBottom: 24 }}>{t('doctor_panel.title')}</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-3" style={{ marginBottom: 32 }}>
        <div className="card card-subtle" onClick={() => navigate('/doctor/calendar')} style={{ cursor: 'pointer', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <h3>{t('doctor_panel.calendar')}</h3>
          <p>{t('doctor_panel.calendar_desc')}</p>
        </div>
        <div className="card card-subtle" onClick={() => navigate('/doctor/availability')} style={{ cursor: 'pointer', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏰</div>
          <h3>{t('doctor_panel.availability')}</h3>
          <p>{t('doctor_panel.availability_desc')}</p>
        </div>
        <div className="card card-subtle" onClick={() => navigate('/doctor/clinical-records')} style={{ cursor: 'pointer', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <h3>{t('doctor_panel.clinical_records')}</h3>
          <p>{t('doctor_panel.clinical_records_desc')}</p>
        </div>
        <div className="card card-subtle" onClick={() => navigate('/doctor/lab-results')} style={{ cursor: 'pointer', padding: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔬</div>
          <h3>{t('doctor_panel.lab_results')}</h3>
          <p>{t('doctor_panel.lab_results_desc')}</p>
        </div>
      </div>

      <h2 style={{ marginBottom: 16 }}>{t('doctor_panel.my_agenda')}</h2>

      {loading && <p style={{ color: 'var(--text-muted)' }}>{t('doctor_panel.loading')}</p>}
      {!loading && bookings.length === 0 && (
        <div className="empty-state">
          <p>{t('doctor_panel.no_bookings')}</p>
        </div>
      )}

      <div className="grid" style={{ gap: 12 }}>
        {bookings.map((b) => (
          <div key={b.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{b.patient_email || b.guest_name || t('doctor_panel.patient')}</strong>
                {b.guest_rut && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{t('doctor_panel.rut')}: {b.guest_rut}</p>}
                {b.guest_phone && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{t('doctor_panel.phone')}: {b.guest_phone}</p>}
              </div>
              <span className={`badge ${b.confirmed ? 'badge-success' : 'badge-warning'}`}>
                {b.confirmed ? t('doctor_panel.status_confirmed') : t('doctor_panel.status_pending')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
              <span>📅 {b.date}</span>
              <span>🕐 {b.time}</span>
              <span>⏱ {b.duration} {t('doctor_panel.minutes')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
