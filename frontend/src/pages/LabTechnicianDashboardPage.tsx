import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { extractList } from '../utils/extract-list';
import { downloadLabOrderPdf } from '../api/laboratory';

const STATUS_TABS = [
  { key: undefined, label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'in_progress', label: 'En Proceso' },
  { key: 'completed', label: 'Completadas' },
];

const STATUS_BADGE = {
  pending: 'badge-warning',
  in_progress: 'badge-info',
  completed: 'badge-success',
  cancelled: 'badge-ghost',
};

export default function LabTechnicianDashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/laboratory/lab/all', { params });
      setRequests(extractList(res.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/laboratory/${id}/status`, { status: newStatus });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar estado');
    }
  };

  const updateItemStatus = async (itemId, newStatus) => {
    try {
      await api.patch(`/laboratory/lab/items/${itemId}/status`, { status: newStatus });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar item');
    }
  };

  const downloadPdf = async (id) => {
    try {
      const blob = await downloadLabOrderPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `orden-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar PDF');
    }
  };

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>Panel de Laboratorio</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Gestiona las órdenes de exámenes, procesa muestras y carga resultados
          </p>
        </div>
      </div>

      <div className="grid grid-3" style={{ gap: 12, marginBottom: 24 }}>
        <Link to="/lab/dashboard" className="card" style={{ padding: '16px 20px', textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border-light)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📊</div>
          <div>
            <strong style={{ fontSize: 15 }}>Dashboard</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Métricas en tiempo real, SLA, work queue</p>
          </div>
        </Link>
        <Link to="/lab/analytics" className="card" style={{ padding: '16px 20px', textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border-light)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📈</div>
          <div>
            <strong style={{ fontSize: 15 }}>Analytics</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Tendencias por doctor, área y mes</p>
          </div>
        </Link>
        <Link to="/lab/qc" className="card" style={{ padding: '16px 20px', textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border-light)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🧪</div>
          <div>
            <strong style={{ fontSize: 15 }}>Control de Calidad</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Levey-Jennings, registros QC</p>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key || 'all'}
            onClick={() => setStatusFilter(tab.key)}
            className={`btn ${statusFilter === tab.key || (!statusFilter && !tab.key) ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          >
            {tab.label}
            {tab.key && requests.filter(r => r.status === tab.key).length > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>({requests.filter(r => r.status === tab.key).length})</span>
            )}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <p style={{ color: 'var(--text-muted)' }}>Cargando solicitudes...</p>}

      {!loading && requests.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          <h3>No hay solicitudes {statusFilter ? `en estado "${statusFilter}"` : ''}</h3>
          <p>Las órdenes creadas por los doctores aparecerán aquí.</p>
        </div>
      )}

      {requests.map((r) => (
        <div key={r.id} className="card" style={{ padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{r.request_number || `#${r.id}`}</strong>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                {r.created_at?.split('T')[0]}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${STATUS_BADGE[r.status] || 'badge-ghost'}`}>{r.status}</span>
              {r.lab_type && (
                <span className="badge badge-info">{r.lab_type === 'internal' ? 'Interno' : 'Externo'}</span>
              )}
            </div>
          </div>

          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            <span>Paciente: <strong>{r.patient_name || `ID ${r.patient_id}`}</strong></span>
            {r.patient_rut && <span style={{ marginLeft: 16 }}>RUT: {r.patient_rut}</span>}
            <span style={{ marginLeft: 16 }}>Doctor: {r.doctor_name || '—'}</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Examen</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Estado</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Resultado</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(r.items || []).map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '6px 10px' }}>{item.test_name}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <span className={`badge ${STATUS_BADGE[item.status] || 'badge-ghost'}`} style={{ fontSize: 11 }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      {item.result_value || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                      <select
                        value={item.status}
                        onChange={(e) => updateItemStatus(item.id, e.target.value)}
                        className="form-input"
                        style={{ fontSize: 12, padding: '4px 8px', width: 130 }}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En Proceso</option>
                        <option value="completed">Completado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
            <select
              value={r.status}
              onChange={(e) => updateStatus(r.id, e.target.value)}
              className="form-input"
              style={{ fontSize: 13, padding: '6px 12px', width: 160 }}
            >
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Proceso</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <button onClick={() => downloadPdf(r.id)} className="btn btn-outline btn-sm">PDF</button>
          </div>
        </div>
      ))}
    </div>
  );
}
