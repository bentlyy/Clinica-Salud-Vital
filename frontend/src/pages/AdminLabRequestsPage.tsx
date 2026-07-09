import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import { extractList } from '../utils/extract-list';
import { getLabRequests } from '../api/laboratory';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

interface LabRequest {
  id: number;
  request_number: string;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_specialty: string;
  priority: string;
  status: string;
  created_at: string;
}

export default function AdminLabRequestsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getLabRequests({ limit: 500 });
        setRequests(extractList(data));
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = requests.reduce<Record<string, LabRequest[]>>((acc, r) => {
    const key = r.doctor_name || 'Sin doctor';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  if (loading) {
    return <PageContainer maxWidth="xl"><p style={{ color: 'var(--ds-text-tertiary)' }}>Cargando solicitudes...</p></PageContainer>;
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader title="Solicitudes de Laboratorio" subtitle="Todas las solicitudes de exámenes agrupadas por doctor" />

      {Object.keys(grouped).length === 0 && (
        <p style={{ color: 'var(--ds-text-tertiary)' }}>No hay solicitudes de laboratorio.</p>
      )}

      {Object.entries(grouped).map(([doctorKey, doctorRequests]) => (
        <Card key={doctorKey} padding="md" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 'var(--ds-text-lg)', fontWeight: 600 }}>{doctorKey}</h2>
            <Badge variant="info">{doctorRequests.length} solicitudes</Badge>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>N° Solicitud</th>
                  <th>Paciente</th>
                  <th>Prioridad</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {doctorRequests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.request_number || `#${r.id}`}</td>
                    <td>{r.patient_name || `ID ${r.patient_id}`}</td>
                    <td>
                      <Badge variant={r.priority === 'urgent' || r.priority === 'emergency' ? 'danger' : 'neutral'}>
                        {r.priority}
                      </Badge>
                    </td>
                    <td>{r.created_at?.split('T')[0] || '-'}</td>
                    <td>
                      <Badge variant={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'neutral' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        onClick={() => navigate(`/my-lab-results/${r.id}`)}
                        variant="outline"
                        size="sm"
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </PageContainer>
  );
}
