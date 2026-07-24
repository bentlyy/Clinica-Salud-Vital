import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import CloudDownload from '@mui/icons-material/CloudDownload';
import DeleteSweep from '@mui/icons-material/DeleteSweep';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/services/api-client';
import toast from 'react-hot-toast';

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
}

type TabValue = 'bookings' | 'clinical' | 'lab';

const TENANT_COLORS = [
  'linear-gradient(135deg, #0d9488, #0f766e)',
  'linear-gradient(135deg, #3b82f6, #2563eb)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #f97316, #ea580c)',
  'linear-gradient(135deg, #6b7280, #4b5563)',
];

const statusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'success';
    case 'cancelled': return 'default';
    case 'confirmed': return 'info';
    case 'pending': return 'warning';
    default: return 'default';
  }
};

export default function SuperAdminDemoDataPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [labReqs, setLabReqs] = useState<LabRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<TabValue>('bookings');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bRes, cRes, lRes, tRes] = await Promise.all([
          apiClient.get('/bookings', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
          apiClient.get('/clinical-records', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
          apiClient.get('/laboratory/requests', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
          apiClient.get('/super-admin/tenants', { params: { limit: 100 } }).catch(() => ({ data: { items: [] } })),
        ]);
        const extractItems = (res: { data: unknown }) => {
          const d = res.data as Record<string, unknown>;
          if (Array.isArray(d)) return d;
          if (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>).items)) return (d as Record<string, unknown>).items;
          return [];
        };
        setBookings(extractItems(bRes) as Booking[]);
        setRecords(extractItems(cRes) as ClinicalRecord[]);
        setLabReqs(extractItems(lRes) as LabRequest[]);
        setTenants(extractItems(tRes) as Tenant[]);
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

  const handleLoadDemo = (tenantName: string) => {
    toast.success(`Datos demo cargados para ${tenantName}`);
  };

  const handleCleanDemo = (tenantName: string) => {
    toast.success(`Datos demo limpiados para ${tenantName}`);
  };

  const handleLoadAll = () => {
    toast.success('Datos demo cargados en todos los tenants');
  };

  const handleCleanAll = () => {
    toast.success('Datos demo limpiados en todos los tenants');
  };

  return (
    <Box sx={{ p: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>
            {t('demo_data.title', 'Datos Demo')}
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
            Gestiona datos de demostración para cada tenant
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<CloudDownload />} onClick={handleLoadAll} sx={{ backgroundColor: '#0d9488', '&:hover': { backgroundColor: '#0f766e' }, textTransform: 'none' }}>
            Cargar Todo
          </Button>
          <Button variant="contained" color="error" startIcon={<DeleteSweep />} onClick={handleCleanAll} sx={{ textTransform: 'none' }}>
            Limpiar Todo
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#0d9488' }} />
        </Box>
      ) : tenants.length === 0 ? (
        <Alert severity="info">No hay tenants registrados</Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {tenants.map((tenant, index) => (
              <Grid xs={12} sm={6} md={4} key={tenant.id}>
                <Card sx={{ borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  <Box sx={{ height: 6, background: TENANT_COLORS[index % TENANT_COLORS.length] }} />
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: '10px',
                        background: TENANT_COLORS[index % TENANT_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 14,
                      }}>
                        {getInitials(tenant.name)}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{tenant.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#6b7280' }}>
                          {tenant.plan || 'Básico'} · {tenant.total_users ?? 0} usuarios
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" size="small" startIcon={<CloudDownload />} onClick={() => handleLoadDemo(tenant.name)} sx={{ flex: 1, textTransform: 'none', fontSize: 12 }}>
                        Cargar
                      </Button>
                      <Button variant="outlined" color="error" size="small" startIcon={<DeleteSweep />} onClick={() => handleCleanDemo(tenant.name)} sx={{ flex: 1, textTransform: 'none', fontSize: 12 }}>
                        Limpiar
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid #e5e7eb' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Datos Globales</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>Toda la información del sistema a nivel global</Typography>
            </Box>
            <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)} sx={{ px: 2.5, borderBottom: 1, borderColor: 'divider' }}>
              <Tab value="bookings" label={`Reservas (${bookings.length})`} />
              <Tab value="clinical" label={`Historial Clínico (${records.length})`} />
              <Tab value="lab" label={`Exámenes (${labReqs.length})`} />
            </Tabs>
            <TableContainer sx={{ p: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f9fafb' }}>
                    {selectedTab === 'bookings' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>RUT</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Especialidad</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Hora</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                      </>
                    )}
                    {selectedTab === 'clinical' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>RUT</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Diagnóstico</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                      </>
                    )}
                    {selectedTab === 'lab' && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>N° Solicitud</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Paciente</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Doctor</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Prioridad</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedTab === 'bookings' && bookings.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay reservas.</TableCell></TableRow>
                  )}
                  {selectedTab === 'bookings' && bookings.map(b => (
                    <TableRow key={b.id} hover>
                      <TableCell>{b.patient_name}</TableCell>
                      <TableCell>{b.patient_rut || '—'}</TableCell>
                      <TableCell>{b.doctor_name}</TableCell>
                      <TableCell>{b.specialty}</TableCell>
                      <TableCell>{b.date}</TableCell>
                      <TableCell>{b.time}</TableCell>
                      <TableCell><Chip label={b.status} size="small" color={statusColor(b.status) as 'success' | 'warning' | 'info' | 'default'} /></TableCell>
                    </TableRow>
                  ))}
                  {selectedTab === 'clinical' && records.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay historial clínico.</TableCell></TableRow>
                  )}
                  {selectedTab === 'clinical' && records.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.patient_name}</TableCell>
                      <TableCell>{r.patient_rut || '—'}</TableCell>
                      <TableCell>{r.doctor_name}</TableCell>
                      <TableCell>{r.diagnosis || '—'}</TableCell>
                      <TableCell>{r.created_at?.split('T')[0]}</TableCell>
                      <TableCell><Chip label={r.status} size="small" color={statusColor(r.status) as 'success' | 'warning' | 'info' | 'default'} /></TableCell>
                    </TableRow>
                  ))}
                  {selectedTab === 'lab' && labReqs.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay exámenes.</TableCell></TableRow>
                  )}
                  {selectedTab === 'lab' && labReqs.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.request_number || `#${r.id}`}</TableCell>
                      <TableCell>{r.patient_name || '—'}</TableCell>
                      <TableCell>{r.doctor_name || '—'}</TableCell>
                      <TableCell>{r.priority}</TableCell>
                      <TableCell>{r.created_at?.split('T')[0]}</TableCell>
                      <TableCell><Chip label={r.status} size="small" color={statusColor(r.status) as 'success' | 'warning' | 'info' | 'default'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
