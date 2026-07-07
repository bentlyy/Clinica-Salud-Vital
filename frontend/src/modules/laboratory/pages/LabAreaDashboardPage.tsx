import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLabDashboard } from '../hooks/useLabDashboard';
import { useLabRequests } from '../hooks/useLabRequests';
import { useLabAreas } from '../hooks/useLabAreas';
import { useLabRealtime } from '../hooks/useLabRealtime';
import { useLabKeyboard } from '../hooks/useLabKeyboard';
import DashboardMetricsBar from '../components/dashboard/DashboardMetricsBar';
import DashboardWorkQueue from '../components/dashboard/DashboardWorkQueue';
import KanbanBoard from '../components/kanban/KanbanBoard';
import LabCard from '../components/shared/LabCard';
import type { LabRequest, LabRequestStatus } from '../types';

export default function LabAreaDashboardPage() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate = useNavigate();
  const areaNumericId = areaId ? Number(areaId) : null;

  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useLabDashboard(areaNumericId);
  const { areas } = useLabAreas();
  const { requests, loading, refresh: refreshRequests, setRequests } = useLabRequests();
  const [viewMode, setViewMode] = useState<'dashboard' | 'kanban' | 'list'>('dashboard');
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);

  const area = areas.find(a => a.id === areaNumericId);

  const refreshAll = useCallback(() => {
    refreshMetrics();
    refreshRequests();
  }, [refreshMetrics, refreshRequests]);

  useLabKeyboard([
    { key: 'r', ctrl: true, handler: refreshAll, description: 'Refrescar' },
    { key: 'k', ctrl: true, shift: true, handler: () => setViewMode('kanban'), description: 'Kanban' },
    { key: 'd', ctrl: true, shift: true, handler: () => setViewMode('dashboard'), description: 'Dashboard' },
  ]);

  useLabRealtime({
    onMetricsUpdate: () => refreshMetrics(),
    onStatusChange: () => refreshRequests(),
  });

  const areaRequests = requests.filter(r =>
    r.lab_area_id === areaNumericId || r.items?.some(i => i.lab_area_id === areaNumericId)
  );

  const handleStatusChange = useCallback(async (requestId: number, newStatus: LabRequestStatus) => {
    try {
      const { updateLabRequestStatus } = await import('../api/laboratory.api');
      await updateLabRequestStatus(requestId, newStatus);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch { /* silent */ }
  }, [setRequests]);

  return (
    <div className="page-container-wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/lab')} className="btn btn-ghost btn-sm">
          ← Volver al dashboard general
        </button>
        {area && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              background: area.color, display: 'inline-block',
            }} />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{area.name}</h1>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['dashboard', 'kanban', 'list'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12 }}
            >
              {mode === 'dashboard' ? '📊 Dashboard' : mode === 'kanban' ? '📋 Kanban' : '📄 Lista'}
            </button>
          ))}
        </div>
      </div>

      {metrics && (
        <div style={{ marginBottom: 24 }}>
          <DashboardMetricsBar metrics={metrics} />
        </div>
      )}

      <div className="grid grid-2" style={{ gap: 14, marginBottom: 24 }}>
        {area && (
          <div className="card" style={{
            padding: '16px 20px',
            borderLeft: `4px solid ${area.color}`,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🔬 Información del área</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{area.description}</p>
          </div>
        )}
        <div className="card" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>⚡ Acciones rápidas</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-sm" style={{ background: '#22c55e20', color: '#16a34a' }}>Validar todo</button>
            <button className="btn btn-sm" style={{ background: '#3b82f620', color: '#2563eb' }}>Imprimir lote</button>
            <button className="btn btn-sm" style={{ background: '#f59e0b20', color: '#d97706' }}>Reporte QC</button>
          </div>
        </div>
      </div>

      {viewMode === 'dashboard' && (
        <DashboardWorkQueue
          requests={areaRequests}
          onSelectRequest={setSelectedRequest}
          loading={loading || metricsLoading}
        />
      )}

      {viewMode === 'kanban' && (
        <KanbanBoard
          requests={areaRequests}
          onSelectRequest={setSelectedRequest}
          onStatusChange={handleStatusChange}
          loading={loading || metricsLoading}
        />
      )}

      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
          ) : areaRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔬</div>
              <h3>No hay solicitudes en esta área</h3>
            </div>
          ) : (
            areaRequests.map((r) => (
              <LabCard key={r.id} request={r} onClick={() => setSelectedRequest(r)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
