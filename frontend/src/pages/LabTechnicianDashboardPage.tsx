import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { extractList } from '../utils/extract-list';
import { downloadLabOrderPdf } from '../api/laboratory';
import { logger } from '../utils/logger';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

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

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  pending: 'warning',
  received: 'info',
  verified: 'info',
  assigned: 'info',
  processing: 'info',
  qc_review: 'warning',
  result_entered: 'info',
  validated_tech: 'success',
  validated_doctor: 'success',
  signed: 'success',
  delivered: 'success',
  cancelled: 'neutral',
  rejected: 'neutral',
  repeated: 'warning',
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
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Panel de Laboratorio"
        subtitle="Gestiona las órdenes de exámenes, procesa muestras y carga resultados"
      />

      <div className="flex-row" style={{ gap: 12, marginBottom: 24 }}>
        <Link to="/lab/dashboard" style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
          <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📊</div>
            <div>
              <strong style={{ fontSize: 15 }}>Dashboard</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ds-text-secondary)' }}>Métricas en tiempo real, SLA, work queue</p>
            </div>
          </Card>
        </Link>
        <Link to="/lab/analytics" style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
          <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📈</div>
            <div>
              <strong style={{ fontSize: 15 }}>Analytics</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ds-text-secondary)' }}>Tendencias por doctor, área y mes</p>
            </div>
          </Card>
        </Link>
        <Link to="/lab/qc" style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
          <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🧪</div>
            <div>
              <strong style={{ fontSize: 15 }}>Control de Calidad</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ds-text-secondary)' }}>Levey-Jennings, registros QC</p>
            </div>
          </Card>
        </Link>
      </div>

      <div className="flex-row" style={{ gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key || 'all'}
            variant={statusFilter === tab.key || (!statusFilter && !tab.key) ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
            {tab.key && requests.filter(r => r.status === tab.key).length > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>({requests.filter(r => r.status === tab.key).length})</span>
            )}
          </Button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading && <p style={{ color: 'var(--ds-text-tertiary)' }}>Cargando solicitudes...</p>}

      {!loading && requests.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          <h3>No hay solicitudes {statusFilter ? `en estado "${statusFilter}"` : ''}</h3>
          <p>Las órdenes creadas por los doctores aparecerán aquí.</p>
        </div>
      )}

      {requests.map((r) => (
        <Card key={r.id} padding="lg" style={{ marginBottom: 12 }}>
          <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{r.request_number || `#${r.id}`}</strong>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                {r.created_at?.split('T')[0]}
              </span>
            </div>
            <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
              <span className={`badge ${STATUS_BADGE[r.status] || 'badge-ghost'}`}>{r.status}</span>
              {r.lab_type && (
                <span className="ds-badge ds-badge-info">{r.lab_type === 'internal' ? 'Interno' : 'Externo'}</span>
              )}
            </div>
          </div>

          <div style={{ fontSize: 14, color: 'var(--ds-text-secondary)', marginBottom: 12 }}>
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
                        {item.result_value || <span style={{ color: 'var(--ds-text-tertiary)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <select
                          value={item.status}
                          onChange={(e) => updateItemStatus(item.id, e.target.value)}
                          className="ds-input"
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

          <div className="flex-row" style={{ gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--ds-border)', paddingTop: 12 }}>
            <select
              value={r.status}
              onChange={(e) => updateStatus(r.id, e.target.value)}
              className="ds-input"
              style={{ fontSize: 13, padding: '6px 12px', width: 160 }}
            >
              <option value="pending">Pendiente</option>
              <option value="received">Recibida</option>
              <option value="processing">En Proceso</option>
              <option value="result_entered">C/Resultado</option>
              <option value="delivered">Entregada</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => downloadPdf(r.id)}>PDF</Button>
          </div>
        </Card>
      ))}
    </PageContainer>
  );
}
