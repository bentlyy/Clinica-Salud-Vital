import { useState, useCallback } from 'react';
import { LabDashboardProvider, useLabDashboardContext } from '../context/LabDashboardContext';
import { LabFiltersProvider } from '../context/LabFiltersContext';
import { useLabRequests } from '../hooks/useLabRequests';
import { useLabKeyboard } from '../hooks/useLabKeyboard';
import { useLabRealtime } from '../hooks/useLabRealtime';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardMetricsBar from '../components/dashboard/DashboardMetricsBar';
import DashboardAreaSelector from '../components/dashboard/DashboardAreaSelector';
import DashboardWorkQueue from '../components/dashboard/DashboardWorkQueue';
import DashboardAlertsPanel from '../components/dashboard/DashboardAlertsPanel';
import DashboardSLAIndicator from '../components/dashboard/DashboardSLAIndicator';
import KanbanBoard from '../components/kanban/KanbanBoard';
import LabFiltersBar from '../components/shared/LabFiltersBar';
import LabDetailPanel from '../components/shared/LabDetailPanel';
import LabCard from '../components/shared/LabCard';
import type { LabRequest, LabRequestStatus } from '../types';

type ViewMode = 'dashboard' | 'kanban' | 'list';

function DashboardContent() {
  const {
    metrics, areas, selectedAreaId, notifications,
    setSelectedAreaId, setFilters, refresh,
    loading: dashboardLoading, error: dashboardError,
  } = useLabDashboardContext();

  const { requests, loading, refresh: refreshRequests, setRequests } = useLabRequests();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<LabRequestStatus | ''>('');

  const filteredRequests = statusFilter
    ? requests.filter(r => r.status === statusFilter || (statusFilter === 'urgent' && (r.priority === 'urgent' || r.priority === 'emergency')) || (statusFilter === 'critical' && r.items?.some(i => i.is_critical)))
    : requests;

  const refreshAll = useCallback(() => {
    refresh();
    refreshRequests();
  }, [refresh, refreshRequests]);

  useLabKeyboard([
    { key: 'r', ctrl: true, handler: refreshAll, description: 'Refrescar' },
    { key: 'k', ctrl: true, shift: true, handler: () => setViewMode('kanban'), description: 'Kanban' },
    { key: 'd', ctrl: true, shift: true, handler: () => setViewMode('dashboard'), description: 'Dashboard' },
    { key: 'l', ctrl: true, shift: true, handler: () => setViewMode('list'), description: 'Lista' },
  ]);

  useLabRealtime({
    onMetricsUpdate: () => refresh(),
    onStatusChange: () => refreshRequests(),
    onNotification: () => refresh(),
  });

  const handleStatusChange = useCallback(async (requestId: number, newStatus: LabRequestStatus) => {
    try {
      const { updateLabRequestStatus } = await import('../api/laboratory.api');
      await updateLabRequestStatus(requestId, newStatus);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch { /* silent */ }
  }, [setRequests]);

  const handleFilterByStatus = useCallback((status: string) => {
    setStatusFilter(status as LabRequestStatus);
    setFilters({ status: status as LabRequestStatus });
  }, [setFilters]);

  const handleAcknowledge = useCallback(async (id: number) => {
    try {
      const { acknowledgeNotification } = await import('../api/laboratory.api');
      await acknowledgeNotification(id);
      refresh();
    } catch { /* silent */ }
  }, [refresh]);

  const handleAcknowledgeAll = useCallback(async () => {
    try {
      const acks = notifications.filter(n => !n.acknowledged).map(n =>
        import('../api/laboratory.api').then(m => m.acknowledgeNotification(n.id))
      );
      await Promise.all(acks);
      refresh();
    } catch { /* silent */ }
  }, [notifications, refresh]);

  const viewButtons = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'kanban', label: 'Kanban', icon: '📋' },
    { key: 'list', label: 'Lista', icon: '📄' },
  ] as const;

  return (
    <DashboardLayout
      title="Laboratorio Clínico"
      subtitle="Panel de Control Operativo"
      areaSelector={
        <DashboardAreaSelector
          areas={areas}
          selectedAreaId={selectedAreaId}
          onSelect={setSelectedAreaId}
        />
      }
      viewSelector={
        <div style={{ display: 'flex', gap: 4 }}>
          {viewButtons.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`btn btn-sm ${viewMode === key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12 }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      }
      alertsPanel={
        <DashboardAlertsPanel
          notifications={notifications}
          onAcknowledge={handleAcknowledge}
          onAcknowledgeAll={handleAcknowledgeAll}
        />
      }
      metricsBar={
        metrics && (
          <DashboardMetricsBar
            metrics={metrics}
            onFilterByStatus={handleFilterByStatus}
          />
        )
      }
    >
      {dashboardError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {dashboardError}
          <button onClick={refreshAll} className="btn btn-sm" style={{ marginLeft: 12 }}>
            Reintentar
          </button>
        </div>
      )}

      <LabFiltersBar />

      {metrics && (
        <div className="grid grid-3" style={{ gap: 14, marginBottom: 24 }}>
          <DashboardSLAIndicator
            slaBreached={metrics.sla_breached}
            slaAtRisk={metrics.sla_at_risk}
            avgProcessingTime={metrics.average_processing_time_min}
            samplesProcessedToday={metrics.samples_processed_today}
            productivityPerHour={metrics.productivity_per_hour}
          />
          <div className="card" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📊 Productividad por hora</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, padding: '8px 0' }}>
              {[2, 5, 8, 12, 15, 18, 14, 10, 7, 3].map((h, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: '100%', height: `${(h / 18) * 100}%`,
                    background: `var(--primary-${Math.min(Math.floor(h / 3) + 1, 7)}00)`,
                    borderRadius: '4px 4px 0 0',
                    minHeight: 4,
                    transition: 'height 0.3s',
                  }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{8 + i}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🏥 Carga de trabajo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Pendientes', value: metrics.pending, max: Math.max(metrics.pending, 10), color: '#f59e0b' },
                { label: 'En proceso', value: metrics.in_progress, max: Math.max(metrics.in_progress, 10), color: '#f97316' },
                { label: 'Validación', value: metrics.pending_validation, max: Math.max(metrics.pending_validation, 10), color: '#8b5cf6' },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontWeight: 600 }}>{item.value}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                      height: '100%', borderRadius: 3,
                      background: item.color,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'dashboard' && (
        <DashboardWorkQueue
          requests={filteredRequests}
          onSelectRequest={setSelectedRequest}
          loading={loading || dashboardLoading}
        />
      )}

      {viewMode === 'kanban' && (
        <KanbanBoard
          requests={filteredRequests}
          onSelectRequest={setSelectedRequest}
          onStatusChange={handleStatusChange}
          loading={loading || dashboardLoading}
        />
      )}

      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
          ) : filteredRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔬</div>
              <h3>No hay solicitudes</h3>
            </div>
          ) : (
            filteredRequests.map((r) => (
              <LabCard
                key={r.id}
                request={r}
                onClick={() => setSelectedRequest(r)}
                selected={selectedRequest?.id === r.id}
              />
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function LabDashboardPage() {
  return (
    <LabDashboardProvider>
      <LabFiltersProvider>
        <DashboardContent />
      </LabFiltersProvider>
    </LabDashboardProvider>
  );
}
