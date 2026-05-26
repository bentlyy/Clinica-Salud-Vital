import { useEffect, useState } from 'react';
import {
  getAvailability,
  createAvailability,
  deleteAvailability
} from '../api/availability';
import { useI18n } from '../i18n/useI18n';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

const days = {
  0: { es: 'Domingo', en: 'Sunday', pt: 'Domingo', fr: 'Dimanche' },
  1: { es: 'Lunes', en: 'Monday', pt: 'Segunda', fr: 'Lundi' },
  2: { es: 'Martes', en: 'Tuesday', pt: 'Terça', fr: 'Mardi' },
  3: { es: 'Miércoles', en: 'Wednesday', pt: 'Quarta', fr: 'Mercredi' },
  4: { es: 'Jueves', en: 'Thursday', pt: 'Quinta', fr: 'Jeudi' },
  5: { es: 'Viernes', en: 'Friday', pt: 'Sexta', fr: 'Vendredi' },
  6: { es: 'Sábado', en: 'Saturday', pt: 'Sábado', fr: 'Samedi' },
};

export default function DoctorAvailabilityPage() {
  const { t, locale } = useI18n();
  const [availability, setAvailability] = useState([]);

  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAvailability();
      setAvailability(data);
    } catch {
      setError(t('doctor_availability.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const generateSlots = (start, end) => {
    const slots = [];
    let current = start;
    while (current < end) {
      const next = add30(current);
      slots.push({ start_time: current, end_time: next });
      current = next;
    }
    return slots;
  };

  const add30 = (time) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + 30);
    return d.toTimeString().slice(0, 5);
  };

  const exists = (day, start, end) => {
    return availability.some(a =>
      a.day_of_week === day &&
      a.start_time === start &&
      a.end_time === end
    );
  };

  const handleCreate = async () => {
    if (startTime >= endTime) {
      return setError(t('doctor_availability.invalid_time'));
    }
    try {
      setCreating(true);
      setError(null);
      const slots = generateSlots(startTime, endTime);
      for (const slot of slots) {
        if (exists(day, slot.start_time, slot.end_time)) continue;
        await createAvailability({
          day_of_week: day,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      }
      await fetchAvailability();
    } catch (err) {
      setError(err.response?.data?.error || t('doctor_availability.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateDefault = async () => {
    try {
      setCreating(true);
      setError(null);
      const friday = 5;
      const slots = generateSlots('08:00', '17:00');
      for (const slot of slots) {
        if (exists(friday, slot.start_time, slot.end_time)) continue;
        await createAvailability({
          day_of_week: friday,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      }
      await fetchAvailability();
    } catch {
      setError(t('doctor_availability.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm(t('doctor_availability.confirm_delete'));
    if (!ok) return;
    try {
      await deleteAvailability(id);
      setAvailability(prev => prev.filter(a => a.id !== id));
    } catch {
      setError(t('doctor_availability.delete_error'));
    }
  };

  const dayName = (d) => days[d]?.[locale] || days[d]?.es || '';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t('doctor_availability.title')}</h1>
      </div>

      {error && <ErrorState message={error} />}

      <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <button onClick={handleGenerateDefault} disabled={creating} className="btn btn-outline">
          {t('doctor_availability.generate_default')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>{t('doctor_availability.add_title')}</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">{t('doctor_availability.day')}</label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="form-input"
              style={{ width: 'auto' }}
            >
              {Object.entries(days).map(([key, val]) => (
                <option key={key} value={key}>{val[locale] || val.es}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">{t('doctor_availability.start_time')}</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="form-input"
              style={{ width: 'auto' }}
            />
          </div>
          <div>
            <label className="form-label">{t('doctor_availability.end_time')}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="form-input"
              style={{ width: 'auto' }}
            />
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn btn-primary">
            {creating ? t('doctor_availability.generating') : t('doctor_availability.add')}
          </button>
        </div>
      </div>

      <h3 style={{ marginBottom: 16 }}>{t('doctor_availability.current')}</h3>

      {loading && <LoadingState message={t('doctor_availability.loading')} />}

      {!loading && availability.length === 0 && (
        <EmptyState
          icon="📅"
          title={t('doctor_availability.no_availability')}
          message={t('doctor_availability.no_availability_desc')}
        />
      )}

      <div className="grid" style={{ gap: 10 }}>
        {availability.map((a) => (
          <div key={a.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
            <div>
              <strong style={{ fontSize: '0.95rem' }}>{dayName(a.day_of_week)}</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 12 }}>
                {a.start_time} → {a.end_time}
              </span>
            </div>
            <button onClick={() => handleDelete(a.id)} className="btn btn-danger btn-sm">
              {t('doctor_availability.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
