import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import { getClinicalRecords } from '../api/clinicalRecords';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

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
    return <PageContainer maxWidth="md"><p style={{ color: 'var(--ds-text-tertiary)' }}>Cargando historial médico...</p></PageContainer>;
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader title="Historial Médico" subtitle="Todos los registros clínicos agrupados por doctor" />

      {Object.keys(grouped).length === 0 && (
        <p className="text-muted">No hay registros clínicos.</p>
      )}

      {Object.entries(grouped).map(([doctorKey, doctorRecords]) => (
        <Card key={doctorKey} padding="md" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{doctorKey}</h2>
            <Badge variant="info">{doctorRecords.length} registros</Badge>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                      <Badge variant={r.status === 'completed' ? 'success' : r.status === 'draft' ? 'warning' : 'default'}>
                        {r.status === 'completed' ? 'Completado' : r.status === 'draft' ? 'Borrador' : 'Cancelado'}
                      </Badge>
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
