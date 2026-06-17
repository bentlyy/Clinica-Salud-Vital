import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import { getLabRequests } from '../api/laboratory';

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
        setRequests(Array.isArray(data) ? data : []);
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
    return <div className="page-container"><p className="text-muted">Cargando solicitudes...</p></div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Solicitudes de Laboratorio</h1>
      <p className="page-subtitle">Todas las solicitudes de exámenes agrupadas por doctor</p>

      {Object.keys(grouped).length === 0 && (
        <p className="text-muted">No hay solicitudes de laboratorio.</p>
      )}

      {Object.entries(grouped).map(([doctorKey, doctorRequests]) => (
        <div key={doctorKey} className="card mb-4">
          <div className="card-header">
            <h2 className="card-title">{doctorKey}</h2>
            <span className="badge badge-info">{doctorRequests.length} solicitudes</span>
          </div>
          <div className="table-responsive">
            <table className="table">
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
                      <span className={`badge ${r.priority === 'urgent' ? 'badge-error' : r.priority === 'emergency' ? 'badge-error' : 'badge-ghost'}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td>{r.created_at?.split('T')[0] || '-'}</td>
                    <td>
                      <span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'cancelled' ? 'badge-ghost' : 'badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/my-lab-results/${r.id}`)}
                        className="btn btn-outline btn-sm"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
