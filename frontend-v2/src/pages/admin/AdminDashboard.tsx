import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { getDashboardStats, getStatusDistribution } from '@/api/analytics';
import { getAllBookings } from '@/api/bookings';
import { getDoctors } from '@/api/doctors';
import './AdminDashboard.css';

/* ── types ────────────────────────────────────────────────────────── */

interface DashboardStats {
  totalDoctors: number;
  totalPatients: number;
  todayBookings: number;
  monthRevenue: number;
}

interface Booking {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface Doctor {
  id: string;
  name: string;
  specialty?: string;
}

interface StatusCount {
  status: string;
  count: number;
}

/* ── helpers ──────────────────────────────────────────────────────── */

const formatRevenue = (value: number) =>
  `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 0 })}`;

const statusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'badge-pending',
    confirmed: 'badge-confirmed',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
  };
  return map[status] ?? 'badge-pending';
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };
  return map[status] ?? status;
};

/* ── skeleton pieces ──────────────────────────────────────────────── */

const StatSkeleton = () => (
  <div className="stat-card skeleton-card">
    <div className="stat-icon skeleton-pulse" />
    <div className="stat-body">
      <div className="skeleton-line skeleton-line--value" />
      <div className="skeleton-line skeleton-line--label" />
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr className="skeleton-row">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i}>
        <div className="skeleton-line skeleton-line--table" />
      </td>
    ))}
  </tr>
);

/* ── component ────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const { t: _t } = useI18n();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [statusDist, setStatusDist] = useState<StatusCount[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* fetch all data in parallel ─────────────────────────────────── */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, bookingsRes, doctorsRes, statusRes] = await Promise.allSettled([
        getDashboardStats(),
        getAllBookings(),
        getDoctors(),
        getStatusDistribution(),
      ]);

      if (statsRes.status === 'fulfilled') {
        const raw = (statsRes.value as Record<string, unknown>).data ?? statsRes.value;
        setStats(raw as DashboardStats);
      }
      if (bookingsRes.status === 'fulfilled') {
        const raw = bookingsRes.value.data ?? bookingsRes.value;
        setBookings(Array.isArray(raw) ? raw : []);
      }
      if (doctorsRes.status === 'fulfilled') {
        const raw = doctorsRes.value.data ?? doctorsRes.value;
        setDoctors(Array.isArray(raw) ? raw : []);
      }
      if (statusRes.status === 'fulfilled') {
        const raw = statusRes.value.data ?? statusRes.value;
        setStatusDist(Array.isArray(raw) ? raw : []);
      }

      /* If every call failed we show an error */
      const allFailed = [statsRes, bookingsRes, doctorsRes, statusRes].every(
        (r) => r.status === 'rejected',
      );
      if (allFailed) throw new Error('No se pudieron cargar los datos del dashboard.');
    } catch (err: any) {
      setError(err?.message ?? 'Error inesperado al cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── derived values ──────────────────────────────────────────── */
  const recentBookings = bookings.slice(0, 5);
  const topDoctors = doctors.slice(0, 5);
  const totalStatusCount = statusDist.reduce((acc, s) => acc + s.count, 0);

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    confirmed: '#10b981',
    completed: '#3b82f6',
    cancelled: '#ef4444',
  };

  /* ── error state ─────────────────────────────────────────────── */
  if (error && !loading) {
    return (
      <div className="admin-dashboard">
        <div className="error-state">
          <div className="error-icon">!</div>
          <h3>Error al cargar el dashboard</h3>
          <p>{error}</p>
          <button className="btn-retry" onClick={fetchData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="admin-dashboard">
      {/* ── page header ────────────────────────────────────────── */}
      <header className="page-header">
        <div className="page-header-left">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-item">Admin</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-item breadcrumb-active">Dashboard</span>
          </nav>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Vista general de tu clinica</p>
        </div>
      </header>

      {/* ── stats grid ─────────────────────────────────────────── */}
      <section className="stats-grid" aria-label="Estadisticas generales">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon icon-teal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="stat-body">
                <span className="stat-value">{stats?.totalDoctors ?? 0}</span>
                <span className="stat-label">Doctores</span>
                <span className="stat-change positive">+12%</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="stat-body">
                <span className="stat-value">{stats?.todayBookings ?? 0}</span>
                <span className="stat-label">Citas Hoy</span>
                <span className="stat-change negative">-3%</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-amber">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="stat-body">
                <span className="stat-value">{stats?.totalPatients ?? 0}</span>
                <span className="stat-label">Pacientes</span>
                <span className="stat-change positive">+8%</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-rose">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="stat-body">
                <span className="stat-value">{formatRevenue(stats?.monthRevenue ?? 0)}</span>
                <span className="stat-label">Ingresos del Mes</span>
                <span className="stat-change positive">+18%</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── main content: table + sidebar ──────────────────────── */}
      <div className="dashboard-content">
        {/* ── recent bookings table ──────────────────────────── */}
        <section className="card card-table" aria-label="Citas recientes">
          <div className="card-header">
            <h2 className="card-title">Citas Recientes</h2>
            <a href="/admin/bookings" className="link-teal">
              Ver Todas
            </a>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Doctor</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : recentBookings.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={6}>No hay citas registradas.</td>
                  </tr>
                ) : (
                  recentBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="cell-patient">{b.patientName}</td>
                      <td>{b.doctorName}</td>
                      <td>{b.date}</td>
                      <td>{b.time}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(b.status)}`}>
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-icon"
                          title="Ver detalles"
                          aria-label={`Ver detalles de cita de ${b.patientName}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── sidebar panels ─────────────────────────────────── */}
        <aside className="dashboard-sidebar">
          {/* top doctors */}
          <section className="card" aria-label="Doctores destacados">
            <div className="card-header">
              <h2 className="card-title">Doctores Destacados</h2>
            </div>
            <ul className="doctor-list">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <li key={i} className="doctor-item skeleton-card">
                      <div className="doctor-avatar skeleton-pulse" />
                      <div className="skeleton-line skeleton-line--short" />
                    </li>
                  ))
                : topDoctors.map((doc) => (
                    <li key={doc.id} className="doctor-item">
                      <div className="doctor-avatar">
                        {doc.name
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="doctor-info">
                        <span className="doctor-name">{doc.name}</span>
                        {doc.specialty && (
                          <span className="doctor-specialty">{doc.specialty}</span>
                        )}
                      </div>
                    </li>
                  ))}
            </ul>
          </section>

          {/* status distribution */}
          <section className="card" aria-label="Distribucion de estados">
            <div className="card-header">
              <h2 className="card-title">Distribucion por Estado</h2>
            </div>
            <div className="status-bars">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="status-bar-row skeleton-card">
                      <div className="skeleton-line skeleton-line--medium" />
                      <div className="skeleton-line skeleton-line--bar" />
                    </div>
                  ))
                : statusDist.map((s) => {
                    const pct = totalStatusCount > 0 ? (s.count / totalStatusCount) * 100 : 0;
                    return (
                      <div key={s.status} className="status-bar-row">
                        <div className="status-bar-header">
                          <span className={`badge badge-dot ${statusBadgeClass(s.status)}`}>
                            {statusLabel(s.status)}
                          </span>
                          <span className="status-bar-count">{s.count}</span>
                        </div>
                        <div className="status-bar-track">
                          <div
                            className="status-bar-fill"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: statusColors[s.status] ?? '#94a3b8',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
