import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { extractList } from '../utils/extract-list';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createBooking } from '../api/bookings';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { PageContainer } from '../components/ui/PageContainer';

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  [key: string]: unknown;
}

const BookingPage = React.memo(function BookingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const controller = new AbortController();
    getDoctors({ signal: controller.signal })
      .then((data) => {
        setDoctors(extractList(data));
        const doctorParam = searchParams.get('doctor');
        if (doctorParam) {
          const id = Number(doctorParam);
          if (data.some((d: Doctor) => d.id === id)) {
            setSelectedDoctor(id);
          }
        }
      })
      .catch(() => setError(t('booking.error')))
      .finally(() => setLoadingDoctors(false));
    return () => controller.abort();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedDoctor || !date) return;
    const controller = new AbortController();
    getAvailableSlots(selectedDoctor, date, { signal: controller.signal })
      .then((data) => { setSlots(extractList(data)); setSelectedTime(null); })
      .catch(() => setError(t('booking.error')));
    return () => controller.abort();
  }, [selectedDoctor, date]);

  const handleConfirm = useCallback(async () => {
    if (submitting) return;

    setError(null);
    if (!selectedDoctor) {
      setError(t('booking.select_doctor_error') || 'Debe seleccionar un doctor');
      return;
    }
    if (!date) {
      setError(t('booking.select_date_error') || 'Debe seleccionar una fecha');
      return;
    }
    if (!selectedTime) {
      setError(t('booking.select_time_error') || 'Debe seleccionar un horario');
      return;
    }

    try {
      setSubmitting(true);

      await createBooking({
        doctor_id: selectedDoctor,
        date,
        time: selectedTime,
      });

      setSuccess(true);
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.error || t('booking.error'));
      } else {
        setError(t('booking.error'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, selectedDoctor, date, selectedTime, t]);

  const canGoToStep2 = selectedDoctor && date && selectedTime;

  if (success) {
    return (
      <PageContainer maxWidth="sm">
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div className="bk-success-icon">✅</div>
          <h2 className="bk-success-title">{t('booking.success_title')}</h2>
          <p className="bk-success-desc">
            {t('booking.success_desc', { email: form.email })}
          </p>
          <div className="bk-success-actions">
            <Button variant="primary" onClick={() => navigate('/my-bookings')}>
              {t('booking.view_bookings')}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {t('booking.back_home')}
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md">
      <h1 className="bk-page-title">{t('booking.title')}</h1>

      {error && <Alert variant="error">{error}</Alert>}

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
          <div className="form-group bk-form-group-narrow">
            <label className="form-label" htmlFor="booking-date">{t('booking.date_label')}</label>
            <input
              id="booking-date"
              type="date"
              value={date}
              min={today}
              onChange={(e) => { setDate(e.target.value); setSlots([]); setSelectedTime(null); }}
              className="ds-input"
            />
          </div>

          <div className="bk-two-col">
            <div className="bk-doctors-col">
              <h3 className="bk-col-title">{t('booking.select_doctor')}</h3>
              {loadingDoctors && <p className="bk-loading-doctors">{t('booking.loading_doctors')}</p>}
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

          <div className="bk-nav-row">
            {canGoToStep2 ? (
              <Button variant="primary" size="lg" onClick={() => setStep(2)}>
                {t('booking.continue')} →
              </Button>
            ) : (
              <Button variant="ghost" size="lg" disabled>
                {t('booking.select_requirements')}
              </Button>
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

          <Card padding="md">
            <h3 className="bk-section-title">{t('booking.personal_data_title')}</h3>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">{t('booking.rut_label')}</label>
                <input value={form.rut} disabled placeholder={t('booking.rut_placeholder')} className="ds-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('booking.name_label')}</label>
                <input value={form.name} disabled placeholder={t('booking.name_placeholder')} className="ds-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('booking.email_label')}</label>
                <input value={form.email} disabled placeholder={t('booking.email_placeholder')} className="ds-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t('booking.phone_label')}</label>
                <input value={form.phone} disabled placeholder={t('booking.phone_placeholder')} className="ds-input" />
              </div>
            </div>

            <p className="bk-profile-hint">
              {t('booking.profile_data_hint')}
            </p>
          </Card>

          <div className="bk-action-row">
            <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
              ← {t('booking.back')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting ? t('booking.confirming') : t('booking.confirm')}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
});

export default BookingPage;
