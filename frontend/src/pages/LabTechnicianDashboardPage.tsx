import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { extractList } from '../utils/extract-list';
import { downloadLabOrderPdf } from '../api/laboratory';
import { logger } from '../utils/logger';

interface LabRequest {
  id: number;
  request_number?: string;
  status: string;
  lab_type?: string;
  created_at?: string;
  patient_name?: string;
  patient_id: number;
  patient_rut?: string;
  doctor_name?: string;
  items?: LabItem[];
}

interface LabItem {
  id: number;
  test_name?: string;
  status: string;
  result_value?: string;
  lab_test_id?: number;
}

const STATUS_TABS = [
  { key: undefined as string | undefined, label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'received', label: 'Recibidas' },
  { key: 'processing', label: 'En Proceso' },
  { key: 'result_entered', label: 'C/Resultado' },
  { key: 'delivered', label: 'Entregadas' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-warning',
  received: 'badge-info',
  verified: 'badge-info',
  assigned: 'badge-info',
  processing: 'badge-info',
  qc_review: 'badge-warning',
  result_entered: 'badge-info',
  validated_tech: 'badge-success',
  validated_doctor: 'badge-success',
  signed: 'badge-success',
  delivered: 'badge-success',
  cancelled: 'badge-ghost',
  rejected: 'badge-ghost',
  repeated: 'badge-warning',
};

export default function LabTechnicianDashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/laboratory/lab/all', { params });
      setRequests(extractList(res.data));
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al cargar solicitudes';
      setError(msg);
      logger.error('Failed to load lab requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      await api.patch(`/laboratory/${id}/status`, { status: newStatus });
      fetchRequests();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al actualizar estado';
      setError(msg);
      logger.error('Failed to update status', err);
    }
  };

  const updateItemStatus = async (itemId: number, newStatus: string) => {
    try {
      await api.patch(`/laboratory/lab/items/${itemId}/status`, { status: newStatus });
      fetchRequests();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al actualizar item';
      setError(msg);
      logger.error('Failed to update item status', err);
    }
  };

  const downloadPdf = async (id: number) => {
    try {
      const blob = await downloadLabOrderPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `orden-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = 'Error al descargar PDF';
      setError(msg);
      logger.error('Failed to download PDF', err);
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

      <div className="flex-row" style={{ gap: 12, marginBottom: 24 }}>
        <Link to="/lab/dashboard" className="card flex-row items-center" style={{ padding: '16px 20px', textDecoration: 'none', color: 'inherit', gap: 14, border: '1px solid var(--border-light)', flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📊</div>
          <div>
            <strong style={{ fontSize: 15 }}>Dashboard</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Métricas en tiempo real, SLA, work queue</p>
          </div>
        </Link>
        <Link to="/lab/analytics" className="card flex-row items-center" style={{ padding: '16px 20px', textDecoration: 'none', color: 'inherit', gap: 14, border: '1px solid var(--border-light)', flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📈</div>
          <div>
            <strong style={{ fontSize: 15 }}>Analytics</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Tendencias por doctor, área y mes</p>
          </div>
        </Link>
        <Link to="/lab/qc" className="card flex-row items-center" style={{ padding: '16px 20px', textDecoration: 'none', color: 'inherit', gap: 14, border: '1px solid var(--border-light)', flex: 1 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🧪</div>
          <div>
            <strong style={{ fontSize: 15 }}>Control de Calidad</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>Levey-Jennings, registros QC</p>
          </div>
        </Link>
      </div>

      <div className="flex-row" style={{ gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{r.request_number || `#${r.id}`}</strong>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                {r.created_at?.split('T')[0]}
              </span>
            </div>
            <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
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
            <div className="table-wrapper">
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Examen</th>
                    <th>Estado</th>
                    <th>Resultado</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(r.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.test_name}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[item.status] || 'badge-ghost'}`} style={{ fontSize: 11 }}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.result_value || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <select
                          value={item.status}
                          onChange={(e) => updateItemStatus(item.id, e.target.value)}
                          className="form-input"
                          style={{ fontSize: 12, padding: '4px 8px', width: 130 }}
                        >
                          <option value="pending">Pendiente</option>
                          <option value="received">Recibido</option>
                          <option value="processing">En Proceso</option>
                          <option value="result_entered">C/Resultado</option>
                          <option value="delivered">Entregado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex-row" style={{ gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
            <select
              value={r.status}
              onChange={(e) => updateStatus(r.id, e.target.value)}
              className="form-input"
              style={{ fontSize: 13, padding: '6px 12px', width: 160 }}
            >
              <option value="pending">Pendiente</option>
              <option value="received">Recibida</option>
              <option value="processing">En Proceso</option>
              <option value="result_entered">C/Resultado</option>
              <option value="delivered">Entregada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <button onClick={() => downloadPdf(r.id)} className="btn btn-outline btn-sm">PDF</button>
          </div>
        </div>
      ))}
    </div>
  );
}
