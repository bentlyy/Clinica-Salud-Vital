import React, { useEffect, useState, useCallback } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/useAuth';
import { getMyStats } from '@/api/analytics';
import { getDoctorBookings } from '@/api/bookings';
import { getDoctorProfile } from '@/api/doctors';
import './DoctorDashboard.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatsData {
  todayBookings: number;
  patientsAttended: number;
  nextBooking: string;
  rating: number;
}

interface Booking {
  id: string;
  time: string;
  duration?: number;
  patientName: string;
  type: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
}

interface DoctorProfile {
  name: string;
  specialty: string;
  email: string;
}

interface CalendarDay {
  day: number;
  isToday: boolean;
  hasBookings: boolean;
  isCurrentMonth: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatTime = (iso: string): string => {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatMonthYear = (date: Date): string =>
  date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

function generateCalendarDays(year: number, month: number, bookedDates: number[]): CalendarDay[] {
  const today = new Date();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const days: CalendarDay[] = [];

  // Previous month fill
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({
      day: prevMonthLast - i,
      isToday: false,
      hasBookings: false,
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const isToday =
      d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    days.push({
      day: d,
      isToday,
      hasBookings: bookedDates.includes(d),
      isCurrentMonth: true,
    });
  }

  // Next month fill
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      isToday: false,
      hasBookings: false,
      isCurrentMonth: false,
    });
  }

  return days;
}

// ── Skeleton Components ────────────────────────────────────────────────────────

const StatSkeleton: React.FC = () => (
  <div className="dd-skeleton dd-skeleton--stat" />
);

const PatientSkeleton: React.FC = () => (
  <div className="dd-skeleton dd-skeleton--card" />
);

const SidebarSkeleton: React.FC = () => (
  <div className="dd-skeleton dd-skeleton--sidebar" />
);

// ── Status Badge ───────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: Booking['status']; t: (key: string) => string }> = ({
  status,
  t,
}) => {
  const labels: Record<string, string> = {
    confirmed: t('doctorDashboard.status.confirmed') || 'Confirmada',
    pending: t('doctorDashboard.status.pending') || 'Pendiente',
    completed: t('doctorDashboard.status.completed') || 'Atendida',
    cancelled: t('doctorDashboard.status.cancelled') || 'Cancelada',
  };

  return (
    <span className={`dd-status dd-status--${status}`}>
      <span className="dd-status__dot" />
      {labels[status] ?? status}
    </span>
  );
};

// ── Mini Calendar ──────────────────────────────────────────────────────────────

