import { useEffect, useState } from 'react';
import { extractList } from '../utils/extract-list';
import {
  getAvailability,
  createAvailability,
  deleteAvailability
} from '../api/availability';
import { useI18n } from '../i18n/useI18n';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

const days = {
  0: { es: 'Domingo', en: 'Sunday', pt: 'Domingo', fr: 'Dimanche' },
  1: { es: 'Lunes', en: 'Monday', pt: 'Segunda', fr: 'Lundi' },
  2: { es: 'Martes', en: 'Tuesday', pt: 'Terça', fr: 'Mardi' },
  3: { es: 'Miércoles', en: 'Wednesday', pt: 'Quarta', fr: 'Mercredi' },
  4: { es: 'Jueves', en: 'Thursday', pt: 'Quinta', fr: 'Jeudi' },
  5: { es: 'Viernes', en: 'Friday', pt: 'Sexta', fr: 'Vendredi' },
  6: { es: 'Sábado', en: 'Saturday', pt: 'Sábado', fr: 'Samedi' },
};

const WEEKEND = [0, 6];

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
      setAvailability(extractList(data));
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

  const handleGenerateWeekday = async (d, start, end) => {
    try {
      setCreating(true);
      setError(null);
      const slots = generateSlots(start, end);
      for (const slot of slots) {
        if (exists(d, slot.start_time, slot.end_time)) continue;
        await createAvailability({
          day_of_week: d,
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

  const weekdays = availability.filter(a => !WEEKEND.includes(a.day_of_week));
  const weekends = availability.filter(a => WEEKEND.includes(a.day_of_week));
  const hasWeekendAvail = weekends.length > 0;

  return (
    <PageContainer maxWidth="md">
      <PageHeader title={t('doctor_availability.title')} />

      <Card variant="subtle" padding="md" style={{ marginBottom: 20, borderLeft: '4px solid var(--ds-primary-500)' }}>
        <strong>{t('availability_weekend_tip')}</strong>
      </Card>

      {error && <ErrorState message={error} />}

      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((d) => (
          <Button
            key={d}
            variant="outline"
            size="sm"
            onClick={() => handleGenerateWeekday(d, '09:00', '17:00')}
            disabled={creating}
          >
            {t('doctor_availability.generate_for')} {dayName(d)}
          </Button>
        ))}
        {!hasWeekendAvail && (
          <>
            {[0, 6].map((d) => (
              <Button
                key={d}
                variant="outline"
                size="sm"
                onClick={() => handleGenerateWeekday(d, '10:00', '14:00')}
                disabled={creating}
                style={{ borderColor: 'var(--ds-primary-400)', color: 'var(--ds-primary-600)' }}
              >
                {t('doctor_availability.generate_weekend')} {dayName(d)}
              </Button>
            ))}
          </>
        )}
      </div>

      <Card padding="md" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>{t('doctor_availability.add_title')}</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">{t('doctor_availability.day')}</label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="ds-input"
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
              className="ds-input"
              style={{ width: 'auto' }}
            />
          </div>
          <div>
            <label className="form-label">{t('doctor_availability.end_time')}</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="ds-input"
              style={{ width: 'auto' }}
            />
          </div>
          <Button variant="primary" onClick={handleCreate} disabled={creating}>
            {creating ? t('doctor_availability.generating') : t('doctor_availability.add')}
          </Button>
        </div>
      </Card>

      <h3 style={{ marginBottom: 16 }}>{t('doctor_availability.current')}</h3>

      {loading && <LoadingState message={t('doctor_availability.loading')} />}

      {!loading && availability.length === 0 && (
        <EmptyState
          icon="📅"
          title={t('doctor_availability.no_availability')}
          message={t('doctor_availability.no_availability_desc')}
        />
      )}

      {!loading && weekdays.length > 0 && (
        <>
          <h4 style={{ marginBottom: 10, color: 'var(--ds-text-secondary)', fontSize: 14, fontWeight: 600 }}>
            {t('availability_weekdays')}
          </h4>
          <div className="grid" style={{ gap: 10, marginBottom: 20 }}>
            {weekdays.map((a) => (
              <Card key={a.id} padding="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{dayName(a.day_of_week)}</strong>
                  <span style={{ color: 'var(--ds-text-secondary)', marginLeft: 12 }}>
                    {a.start_time} → {a.end_time}
                  </span>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleDelete(a.id)}>
                  {t('doctor_availability.delete')}
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}

      {!loading && (weekends.length > 0 || hasWeekendAvail) && (
        <>
          <h4 style={{ marginBottom: 10, color: 'var(--ds-text-secondary)', fontSize: 14, fontWeight: 600 }}>
            {t('availability_weekends')}
          </h4>
          <div className="grid" style={{ gap: 10 }}>
            {weekends.map((a) => (
              <Card key={a.id} padding="md" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderLeft: '4px solid var(--ds-primary-400)',
              }}>
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{dayName(a.day_of_week)}</strong>
                  <span style={{ color: 'var(--ds-text-secondary)', marginLeft: 12 }}>
                    {a.start_time} → {a.end_time}
                  </span>
                </div>
                <Button variant="danger" size="sm" onClick={() => handleDelete(a.id)}>
                  {t('doctor_availability.delete')}
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
