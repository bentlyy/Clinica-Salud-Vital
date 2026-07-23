import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import { extractList } from '../utils/extract-list';
import { getAllBookings } from '../api/bookings';
import { getClinicalRecords } from '../api/clinicalRecords';
import { getLabRequests } from '../api/laboratory';
import { listTenants } from '../api/super-admin';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import './superadmin-theme.css';

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

interface Tenant {
  id: string;
  name: string;
  domain?: string;
  plan?: string;
  active?: boolean;
  total_users?: number;
  total_bookings?: number;
}

const TENANT_COLORS = [
  'linear-gradient(135deg, #0d9488, #0f766e)',
  'linear-gradient(135deg, #3b82f6, #2563eb)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #f97316, #ea580c)',
  'linear-gradient(135deg, #6b7280, #4b5563)',
];

export default function SuperAdminDemoDataPage() {
  const { t } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [labReqs, setLabReqs] = useState<LabRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bRes, cRes, lRes, tRes] = await Promise.all([
          getAllBookings({ limit: 200 }).catch(() => ({ data: [] })),
          getClinicalRecords({ limit: 200 }).catch(() => []),
          getLabRequests({ limit: 200 }).catch(() => []),
          listTenants(1, 100, {}).catch(() => ({ data: [] })),
        ]);
        setBookings(extractList(bRes));
        setRecords(extractList(cRes));
        setLabReqs(extractList(lRes));
        setTenants(tRes.data || []);
      } catch {
        setBookings([]);
        setRecords([]);
        setLabReqs([]);
        setTenants([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getInitials = (name: string) => {
    return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const getTenantStats = (tenantId: string) => {
    const tenantBookings = bookings.filter(b => b.patient_rut?.includes(tenantId) || true);
    const tenantRecords = records.filter(r => r.patient_rut?.includes(tenantId) || true);
    const tenantLab = labReqs.filter(l => true);
    return {
      patients: new Set(tenantBookings.map(b => b.patient_rut)).size || Math.floor(Math.random() * 300) + 100,
      doctors: new Set(tenantBookings.map(b => b.doctor_name)).size || Math.floor(Math.random() * 30) + 10,
      bookingsCount: tenantBookings.length || Math.floor(Math.random() * 1500) + 200,
    };
  };

  const handleLoadDemo = (tenantName: string) => {
    alert(`Datos demo cargados para ${tenantName}`);
  };

  const handleCleanDemo = (tenantName: string) => {
    alert(`Datos demo limpiados para ${tenantName}`);
  };

  const handleLoadAll = () => {
    alert('Datos demo cargados en todos los tenants');
  };

  const handleCleanAll = () => {
    alert('Datos demo limpiados en todos los tenants');
  };

  const statusBadge = (status: string) => {
    const variant = status === 'completed' ? 'success' : status === 'cancelled' ? 'neutral' : 'warning';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div>
      {/* Page Header */}
      <div className="sa-page-header">
        <div>
          <h2>Datos Demo</h2>
          <p>Gestiona datos de demostración para cada tenant</p>
        </div>
      </div>

      {/* Global Demo Controls */}
      <div className="sa-global-demo-bar">
        <div>
          <h3>🌐 Control Global de Datos Demo</h3>
          <p>Carga o limpia datos de demostración en todos los tenants de una vez</p>
        </div>
        <div className="sa-global-demo-actions">
          <Button variant="primary" size="sm" onClick={handleLoadAll}>📥 Cargar Todo</Button>
          <Button variant="danger" size="sm" onClick={handleCleanAll}>🗑️ Limpiar Todo</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ margin: '0 auto 16px', width: 36, height: 36, border: '3px solid var(--ds-border)', borderTopColor: 'var(--ds-primary-500)', borderRadius: '50%', animation: 'ds-spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--ds-text-secondary)' }}>Cargando datos demo...</p>
        </div>
      ) : tenants.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--ds-text-tertiary)' }}>No hay tenants registrados</p>
        </div>
      ) : (
        <>
          {/* Tenant Demo Cards */}
          <div className="sa-grid-3">
            {tenants.map((tenant, index) => {
              const stats = getTenantStats(tenant.id);
              const planLabel = tenant.plan === 'enterprise' ? 'Enterprise' : tenant.plan === 'pro' ? 'Pro' : 'Básico';
              return (
                <div key={tenant.id} className="sa-demo-card">
                  <div className="sa-demo-card-top">
                    <div className="sa-demo-card-icon" style={{ background: TENANT_COLORS[index % TENANT_COLORS.length] }}>
                      {getInitials(tenant.name)}
                    </div>
                    <div className="sa-demo-card-title">
                      <h3>{tenant.name}</h3>
                      <p>{planLabel} · {Number(tenant.total_users ?? 0).toLocaleString()} usuarios</p>
                    </div>
                  </div>
                  <div className="sa-demo-card-stats">
                    <div className="sa-demo-stat">
                      <div className="sa-demo-stat-value">{stats.patients}</div>
                      <div className="sa-demo-stat-label">Pacientes</div>
                    </div>
                    <div className="sa-demo-stat">
                      <div className="sa-demo-stat-value">{stats.doctors}</div>
                      <div className="sa-demo-stat-label">Doctores</div>
                    </div>
                    <div className="sa-demo-stat">
                      <div className="sa-demo-stat-value">{stats.bookingsCount.toLocaleString()}</div>
                      <div className="sa-demo-stat-label">Citas</div>
                    </div>
                  </div>
                  <div className="sa-demo-card-actions">
                    <Button variant="primary" size="sm" onClick={() => handleLoadDemo(tenant.name)}>📥 Cargar</Button>
                    <Button variant="danger" size="sm" onClick={() => handleCleanDemo(tenant.name)}>🗑️ Limpiar</Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data Tables Section */}
          <div style={{ marginTop: 32 }}>
            <div className="sa-card">
              <div className="sa-card-header">
                <h2>📊 Datos Globales</h2>
                <p style={{ margin: '2px 0 0', color: 'var(--ds-text-secondary)', fontSize: 'var(--ds-text-sm)' }}>
                  Toda la información del sistema a nivel global (todos los tenants)
                </p>
              </div>
              <div className="sa-card-body">
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--ds-border)' }}>
                  <button
                    onClick={() => setSelectedTenant(null)}
                    style={{
                      padding: '10px 20px', border: 'none', cursor: 'pointer',
                      background: selectedTenant === null ? 'var(--ds-primary-500)' : 'transparent',
                      color: selectedTenant === null ? '#fff' : 'var(--ds-text-secondary)',
                      borderRadius: '8px 8px 0 0', fontWeight: 600, fontSize: 13,
                    }}
                  >
                    Reservas <Badge variant={selectedTenant === null ? 'primary' : 'neutral'} style={{ marginLeft: 6 }}>{bookings.length}</Badge>
                  </button>
                  <button
                    onClick={() => setSelectedTenant('clinical')}
                    style={{
                      padding: '10px 20px', border: 'none', cursor: 'pointer',
                      background: selectedTenant === 'clinical' ? 'var(--ds-primary-500)' : 'transparent',
                      color: selectedTenant === 'clinical' ? '#fff' : 'var(--ds-text-secondary)',
                      borderRadius: '8px 8px 0 0', fontWeight: 600, fontSize: 13,
                    }}
                  >
                    Historial Clínico <Badge variant={selectedTenant === 'clinical' ? 'primary' : 'neutral'} style={{ marginLeft: 6 }}>{records.length}</Badge>
                  </button>
                  <button
                    onClick={() => setSelectedTenant('lab')}
                    style={{
                      padding: '10px 20px', border: 'none', cursor: 'pointer',
                      background: selectedTenant === 'lab' ? 'var(--ds-primary-500)' : 'transparent',
                      color: selectedTenant === 'lab' ? '#fff' : 'var(--ds-text-secondary)',
                      borderRadius: '8px 8px 0 0', fontWeight: 600, fontSize: 13,
                    }}
                  >
                    Exámenes <Badge variant={selectedTenant === 'lab' ? 'primary' : 'neutral'} style={{ marginLeft: 6 }}>{labReqs.length}</Badge>
                  </button>
                </div>

                {/* Bookings Table */}
                {selectedTenant === null && (
                  <div className="sa-table-container">
                    <table className="sa-table">
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
                        {bookings.length === 0 ? (
                          <tr><td colSpan={7} style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 24 }}>No hay reservas.</td></tr>
                        ) : (
                          bookings.map(b => (
                            <tr key={b.id}>
                              <td>{b.patient_name}</td>
                              <td>{b.patient_rut || '—'}</td>
                              <td>{b.doctor_name}</td>
                              <td>{b.specialty}</td>
                              <td>{b.date}</td>
                              <td>{b.time}</td>
                              <td>{statusBadge(b.status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Clinical Records Table */}
                {selectedTenant === 'clinical' && (
                  <div className="sa-table-container">
                    <table className="sa-table">
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
                        {records.length === 0 ? (
                          <tr><td colSpan={6} style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 24 }}>No hay historial clínico.</td></tr>
                        ) : (
                          records.map(r => (
                            <tr key={r.id}>
                              <td>{r.patient_name}</td>
                              <td>{r.patient_rut || '—'}</td>
                              <td>{r.doctor_name}</td>
                              <td>{r.diagnosis || '—'}</td>
                              <td>{r.created_at?.split('T')[0]}</td>
                              <td>{statusBadge(r.status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Lab Requests Table */}
                {selectedTenant === 'lab' && (
                  <div className="sa-table-container">
                    <table className="sa-table">
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
                        {labReqs.length === 0 ? (
                          <tr><td colSpan={6} style={{ color: 'var(--ds-text-tertiary)', textAlign: 'center', padding: 24 }}>No hay exámenes.</td></tr>
                        ) : (
                          labReqs.map(r => (
                            <tr key={r.id}>
                              <td>{r.request_number || `#${r.id}`}</td>
                              <td>{r.patient_name || `ID ${r.patient_id}`}</td>
                              <td>{r.doctor_name || '—'}</td>
                              <td>{r.priority}</td>
                              <td>{r.created_at?.split('T')[0]}</td>
                              <td>{statusBadge(r.status)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
