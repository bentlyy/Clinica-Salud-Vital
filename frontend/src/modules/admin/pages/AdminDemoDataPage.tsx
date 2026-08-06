import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/services/api-client';

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

type TabValue = 'bookings' | 'clinical' | 'lab';

const statusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'success';
    case 'cancelled': return 'default';
    case 'confirmed': return 'info';
    case 'pending': return 'warning';
    default: return 'default';
  }
};

export default function AdminDemoDataPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [tab, setTab] = useState<TabValue>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [labReqs, setLabReqs] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bRes, cRes, lRes] = await Promise.all([
          apiClient.get('/bookings', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
          apiClient.get('/clinical-records', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
          apiClient.get('/laboratory/requests', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
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
      } catch {
        setBookings([]);
        setRecords([]);
        setLabReqs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tabs: { key: TabValue; label: string; count: number }[] = [
    { key: 'bookings', label: t('demo_data:tab_bookings', 'Reservas'), count: bookings.length },
    { key: 'clinical', label: t('demo_data:tab_clinical', 'Historial Clínico'), count: records.length },
    { key: 'lab', label: t('demo_data:tab_lab', 'Exámenes'), count: labReqs.length },
  ];

  return (
    <Box sx={{ p: 0 }}>
      <Alert severity="info" sx={{ mb: 3, borderRadius: '10px' }}>
        <strong>{t('demo_data:title', 'Datos de Demostración')}</strong> — {t('demo_data:description', 'Información de ejemplo precargada en el sistema.')}
      </Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        {tabs.map(tb => (
          <Tab key={tb.key} value={tb.key} label={`${tb.label} (${tb.count})`} />
        ))}
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.custom.surface.muted }}>
                {tab === 'bookings' && (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:patient', 'Paciente')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>RUT</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:doctor', 'Doctor')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:specialty', 'Especialidad')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:date', 'Fecha')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:time', 'Hora')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:status', 'Estado')}</TableCell>
                  </>
                )}
                {tab === 'clinical' && (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:patient', 'Paciente')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>RUT</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:doctor', 'Doctor')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:diagnosis', 'Diagnóstico')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:date', 'Fecha')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:status', 'Estado')}</TableCell>
                  </>
                )}
                {tab === 'lab' && (
                  <>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:request_number', 'N° Solicitud')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:patient', 'Paciente')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:doctor', 'Doctor')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:priority', 'Prioridad')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:date', 'Fecha')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('demo_data:status', 'Estado')}</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {tab === 'bookings' && bookings.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('demo_data:no_bookings', 'No hay reservas.')}</TableCell></TableRow>
              )}
              {tab === 'bookings' && bookings.map(b => (
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

              {tab === 'clinical' && records.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('demo_data:no_records', 'No hay historial clínico.')}</TableCell></TableRow>
              )}
              {tab === 'clinical' && records.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.patient_name}</TableCell>
                  <TableCell>{r.patient_rut || '—'}</TableCell>
                  <TableCell>{r.doctor_name}</TableCell>
                  <TableCell>{r.diagnosis || '—'}</TableCell>
                  <TableCell>{r.created_at?.split('T')[0]}</TableCell>
                  <TableCell><Chip label={r.status} size="small" color={statusColor(r.status) as 'success' | 'warning' | 'info' | 'default'} /></TableCell>
                </TableRow>
              ))}

              {tab === 'lab' && labReqs.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>{t('demo_data:no_lab', 'No hay exámenes.')}</TableCell></TableRow>
              )}
              {tab === 'lab' && labReqs.map(r => (
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
      )}
    </Box>
  );
}
