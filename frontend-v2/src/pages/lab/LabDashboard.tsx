import { useState, useEffect } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/useAuth';
import {
  getLabDashboard,
  getLabRequests,
  getLabAreas,
  type LabRequest,
  type LabSample,
} from '@/api/laboratory';
import './LabDashboard.css';

/* ── types ────────────────────────────────────────────────────────── */

interface LabDashboardStats {
  pendingSamples: number;
  inProcess: number;
  completed: number;
  alerts: number;
}

interface LabArea {
  id: number;
  name: string;
  pendingCount: number;
  status: string;
}

/* ── helpers ──────────────────────────────────────────────────────── */

const formatTime = (dateStr: string): string => {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `Hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `Hace ${diffD}d`;
  } catch {
    return '--';
  }
};

const areaStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    active: 'ld-area-status--active',
    busy: 'ld-area-status--busy',
    inactive: 'ld-area-status--inactive',
  };
  return map[status] ?? 'ld-area-status--inactive';
};

const sampleStatusColumn = (status: string): 'pending' | 'in-process' | 'completed' => {
  const map: Record<string, 'pending' | 'in-process' | 'completed'> = {
    pending: 'pending',
    in_process: 'in-process',
    'in-progress': 'in-process',
    inprocess: 'in-process',
    completed: 'completed',
    done: 'completed',
  };
  return map[status?.toLowerCase()] ?? 'pending';
};

/* ── skeleton pieces ──────────────────────────────────────────────── */

const StatSkeleton = () => (
  <div className="ld-stat-card ld-skeleton-card">
    <div className="ld-stat-icon ld-skeleton ld-skeleton--icon" />
    <div className="ld-stat-body">
      <div className="ld-skeleton ld-skeleton--value" />
      <div className="ld-skeleton ld-skeleton--label" />
    </div>
  </div>
);

const KanbanSkeleton = () => (
  <div className="ld-kanban-column">
    <div className="ld-skeleton ld-skeleton--column-title" />
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="ld-sample-card ld-skeleton-card" />
    ))}
  </div>
);

const AreaSkeleton = () => (
  <div className="ld-area-card ld-skeleton-card" />
);

/* ── component ────────────────────────────────────────────────────── */

export default function LabDashboard() {
  const { t: _t } = useI18n();
  const { user } = useAuth();

  const [stats, setStats] = useState<LabDashboardStats | null>(null);
  const [samples, setSamples] = useState<LabSample[]>([]);
  const [areas, setAreas] = useState<LabArea[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* fetch all data in parallel */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, requestsRes, areasRes] = await Promise.allSettled([
        getLabDashboard(),
        getLabRequests(),
        getLabAreas(),
      ]);

      if (dashboardRes.status === 'fulfilled') {
        const raw = dashboardRes.value?.data ?? dashboardRes.value;
        setStats({
          pendingSamples: raw.pendingSamples ?? 0,
          inProcess: raw.inProcess ?? 0,
          completed: raw.completed ?? 0,
          alerts: raw.alerts ?? 0,
        });
      }

      if (requestsRes.status === 'fulfilled') {
        const raw = requestsRes.value?.data ?? requestsRes.value;
        /* Map requests to samples for the kanban view */
        const mapped: LabSample[] = (Array.isArray(raw) ? raw : []).map(
          (r: LabRequest) => ({
            id: r.id,
            barcode: `LAB-${String(r.id).padStart(4, '0')}`,
            status: r.status,
            area_name: 'General',
            created_at: r.created_at,
            patient_name: r.patient_name,
            doctor_name: r.doctor_name,
            items_count: r.items_count,
          }),
        );
        setSamples(mapped);
      }

      if (areasRes.status === 'fulfilled') {
        const raw = areasRes.value?.data ?? areasRes.value;
        setAreas(Array.isArray(raw) ? raw : []);
      }

      const allFailed = [dashboardRes, requestsRes, areasRes].every(
        (r) => r.status === 'rejected',
      );
      if (allFailed) throw new Error('No se pudieron cargar los datos del laboratorio.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado al cargar el dashboard.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* derived values */
  const pendingSamples = samples.filter((s) => sampleStatusColumn(s.status) === 'pending');
  const inProcessSamples = samples.filter((s) => sampleStatusColumn(s.status) === 'in-process');
  const completedSamples = samples.filter((s) => sampleStatusColumn(s.status) === 'completed');

  const displayName = user?.name ?? 'Tecnico';

  /* ── error state ─────────────────────────────────────────────── */
  if (error && !loading) {
    return (
      <div className="lab-dashboard">
        <div className="ld-error">
          <div className="ld-error__icon">&#9888;</div>
          <h3 className="ld-error__title">Error al cargar el dashboard</h3>
          <p className="ld-error__text">{error}</p>
          <button className="ld-error__btn" onClick={fetchData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div className="lab-dashboard">
      {/* ── page header ────────────────────────────────────────── */}
      <header className="ld-header">
        <div className="ld-header-left">
          <nav className="ld-breadcrumb" aria-label="Breadcrumb">
            <span className="ld-breadcrumb-item">Laboratorio</span>
            <span className="ld-breadcrumb-sep">/</span>
            <span className="ld-breadcrumb-item ld-breadcrumb-active">Panel</span>
          </nav>
          <h1 className="ld-header__title">Panel Laboratorio</h1>
          <p className="ld-header__subtitle">
            Bienvenido, <span>{displayName}</span>
          </p>
        </div>
      </header>

      {/* ── stats grid ─────────────────────────────────────────── */}
      <section className="ld-stats" aria-label="Estadisticas del laboratorio">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="ld-stat-card">
              <div className="ld-stat-icon ld-stat-icon--amber">&#128230;</div>
              <div className="ld-stat-body">
                <span className="ld-stat-value ld-stat-value--amber">
                  {stats?.pendingSamples ?? 0}
                </span>
                <span className="ld-stat-label">Pendientes</span>
              </div>
            </div>

            <div className="ld-stat-card">
              <div className="ld-stat-icon ld-stat-icon--blue">&#9881;&#65039;</div>
              <div className="ld-stat-body">
                <span className="ld-stat-value ld-stat-value--blue">
                  {stats?.inProcess ?? 0}
                </span>
                <span className="ld-stat-label">En Proceso</span>
              </div>
            </div>

            <div className="ld-stat-card">
              <div className="ld-stat-icon ld-stat-icon--green">&#9989;</div>
              <div className="ld-stat-body">
                <span className="ld-stat-value ld-stat-value--green">
                  {stats?.completed ?? 0}
                </span>
                <span className="ld-stat-label">Completadas</span>
              </div>
            </div>

            <div className="ld-stat-card">
              <div className="ld-stat-icon ld-stat-icon--red">&#9888;&#65039;</div>
              <div className="ld-stat-body">
                <span className="ld-stat-value ld-stat-value--red">
                  {stats?.alerts ?? 0}
                </span>
                <span className="ld-stat-label">Alertas</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── work queue kanban ──────────────────────────────────── */}
      <section className="ld-kanban-section" aria-label="Cola de trabajo">
        <div className="ld-section-header">
          <h2 className="ld-section-title">Cola de Trabajo</h2>
        </div>

        <div className="ld-kanban">
          {loading ? (
            <>
              <KanbanSkeleton />
              <KanbanSkeleton />
              <KanbanSkeleton />
            </>
          ) : (
            <>
              {/* ── Pendiente ──────────────────────────── */}
              <div className="ld-kanban-column">
                <div className="ld-kanban-column__header ld-kanban-column__header--pending">
                  <span className="ld-kanban-column__dot ld-kanban-column__dot--pending" />
                  <h3 className="ld-kanban-column__title">Pendiente</h3>
                  <span className="ld-kanban-column__count">{pendingSamples.length}</span>
                </div>
                <div className="ld-kanban-column__body">
                  {pendingSamples.length === 0 ? (
                    <div className="ld-kanban-empty">Sin muestras pendientes</div>
                  ) : (
                    pendingSamples.map((sample) => (
                      <div key={sample.id} className="ld-sample-card">
                        <div className="ld-sample-card__header">
                          <span className="ld-sample-card__barcode">{sample.barcode}</span>
                          <span className="ld-sample-card__time">
                            {formatTime(sample.created_at)}
                          </span>
                        </div>
                        <p className="ld-sample-card__patient">
                          {sample.patient_name ?? 'Paciente'}
                        </p>
                        <div className="ld-sample-card__meta">
                          <span className="ld-sample-card__area">{sample.area_name}</span>
                          <span className="ld-sample-card__drag">&#8942;</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── En Proceso ─────────────────────────── */}
              <div className="ld-kanban-column">
                <div className="ld-kanban-column__header ld-kanban-column__header--inprocess">
                  <span className="ld-kanban-column__dot ld-kanban-column__dot--inprocess" />
                  <h3 className="ld-kanban-column__title">En Proceso</h3>
                  <span className="ld-kanban-column__count">{inProcessSamples.length}</span>
                </div>
                <div className="ld-kanban-column__body">
                  {inProcessSamples.length === 0 ? (
                    <div className="ld-kanban-empty">Sin muestras en proceso</div>
                  ) : (
                    inProcessSamples.map((sample) => (
                      <div key={sample.id} className="ld-sample-card ld-sample-card--inprocess">
                        <div className="ld-sample-card__header">
                          <span className="ld-sample-card__barcode">{sample.barcode}</span>
                          <span className="ld-sample-card__time">
                            {formatTime(sample.created_at)}
                          </span>
                        </div>
                        <p className="ld-sample-card__patient">
                          {sample.patient_name ?? 'Paciente'}
                        </p>
                        <div className="ld-sample-card__meta">
                          <span className="ld-sample-card__area">{sample.area_name}</span>
                          <span className="ld-sample-card__drag">&#8942;</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Completado ─────────────────────────── */}
              <div className="ld-kanban-column">
                <div className="ld-kanban-column__header ld-kanban-column__header--completed">
                  <span className="ld-kanban-column__dot ld-kanban-column__dot--completed" />
                  <h3 className="ld-kanban-column__title">Completado</h3>
                  <span className="ld-kanban-column__count">{completedSamples.length}</span>
                </div>
                <div className="ld-kanban-column__body">
                  {completedSamples.length === 0 ? (
                    <div className="ld-kanban-empty">Sin muestras completadas</div>
                  ) : (
                    completedSamples.map((sample) => (
                      <div key={sample.id} className="ld-sample-card ld-sample-card--completed">
                        <div className="ld-sample-card__header">
                          <span className="ld-sample-card__barcode">{sample.barcode}</span>
                          <span className="ld-sample-card__time">
                            {formatTime(sample.created_at)}
                          </span>
                        </div>
                        <p className="ld-sample-card__patient">
                          {sample.patient_name ?? 'Paciente'}
                        </p>
                        <div className="ld-sample-card__meta">
                          <span className="ld-sample-card__area">{sample.area_name}</span>
                          <span className="ld-sample-card__drag">&#8942;</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── areas overview + quick actions ──────────────────────── */}
      <div className="ld-bottom-grid">
        {/* areas */}
        <section className="ld-panel" aria-label="Areas del laboratorio">
          <div className="ld-panel__header">
            <h2 className="ld-panel__title">Areas del Laboratorio</h2>
          </div>
          <div className="ld-areas-grid">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <AreaSkeleton key={i} />
                ))
              : areas.map((area) => (
                  <div key={area.id} className="ld-area-card">
                    <div className="ld-area-card__top">
                      <span className="ld-area-card__name">{area.name}</span>
                      <span className={`ld-area-status ${areaStatusColor(area.status)}`}>
                        {area.status}
                      </span>
                    </div>
                    <div className="ld-area-card__count">
                      <span className="ld-area-card__count-value">{area.pendingCount ?? 0}</span>
                      <span className="ld-area-card__count-label">pendientes</span>
                    </div>
                  </div>
                ))}
            {!loading && areas.length === 0 && (
              <div className="ld-empty-inline">No hay areas registradas</div>
            )}
          </div>
        </section>

        {/* quick actions */}
        <aside className="ld-panel ld-panel--actions" aria-label="Acciones rapidas">
          <div className="ld-panel__header">
            <h2 className="ld-panel__title">Acciones Rapidas</h2>
          </div>
          <div className="ld-actions-list">
            <a href="/lab/register" className="ld-action-card">
              <div className="ld-action-card__icon ld-action-card__icon--teal">&#128230;</div>
              <div className="ld-action-card__text">
                <span className="ld-action-card__title">Registrar Muestra</span>
                <span className="ld-action-card__desc">Ingresar nueva muestra al sistema</span>
              </div>
              <span className="ld-action-card__arrow">&rsaquo;</span>
            </a>

            <a href="/lab/equipment" className="ld-action-card">
              <div className="ld-action-card__icon ld-action-card__icon--blue">&#128295;</div>
              <div className="ld-action-card__text">
                <span className="ld-action-card__title">Ver Equipos</span>
                <span className="ld-action-card__desc">Estado y disponibilidad de equipos</span>
              </div>
              <span className="ld-action-card__arrow">&rsaquo;</span>
            </a>

            <a href="/lab/quality" className="ld-action-card">
              <div className="ld-action-card__icon ld-action-card__icon--green">&#9989;</div>
              <div className="ld-action-card__text">
                <span className="ld-action-card__title">Control Calidad</span>
                <span className="ld-action-card__desc">Revisar protocolos y controles</span>
              </div>
              <span className="ld-action-card__arrow">&rsaquo;</span>
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
