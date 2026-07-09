import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import { extractList } from '../utils/extract-list';
import { getAllBookings } from '../api/bookings';
import { getClinicalRecords } from '../api/clinicalRecords';
import { getLabRequests } from '../api/laboratory';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

interface Booking {
  id: number;
  date: string;
  time: string;
  status: string;
  doctor_name: string;
  specialty: string;
  patient_name: string;
  patient_rut: string;
}

interface ClinicalRecord {
  id: number;
  doctor_name: string;
  patient_name: string;
  patient_rut: string;
  diagnosis: string;
  created_at: string;
  status: string;
}

interface LabRequest {
  id: number;
  request_number: string;
  doctor_name: string;
  patient_name: string;
  status: string;
  priority: string;
  created_at: string;
}

type Tab = 'bookings' | 'clinical' | 'lab';

export default function SuperAdminDemoDataPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [labReqs, setLabReqs] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bRes, cRes, lRes] = await Promise.all([
          getAllBookings({ limit: 200 }).catch(() => ({ data: [] })),
          getClinicalRecords({ limit: 200 }).catch(() => []),
          getLabRequests({ limit: 200 }).catch(() => []),
        ]);
        setBookings(extractList(bRes));
        setRecords(extractList(cRes));
        setLabReqs(extractList(lRes));
      } catch {
        setBookings([]);
        setRecords([]);
        setLabReqs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'bookings', label: 'Reservas', count: bookings.length },
    { key: 'clinical', label: 'Historial Clínico', count: records.length },
    { key: 'lab', label: 'Exámenes', count: labReqs.length },
  ];

  const statusBadge = (status: string) => {
    const variant = status === 'completed' ? 'success' : status === 'cancelled' ? 'neutral' : 'warning';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <PageContainer maxWidth="xl">
      <Alert variant="info" style={{ marginBottom: 24 }}>
        <strong>Datos Globales</strong> — Esta sección muestra toda la información del sistema a nivel global (todos los tenants).
      </Alert>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--ds-border)' }}>
        {tabs.map(t => (
          <Button
            key={t.key}
            onClick={() => setTab(t.key)}
            variant={tab === t.key ? 'primary' : 'ghost'}
            style={{ borderRadius: '8px 8px 0 0', padding: '10px 20px' }}
          >
            {t.label} <Badge variant="info" style={{ marginLeft: 6 }}>{t.count}</Badge>
          </Button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--ds-text-tertiary)' }}>Cargando datos globales...</p>}

      {!loading && tab === 'bookings' && (
        <Card padding="md">
          <div style={{ overflowX: 'auto' }}>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>Paciente</th>
                    <th style={{ minWidth: 110 }}>RUT</th>
                    <th style={{ minWidth: 140 }}>Doctor</th>
                    <th style={{ minWidth: 120 }}>Especialidad</th>
                    <th style={{ minWidth: 100 }}>Fecha</th>
                    <th style={{ minWidth: 70 }}>Hora</th>
                    <th style={{ minWidth: 90 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 24 }}>No hay reservas.</td></tr>}
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td>{b.patient_name}</td>
                      <td>{b.patient_rut || '—'}</td>
                      <td>{b.doctor_name}</td>
                      <td>{b.specialty}</td>
                      <td>{b.date}</td>
                      <td>{b.time}</td>
                      <td>{statusBadge(b.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {!loading && tab === 'clinical' && (
        <Card padding="md">
          <div style={{ overflowX: 'auto' }}>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 140 }}>Paciente</th>
                    <th style={{ minWidth: 110 }}>RUT</th>
                    <th style={{ minWidth: 140 }}>Doctor</th>
                    <th style={{ minWidth: 160 }}>Diagnóstico</th>
                    <th style={{ minWidth: 100 }}>Fecha</th>
                    <th style={{ minWidth: 90 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 24 }}>No hay historial clínico.</td></tr>}
                  {records.map(r => (
                    <tr key={r.id}>
                      <td>{r.patient_name}</td>
                      <td>{r.patient_rut || '—'}</td>
                      <td>{r.doctor_name}</td>
                      <td>{r.diagnosis || '—'}</td>
                      <td>{r.created_at?.split('T')[0]}</td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {!loading && tab === 'lab' && (
        <Card padding="md">
          <div style={{ overflowX: 'auto' }}>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 110 }}>N° Solicitud</th>
                    <th style={{ minWidth: 140 }}>Paciente</th>
                    <th style={{ minWidth: 140 }}>Doctor</th>
                    <th style={{ minWidth: 90 }}>Prioridad</th>
                    <th style={{ minWidth: 100 }}>Fecha</th>
                    <th style={{ minWidth: 90 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {labReqs.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 24 }}>No hay exámenes.</td></tr>}
                  {labReqs.map(r => (
                    <tr key={r.id}>
                      <td>{r.request_number || `#${r.id}`}</td>
                      <td>{r.patient_name || `ID ${r.patient_id}`}</td>
                      <td>{r.doctor_name || '—'}</td>
                      <td>{r.priority}</td>
                      <td>{r.created_at?.split('T')[0]}</td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
