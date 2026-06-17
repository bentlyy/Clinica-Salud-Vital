import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import { getClinicalRecords } from '../api/clinicalRecords';

interface ClinicalRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  doctor_name: string;
  specialty: string;
  patient_name: string;
  patient_rut: string;
  diagnosis: string;
  created_at: string;
  status: string;
}

export default function AdminMedicalHistoryPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getClinicalRecords({ limit: 500 });
        setRecords(data);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = records.reduce<Record<string, ClinicalRecord[]>>((acc, r) => {
    const key = `${r.doctor_name} — ${r.specialty}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  if (loading) {
    return <div className="page-container"><p className="text-muted">Cargando historial médico...</p></div>;
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Historial Médico</h1>
      <p className="page-subtitle">Todos los registros clínicos agrupados por doctor</p>

      {Object.keys(grouped).length === 0 && (
        <p className="text-muted">No hay registros clínicos.</p>
      )}

      {Object.entries(grouped).map(([doctorKey, doctorRecords]) => (
        <div key={doctorKey} className="card mb-4">
          <div className="card-header">
            <h2 className="card-title">{doctorKey}</h2>
            <span className="badge badge-info">{doctorRecords.length} registros</span>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>RUT</th>
                  <th>Diagnóstico</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {doctorRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.patient_name}</td>
                    <td>{r.patient_rut}</td>
                    <td>{r.diagnosis || '—'}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'draft' ? 'badge-warning' : 'badge-ghost'}`}>
                        {r.status === 'completed' ? 'Completado' : r.status === 'draft' ? 'Borrador' : 'Cancelado'}
                      </span>
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
