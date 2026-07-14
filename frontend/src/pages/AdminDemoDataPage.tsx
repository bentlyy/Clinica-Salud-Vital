import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import { extractList } from '../utils/extract-list';
import { getAllBookings } from '../api/bookings';
import { getClinicalRecords } from '../api/clinicalRecords';
import { getLabRequests } from '../api/laboratory';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';
import './AdminDemoDataPage.css';

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

export default function AdminDemoDataPage() {
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
    { key: 'bookings', label: t('demo_data.tab_bookings') || 'Reservas', count: bookings.length },
    { key: 'clinical', label: t('demo_data.tab_clinical') || 'Historial Clínico', count: records.length },
    { key: 'lab', label: t('demo_data.tab_lab') || 'Exámenes', count: labReqs.length },
  ];

  const statusBadge = (status: string) => {
    const variant = status === 'completed' ? 'success' : status === 'cancelled' ? 'default' : 'warning';
    return <Badge variant={variant as 'success' | 'default' | 'warning'}>{status}</Badge>;
  };

  return (
    <PageContainer maxWidth="xl">
      <Alert variant="info" style={{ marginBottom: 24 }}>
        <strong>{t('demo_data.title') || 'Datos de Demostración'}</strong> — {t('demo_data.description') || 'Esta sección muestra la información de ejemplo precargada en el sistema.'}
      </Alert>

      <div className="demo-tabs">
        {tabs.map(tb => (
          <Button
            key={tb.key}
            variant={tab === tb.key ? 'primary' : 'ghost'}
            onClick={() => setTab(tb.key)}
            className="demo-tab"
          >
            {tb.label} <Badge variant="info" className="demo-tab-badge">{tb.count}</Badge>
          </Button>
        ))}
      </div>

      {loading && <p className="demo-loading">{t('demo_data.loading') || 'Cargando datos de demostración...'}</p>}

      {!loading && tab === 'bookings' && (
        <Card padding="md">
          <div className="demo-table-wrapper">
            <div className="demo-table-scroll">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th className="demo-th-paciente">{t('demo_data.patient') || 'Paciente'}</th>
                    <th className="demo-th-rut">RUT</th>
                    <th className="demo-th-doctor">{t('demo_data.doctor') || 'Doctor'}</th>
                    <th className="demo-th-especialidad">{t('demo_data.specialty') || 'Especialidad'}</th>
                    <th className="demo-th-fecha">{t('demo_data.date') || 'Fecha'}</th>
                    <th className="demo-th-hora">{t('demo_data.time') || 'Hora'}</th>
                    <th className="demo-th-estado">{t('demo_data.status') || 'Estado'}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 && <tr><td colSpan={7} className="demo-empty">{t('demo_data.no_bookings') || 'No hay reservas.'}</td></tr>}
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
          <div className="demo-table-wrapper">
            <div className="demo-table-scroll">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th className="demo-th-paciente">{t('demo_data.patient') || 'Paciente'}</th>
                    <th className="demo-th-rut">RUT</th>
                    <th className="demo-th-doctor">{t('demo_data.doctor') || 'Doctor'}</th>
                    <th className="demo-th-diagnostico">{t('demo_data.diagnosis') || 'Diagnóstico'}</th>
                    <th className="demo-th-fecha">{t('demo_data.date') || 'Fecha'}</th>
                    <th className="demo-th-estado">{t('demo_data.status') || 'Estado'}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && <tr><td colSpan={6} className="demo-empty">{t('demo_data.no_records') || 'No hay historial clínico.'}</td></tr>}
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
          <div className="demo-table-wrapper">
            <div className="demo-table-scroll">
              <table className="demo-table">
                <thead>
                  <tr>
                    <th className="demo-th-solicitud">{t('demo_data.request_number') || 'N° Solicitud'}</th>
                    <th className="demo-th-paciente">{t('demo_data.patient') || 'Paciente'}</th>
                    <th className="demo-th-doctor">{t('demo_data.doctor') || 'Doctor'}</th>
                    <th className="demo-th-prioridad">{t('demo_data.priority') || 'Prioridad'}</th>
                    <th className="demo-th-fecha">{t('demo_data.date') || 'Fecha'}</th>
                    <th className="demo-th-estado">{t('demo_data.status') || 'Estado'}</th>
                  </tr>
                </thead>
                <tbody>
                  {labReqs.length === 0 && <tr><td colSpan={6} className="demo-empty">{t('demo_data.no_lab') || 'No hay exámenes.'}</td></tr>}
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
