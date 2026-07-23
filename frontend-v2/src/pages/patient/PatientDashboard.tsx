import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { getMyBookings } from '@/api/bookings';
import { getClinicalRecords } from '@/api/clinical-records';
import { getMyStats } from '@/api/analytics';
import './PatientDashboard.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Stats {
  nextBooking: string | null;
  totalRecords: number;
  labResults: number;
  pendingInvoices: number;
}

interface Booking {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: string;
}

interface ClinicalRecord {
  id: string;
  date: string;
  doctor: string;
  diagnosis: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(time: string): string {
  return time;
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    completed: 'pd-record__badge--completed',
    completado: 'pd-record__badge--completed',
    pending: 'pd-record__badge--pending',
    pendiente: 'pd-record__badge--pending',
    'in-progress': 'pd-record__badge--in-progress',
    'en-progreso': 'pd-record__badge--in-progress',
  };
  return map[status.toLowerCase()] ?? 'pd-record__badge--pending';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'Completado',
    completado: 'Completado',
    pending: 'Pendiente',
    pendiente: 'Pendiente',
    'in-progress': 'En progreso',
    'en-progreso': 'En progreso',
  };
  return map[status.toLowerCase()] ?? status;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PatientDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();

  /* ---------- state ---------- */
  const [stats, setStats] = useState<Stats | null>(null);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------- data fetching ---------- */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, bookingsRes, recordsRes] = await Promise.all([
        getMyStats(),
        getMyBookings(),
        getClinicalRecords(),
      ]);

      setStats(statsRes);

      // Find next upcoming booking
      const upcoming = bookingsRes.find(
        (b: Booking) =>
          b.status === 'confirmed' || b.status === 'pending' || b.status === 'pendiente'
      );
      setNextBooking(upcoming ?? null);

      // Latest 5 records
      const sorted = [...recordsRes].sort(
        (a: ClinicalRecord, b: ClinicalRecord) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setRecords(sorted.slice(0, 5));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar los datos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- navigate helpers ---------- */
  const goToBooking = () => navigate('/bookings/new');
  const goToRecords = () => navigate('/medical-records');
  const goToResults = () => navigate('/lab-results');
  const goToBookingDetail = (id?: string) =>
    navigate(id ? `/bookings/${id}` : '/bookings');

  /* ======================== RENDER ======================== */

  /* --- Loading state --- */
  if (loading) {
    return (
      <div className="patient-dashboard">
        <div className="pd-skeleton pd-skeleton--featured" />
        <div className="pd-stats">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="pd-skeleton pd-skeleton--card" />
          ))}
        </div>
        <div className="pd-columns">
          <div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="pd-skeleton pd-skeleton--record" />
            ))}
          </div>
          <div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="pd-skeleton pd-skeleton--action" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* --- Error state --- */
  if (error) {
    return (
      <div className="patient-dashboard">
        <div className="pd-error">
          <div className="pd-error__icon">⚠️</div>
          <h2 className="pd-error__title">
            {t('patientDashboard.errorTitle') ?? 'Error al cargar el panel'}
          </h2>
          <p className="pd-error__message">{error}</p>
          <button className="pd-error__retry" onClick={fetchData}>
            {t('patientDashboard.retry') ?? 'Reintentar'}
          </button>
        </div>
      </div>
    );
  }

  /* --- Normal state --- */
  return (
    <div className="patient-dashboard">
      {/* ========== HEADER ========== */}
      <header className="pd-header">
        <h1 className="pd-header__title">
          {t('patientDashboard.title') ?? 'Mi Panel'}
        </h1>
        <p className="pd-header__subtitle">
          {t('patientDashboard.welcome') ?? 'Bienvenido'},{' '}
          <strong>{t('patientDashboard.patientName') ?? 'Paciente'}</strong>
        </p>
      </header>

      {/* ========== STATS CARDS ========== */}
      <section className="pd-stats">
        <div className="pd-stat-card">
          <div className="pd-stat-card__icon pd-stat-card__icon--teal">📅</div>
          <div className="pd-stat-card__info">
            <span className="pd-stat-card__value">
              {stats?.nextBooking ? formatShortDate(stats.nextBooking) : '—'}
            </span>
            <span className="pd-stat-card__label">
              {t('patientDashboard.nextAppointment') ?? 'Próxima Cita'}
            </span>
          </div>
        </div>

        <div className="pd-stat-card">
          <div className="pd-stat-card__icon pd-stat-card__icon--blue">📁</div>
          <div className="pd-stat-card__info">
            <span className="pd-stat-card__value">{stats?.totalRecords ?? 0}</span>
            <span className="pd-stat-card__label">
              {t('patientDashboard.records') ?? 'Historiales'}
            </span>
          </div>
        </div>

        <div className="pd-stat-card">
          <div className="pd-stat-card__icon pd-stat-card__icon--amber">🧪</div>
          <div className="pd-stat-card__info">
            <span className="pd-stat-card__value">{stats?.labResults ?? 0}</span>
            <span className="pd-stat-card__label">
              {t('patientDashboard.labResults') ?? 'Resultados Lab'}
            </span>
          </div>
        </div>

        <div className="pd-stat-card">
          <div className="pd-stat-card__icon pd-stat-card__icon--rose">💳</div>
          <div className="pd-stat-card__info">
            <span className="pd-stat-card__value">
              {stats?.pendingInvoices ?? 0}
            </span>
            <span className="pd-stat-card__label">
              {t('patientDashboard.invoices') ?? 'Facturas'}
            </span>
          </div>
        </div>
      </section>

      {/* ========== FEATURED APPOINTMENT ========== */}
      {nextBooking ? (
        <section className="pd-featured">
          <span className="pd-featured__badge">● Próxima cita</span>
          <div className="pd-featured__content">
            <div className="pd-featured__info">
              <h2 className="pd-featured__doctor">{nextBooking.doctorName}</h2>
              <p className="pd-featured__specialty">{nextBooking.specialty}</p>
              <div className="pd-featured__meta">
                <span className="pd-featured__meta-item">
                  <span className="pd-featured__meta-icon">📆</span>
                  {formatDate(nextBooking.date)}
                </span>
                <span className="pd-featured__meta-item">
                  <span className="pd-featured__meta-icon">🕐</span>
                  {formatTime(nextBooking.time)}
                </span>
              </div>
            </div>
            <div className="pd-featured__actions">
              <button
                className="pd-featured__btn pd-featured__btn--ghost"
                type="button"
              >
                Cancelar
              </button>
              <button
                className="pd-featured__btn pd-featured__btn--primary"
                type="button"
                onClick={() => goToBookingDetail(nextBooking.id)}
              >
                Ver Detalles
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="pd-featured pd-featured--empty">
          <div className="pd-featured__icon">📋</div>
          <p className="pd-featured__empty-text">
            {t('patientDashboard.noAppointments') ?? 'No hay citas programadas'}
          </p>
          <p className="pd-featured__empty-sub">
            {t('patientDashboard.bookNow') ?? 'Reserva tu próxima cita ahora'}
          </p>
          <button
            className="pd-featured__btn pd-featured__btn--primary"
            type="button"
            onClick={goToBooking}
          >
            {t('patientDashboard.bookAppointment') ?? 'Reservar Cita'}
          </button>
        </section>
      )}

      {/* ========== TWO-COLUMN CONTENT ========== */}
      <div className="pd-columns">
        {/* --- LEFT: Recent Records --- */}
        <div className="pd-panel">
          <div className="pd-panel__header">
            <h3 className="pd-panel__title">
              {t('patientDashboard.recentRecords') ?? 'Historial Reciente'}
            </h3>
            <button
              className="pd-panel__link"
              onClick={goToRecords}
              type="button"
            >
              {t('patientDashboard.viewAll') ?? 'Ver todo'} →
            </button>
          </div>

          <div className="pd-records">
            {records.length === 0 ? (
              <div className="pd-records-empty">
                <div className="pd-records-empty__icon">📂</div>
                <p className="pd-records-empty__text">
                  {t('patientDashboard.noRecords') ??
                    'Aún no tienes historiales clínicos'}
                </p>
              </div>
            ) : (
              records.map((record) => (
                <div className="pd-record" key={record.id}>
                  <div className="pd-record__icon">🩺</div>
                  <div className="pd-record__details">
                    <p className="pd-record__diagnosis">{record.diagnosis}</p>
                    <div className="pd-record__meta">
                      <span>{formatShortDate(record.date)}</span>
                      <span>Dr. {record.doctor}</span>
                    </div>
                  </div>
                  <span className={`pd-record__badge ${statusBadgeClass(record.status)}`}>
                    {statusLabel(record.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- RIGHT: Quick Actions --- */}
        <div className="pd-panel">
          <div className="pd-panel__header">
            <h3 className="pd-panel__title">
              {t('patientDashboard.quickActions') ?? 'Acciones Rápidas'}
            </h3>
          </div>

          <div className="pd-actions">
            <button className="pd-action" type="button" onClick={goToBooking}>
              <div className="pd-action__icon pd-action__icon--teal">📅</div>
              <div className="pd-action__text">
                <p className="pd-action__title">
                  {t('patientDashboard.bookCta') ?? 'Reservar Cita'}
                </p>
                <p className="pd-action__desc">
                  {t('patientDashboard.bookCtaDesc') ?? 'Elige especialidad y horario'}
                </p>
              </div>
              <span className="pd-action__arrow">→</span>
            </button>

            <button className="pd-action" type="button" onClick={goToRecords}>
              <div className="pd-action__icon pd-action__icon--blue">📁</div>
              <div className="pd-action__text">
                <p className="pd-action__title">
                  {t('patientDashboard.viewRecordsCta') ?? 'Ver Mi Historial'}
                </p>
                <p className="pd-action__desc">
                  {t('patientDashboard.viewRecordsCtaDesc') ??
                    'Diagnósticos, tratamientos y notas'}
                </p>
              </div>
              <span className="pd-action__arrow">→</span>
            </button>

            <button className="pd-action" type="button" onClick={goToResults}>
              <div className="pd-action__icon pd-action__icon--amber">🧪</div>
              <div className="pd-action__text">
                <p className="pd-action__title">
                  {t('patientDashboard.viewResultsCta') ?? 'Ver Resultados'}
                </p>
                <p className="pd-action__desc">
                  {t('patientDashboard.viewResultsCtaDesc') ??
                    'Exámenes de laboratorio y resultados'}
                </p>
              </div>
              <span className="pd-action__arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
