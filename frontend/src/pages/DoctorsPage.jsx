import { useEffect, useState } from 'react';
import { getDoctors } from '../api/doctors';
import { getAvailableSlots, createBooking } from '../api/bookings';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

export default function DoctorsPage() {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await getDoctors({ signal: controller.signal });
        setDoctors(Array.isArray(data) ? data : (data.data || []));
      } catch {
        setError(t('doctors.error'));
      } finally {
        setLoadingDoctors(false);
      }
    })();
    return () => controller.abort();
  }, [t]);

  useEffect(() => {
    if (!selectedDoctor || !date) return;
    const controller = new AbortController();

    (async () => {
      try {
        setLoadingSlots(true);
        setError(null);
        setSuccessMsg(null);

        const data = await getAvailableSlots(selectedDoctor, date, { signal: controller.signal });
        setSlots(Array.isArray(data) ? data : []);
        setSelectedTime(null);
      } catch {
        setError(t('doctors.error'));
      } finally {
        setLoadingSlots(false);
      }
    })();

    return () => controller.abort();
  }, [selectedDoctor, date, t]);

  const handleBooking = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      await createBooking({ doctor_id: selectedDoctor, date, time: selectedTime });

      setSuccessMsg(t('doctors.success_create'));

      const updated = await getAvailableSlots(selectedDoctor, date);
      setSlots(Array.isArray(updated) ? updated : []);
      setSelectedTime(null);
    } catch (err) {
      setError(err.response?.data?.error || t('doctors.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>{t('doctors.title')}</h2>

      <button onClick={() => navigate('/my-bookings')}>{t('doctors.columns')}</button>

      <hr />

      {error && (
        <div style={{ background: '#f44336', color: '#fff', padding: '10px', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#4CAF50', color: '#fff', padding: '10px', marginBottom: '10px' }}>
          {successMsg}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label>{t('doctors.subtitle')}</label><br />
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => {
            setDate(e.target.value);
            setSlots([]);
            setSelectedTime(null);
            setSuccessMsg(null);
          }}
        />
      </div>

      <h3>{t('doctors.subtitle')}</h3>

      {loadingDoctors && <p>{t('doctors.loading')}</p>}

      <div style={{ display: 'grid', gap: '10px' }}>
        {doctors.map((doc) => (
          <div
            key={doc.id}
            onClick={() => {
              setSelectedDoctor(doc.id);
              setSlots([]);
              setSelectedTime(null);
              setSuccessMsg(null);
            }}
            style={{
              border: selectedDoctor === doc.id ? '2px solid #4CAF50' : '1px solid #ccc',
              padding: '10px',
              borderRadius: '6px',
              cursor: 'pointer',
              background: selectedDoctor === doc.id ? '#e8f5e9' : '#fff',
            }}
          >
            <h4>{doc.name}</h4>
            <p>{doc.specialty}</p>
          </div>
        ))}
      </div>

      <hr />

      {selectedDoctor && date && (
        <div>
          <h3>{t('doctors.columns')}</h3>

          {loadingSlots && <p>{t('doctors.loading')}</p>}

          {!loadingSlots && slots.length === 0 && (
            <p>{t('doctors.empty_desc')}</p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedTime(slot)}
                style={{
                  margin: '5px',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  background: selectedTime === slot ? '#4CAF50' : '#eee',
                  color: selectedTime === slot ? '#fff' : '#000',
                }}
              >
                {slot}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '15px' }}>
            <button
              disabled={!selectedTime || submitting}
              onClick={handleBooking}
              style={{
                padding: '10px 20px',
                background: '#4CAF50',
                color: '#fff',
                border: 'none',
                cursor: selectedTime && !submitting ? 'pointer' : 'not-allowed',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? t('doctors.saving') : t('doctors.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
