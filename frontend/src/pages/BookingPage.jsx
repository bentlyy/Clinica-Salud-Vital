import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createBooking } from '../api/bookings';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';

export default function BookingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);

  const [form, setForm] = useState({
    rut: '',
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        rut: user.rut || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    getDoctors()
      .then((data) => {
        const docs = Array.isArray(data) ? data : (data.data || []);
        setDoctors(docs);
        const doctorParam = searchParams.get('doctor');
        if (doctorParam) {
          const id = Number(doctorParam);
          if (docs.some(d => d.id === id)) {
            setSelectedDoctor(id);
          }
        }
      })
      .catch(() => setError(t('booking.error')))
      .finally(() => setLoadingDoctors(false));
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDoctor || !date) return;
    getAvailableSlots(selectedDoctor, date)
      .then((data) => { setSlots(Array.isArray(data) ? data : []); setSelectedTime(null); })
      .catch(() => setError(t('booking.error')));
  }, [selectedDoctor, date]);

  const handleConfirm = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      await createBooking({
        doctor_id: selectedDoctor,
        date,
        time: selectedTime,
      });

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || t('booking.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const canGoToStep2 = selectedDoctor && date && selectedTime;

  if (success) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ color: 'var(--primary-700)', marginBottom: 8 }}>{t('booking.success_title')}</h2>
          <p style={{ fontSize: 16, marginBottom: 16 }}>
            {t('booking.success_desc', { email: form.email })}
          </p>
          <div className="alert alert-warning" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            ⚠️ {t('booking.success_warning')}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/my-bookings')} className="btn btn-success">
              {t('booking.view_bookings')}
            </button>
            <button onClick={() => navigate('/')} className="btn btn-ghost">
              {t('booking.back_home')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bk-page">
      <h1 style={{ marginBottom: 24 }}>{t('booking.title')}</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="steps">
        <div className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <div className="step-number">{step > 1 ? '✓' : '1'}</div>
          <span className="step-label">{t('booking.step_select')}</span>
        </div>
        <div className={`step-line ${step > 1 ? 'completed' : step === 1 ? '' : ''}`} />
        <div className={`step ${step === 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <span className="step-label">{t('booking.step_confirm')}</span>
        </div>
      </div>

      {step === 1 && (
        <div>
          <div className="form-group" style={{ maxWidth: 280 }}>
            <label className="form-label">{t('booking.date_label')}</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setSlots([]); setSelectedTime(null); }}
              className="form-input"
            />
          </div>

          <div className="bk-two-col">
            <div className="bk-doctors-col">
              <h3 className="bk-col-title">{t('booking.select_doctor')}</h3>
              {loadingDoctors && <p style={{ color: 'var(--text-muted)' }}>{t('booking.loading_doctors')}</p>}
              <div className="bk-doctor-list">
                {doctors.map((doc) => (
                  <div
                    key={doc.id}
                    className={`bk-doctor-item ${selectedDoctor === doc.id ? 'bk-doctor-selected' : ''}`}
                    onClick={() => { setSelectedDoctor(doc.id); setSlots([]); setSelectedTime(null); }}
                  >
                    <div className="bk-doctor-avatar">👨‍⚕️</div>
                    <div className="bk-doctor-meta">
                      <span className="bk-doctor-item-name">{doc.name}</span>
                      <span className="bk-doctor-item-spec">{doc.specialty}</span>
                    </div>
                    {selectedDoctor === doc.id && <span className="bk-check">✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bk-slots-col">
              <h3 className="bk-col-title">{t('booking.available_slots')}</h3>
              {!selectedDoctor && (
                <div className="bk-slots-placeholder">
                  <div className="bk-slots-placeholder-icon">👈</div>
                  <p>{t('booking.select_specialist_first')}</p>
                </div>
              )}
              {selectedDoctor && !date && (
                <div className="bk-slots-placeholder">
                  <div className="bk-slots-placeholder-icon">📅</div>
                  <p>{t('booking.select_date_first')}</p>
                </div>
              )}
              {selectedDoctor && date && slots.length === 0 && (
                <div className="bk-slots-placeholder">
                  <div className="bk-slots-placeholder-icon">⏰</div>
                  <p>{t('booking.no_slots')}</p>
                </div>
              )}
              {selectedDoctor && date && slots.length > 0 && (
                <div className="bk-slots-grid">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      className={`bk-slot-btn ${selectedTime === slot ? 'bk-slot-selected' : ''}`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            {canGoToStep2 ? (
              <button onClick={() => setStep(2)} className="btn btn-primary btn-lg">
                {t('booking.continue')} →
              </button>
            ) : (
              <button disabled className="btn btn-ghost btn-lg">
                {t('booking.select_requirements')}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="booking-summary">
            <h3>{t('booking.summary_title')}</h3>
            <div className="summary-items">
              <span><strong>{t('booking.doctor_label')}:</strong> {doctors.find(d => d.id === selectedDoctor)?.name}</span>
              <span><strong>{t('booking.date_label_short')}:</strong> {date}</span>
              <span><strong>{t('booking.time_label')}:</strong> {selectedTime}</span>
            </div>
          </div>

          <div className="user-badge user-badge-logged">🔒 {t('booking.logged_in_as', { email: user.email })}</div>

          <div className="card">
            <h3 style={{ marginBottom: 20 }}>{t('booking.personal_data_title')}</h3>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('booking.rut_label')}</label>
                <input value={form.rut} disabled placeholder={t('booking.rut_placeholder')} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('booking.name_label')}</label>
                <input value={form.name} disabled placeholder={t('booking.name_placeholder')} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('booking.email_label')}</label>
                <input value={form.email} disabled placeholder={t('booking.email_placeholder')} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('booking.phone_label')}</label>
                <input value={form.phone} disabled placeholder={t('booking.phone_placeholder')} className="form-input" />
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
              {t('booking.profile_data_hint')}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(1)} className="btn btn-ghost btn-lg">
              ← {t('booking.back')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="btn btn-primary btn-lg"
            >
              {submitting ? t('booking.confirming') : t('booking.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