const MiniCalendar: React.FC<{ bookedDates: number[] }> = ({ bookedDates }) => {
  const now = new Date();
  const [viewDate, setViewDate] = useState(now);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = generateCalendarDays(year, month, bookedDates);

  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="dd-calendar">
      <div className="dd-calendar__header">
        <button className="dd-calendar__nav-btn" onClick={goPrev} aria-label="Mes anterior">
          ◀
        </button>
        <span className="dd-calendar__month">{formatMonthYear(viewDate)}</span>
        <button className="dd-calendar__nav-btn" onClick={goNext} aria-label="Mes siguiente">
          ▶
        </button>
      </div>
      <div className="dd-calendar__weekdays">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="dd-calendar__weekday">
            {wd}
          </div>
        ))}
      </div>
      <div className="dd-calendar__days">
        {days.map((d, i) => (
          <div
            key={`${d.isCurrentMonth ? 'c' : 'p'}-${d.day}-${i}`}
            className={[
              'dd-calendar__day',
              d.isToday && 'dd-calendar__day--today',
              d.hasBookings && 'dd-calendar__day--has-bookings',
              !d.isCurrentMonth && 'dd-calendar__day--other-month',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {d.day}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const DoctorDashboard: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doctorName = profile?.name ?? user?.name ?? 'Doctor';

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, bookingsRes, profileRes] = await Promise.allSettled([
        getMyStats(),
        getDoctorBookings(),
        getDoctorProfile(),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

      if (bookingsRes.status === 'fulfilled') {
        setBookings(Array.isArray(bookingsRes.value) ? bookingsRes.value : []);
      }

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value);
      }

      // Only fail if ALL requests failed
      const allFailed =
        statsRes.status === 'rejected' &&
        bookingsRes.status === 'rejected' &&
        profileRes.status === 'rejected';

      if (allFailed) {
        setError('No se pudieron cargar los datos del panel.');
      }
    } catch (err) {
      console.error('[DoctorDashboard] Fatal error:', err);
      setError('Error inesperado al cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Calendar booked dates (extract day numbers from bookings) ──────────────
  const bookedDates = bookings.map((b) => {
    try {
      return new Date(b.time).getDate();
    } catch {
      return 0;
    }
  });

  // ── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="doctor-dashboard">
        {/* Header skeleton */}
        <div className="dd-header">
          <div className="dd-skeleton dd-skeleton--title" />
          <div className="dd-skeleton dd-skeleton--subtitle" />
        </div>

        {/* Stats skeleton */}
        <div className="dd-stats">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>

        {/* Content skeleton */}
        <div className="dd-content">
          <div className="dd-panel">
            <div className="dd-panel__header">
              <div className="dd-skeleton" style={{ width: 180, height: 18 }} />
              <div className="dd-skeleton" style={{ width: 120, height: 14 }} />
            </div>
            <div className="dd-panel__body">
              <PatientSkeleton />
              <PatientSkeleton />
              <PatientSkeleton />
              <PatientSkeleton />
            </div>
          </div>
          <SidebarSkeleton />
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="doctor-dashboard">
        <div className="dd-error">
          <div className="dd-error__icon">⚠️</div>
          <h2 className="dd-error__title">Error al cargar el panel</h2>
          <p className="dd-error__text">{error}</p>
          <button className="dd-error__btn" onClick={fetchData}>
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Reminders (derived from bookings) ──────────────────────────────────────

  const upcomingBookings = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'pending')
    .slice(0, 3);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="doctor-dashboard">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <header className="dd-header">
        <h1 className="dd-header__title">
          {t('doctorDashboard.title') || 'Mi Panel'}
        </h1>
        <p className="dd-header__subtitle">
          {t('doctorDashboard.welcome') || 'Bienvenido'},{' '}
          <span>Dr. {doctorName}</span>
        </p>
      </header>

      {/* ── Stats Cards ─────────────────────────────────────────────── */}
      <div className="dd-stats">
        <div className="dd-stat-card">
          <div className="dd-stat-card__icon dd-stat-card__icon--teal">📅</div>
          <div className="dd-stat-card__info">
            <p className="dd-stat-card__label">
              {t('doctorDashboard.stats.todayBookings') || 'Citas Hoy'}
            </p>
            <p className="dd-stat-card__value dd-stat-card__value--teal">
              {stats?.todayBookings ?? 0}
            </p>
          </div>
        </div>

        <div className="dd-stat-card">
          <div className="dd-stat-card__icon dd-stat-card__icon--blue">✅</div>
          <div className="dd-stat-card__info">
            <p className="dd-stat-card__label">
              {t('doctorDashboard.stats.attended') || 'Atendidos'}
            </p>
            <p className="dd-stat-card__value dd-stat-card__value--blue">
              {stats?.patientsAttended ?? 0}
            </p>
          </div>
        </div>

        <div className="dd-stat-card">
          <div className="dd-stat-card__icon dd-stat-card__icon--amber">⏭️</div>
          <div className="dd-stat-card__info">
            <p className="dd-stat-card__label">
              {t('doctorDashboard.stats.nextBooking') || 'Próxima'}
            </p>
            <p className="dd-stat-card__value dd-stat-card__value--amber">
              {stats?.nextBooking ? formatTime(stats.nextBooking) : '—'}
            </p>
          </div>
        </div>

        <div className="dd-stat-card">
          <div className="dd-stat-card__icon dd-stat-card__icon--rose">⭐</div>
          <div className="dd-stat-card__info">
            <p className="dd-stat-card__label">
              {t('doctorDashboard.stats.rating') || 'Calificación'}
            </p>
            <p className="dd-stat-card__value dd-stat-card__value--rose">
              {stats?.rating != null ? `${stats.rating.toFixed(1)} / 5` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content (60/40) ────────────────────────────────────── */}
      <div className="dd-content">
        {/* ── Today's Patients (left) ────────────────────────────── */}
        <section className="dd-panel">
          <div className="dd-panel__header">
            <h2 className="dd-panel__title">
              {t('doctorDashboard.patients.title') || 'Pacientes de Hoy'}
            </h2>
            <span className="dd-panel__date">{formatDate(new Date())}</span>
          </div>

          <div className="dd-panel__body">
            {bookings.length === 0 ? (
              <div className="dd-empty">
                <div className="dd-empty__icon">📋</div>
                <h3 className="dd-empty__title">
                  {t('doctorDashboard.patients.empty.title') || 'Sin citas programadas'}
                </h3>
                <p className="dd-empty__text">
                  {t('doctorDashboard.patients.empty.text') ||
                    'No tienes citas programadas para hoy. ¡Disfruta tu día!'}
                </p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="dd-patient-card">
                  <div className="dd-patient-card__time">
                    <span className="dd-patient-card__time-badge">
                      {formatTime(booking.time)}
                    </span>
                    {booking.duration && (
                      <span className="dd-patient-card__duration">
                        {booking.duration} min
                      </span>
                    )}
                  </div>

                  <div className="dd-patient-card__divider" />

                  <div className="dd-patient-card__info">
                    <p className="dd-patient-card__name">{booking.patientName}</p>
                    <p className="dd-patient-card__type">{booking.type}</p>
                  </div>

                  <div className="dd-patient-card__actions">
                    <StatusBadge status={booking.status} t={t} />

                    {(booking.status === 'confirmed' || booking.status === 'pending') && (
                      <button
                        className="dd-btn dd-btn--primary"
                        onClick={() => {
                          /* navigate to consultation */
                        }}
                      >
                        {t('doctorDashboard.actions.attend') || 'Atender'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Side Panel (right) ──────────────────────────────────── */}
        <aside className="dd-panel">
          {/* Quick Actions */}
          <div className="dd-quick-actions">
            <h3 className="dd-panel__title" style={{ marginBottom: 4 }}>
              {t('doctorDashboard.quickActions.title') || 'Acciones Rápidas'}
            </h3>

            <button
              className="dd-quick-action"
              onClick={() => {
                /* navigate to availability */
              }}
            >
              <span className="dd-quick-action__icon">🗓️</span>
              <span className="dd-quick-action__text">
                {t('doctorDashboard.quickActions.availability') || 'Gestionar Disponibilidad'}
              </span>
              <span className="dd-quick-action__arrow">→</span>
            </button>

            <button
              className="dd-quick-action"
              onClick={() => {
                /* navigate to records */
              }}
            >
              <span className="dd-quick-action__icon">📁</span>
              <span className="dd-quick-action__text">
                {t('doctorDashboard.quickActions.records') || 'Ver Historiales'}
              </span>
              <span className="dd-quick-action__arrow">→</span>
            </button>
          </div>

          {/* Mini Calendar */}
          <MiniCalendar bookedDates={bookedDates} />

          {/* Upcoming Reminders */}
          {upcomingBookings.length > 0 && (
            <div className="dd-reminders">
              <h4 className="dd-reminders__title">
                {t('doctorDashboard.reminders.title') || 'Próximas Citas'}
              </h4>
              {upcomingBookings.map((b) => (
                <div key={b.id} className="dd-reminder-card">
                  <span className="dd-reminder-card__icon">🔔</span>
                  <div className="dd-reminder-card__content">
                    <p className="dd-reminder-card__text">
                      {b.patientName} — {b.type}
                    </p>
                    <p className="dd-reminder-card__time">{formatTime(b.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default DoctorDashboard;
