import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import { getAllBookings } from '../api/bookings';
import { getClinicalRecords } from '../api/clinicalRecords';
import { getLabRequests } from '../api/laboratory';

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
        setBookings(Array.isArray(bRes?.data) ? bRes.data : []);
        setRecords(Array.isArray(cRes) ? cRes : []);
        setLabReqs(Array.isArray(lRes) ? lRes : []);
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
    const cls = status === 'completed' ? 'badge-success' : status === 'cancelled' ? 'badge-ghost' : 'badge-warning';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <div className="page-container">
      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <strong>Datos de Demostración</strong> — Esta sección muestra la información de ejemplo precargada en el sistema.
        Los datos aquí presentados son solo para fines de demostración.
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border-light)' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '8px 8px 0 0', padding: '10px 20px' }}
          >
            {t.label} <span className="badge badge-info" style={{ marginLeft: 6 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">Cargando datos de demostración...</p>}

      {!loading && tab === 'bookings' && (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>RUT</th>
                  <th>Doctor</th>
                  <th>Especialidad</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 && <tr><td colSpan={7} className="text-muted" style={{ textAlign: 'center' }}>No hay reservas.</td></tr>}
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
      )}

      {!loading && tab === 'clinical' && (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>RUT</th>
                  <th>Doctor</th>
                  <th>Diagnóstico</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center' }}>No hay historial clínico.</td></tr>}
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
      )}

      {!loading && tab === 'lab' && (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>N° Solicitud</th>
                  <th>Paciente</th>
                  <th>Doctor</th>
                  <th>Prioridad</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {labReqs.length === 0 && <tr><td colSpan={6} className="text-muted" style={{ textAlign: 'center' }}>No hay exámenes.</td></tr>}
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
      )}
    </div>
  );
}
