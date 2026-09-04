import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/shared/services/api-client';
import { DataTable } from '@/shared/components/ui/DataTable';

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
        <>
          {tab === 'bookings' && (
          <DataTable
            key="bookings"
            columns={[
              { key: 'patient_name', header: t('demo_data:patient', 'Paciente') },
              { key: 'patient_rut', header: t('demo_data:rut', 'RUT'), render: (b) => b.patient_rut || '—' },
              { key: 'doctor_name', header: t('demo_data:doctor', 'Doctor') },
              { key: 'specialty', header: t('demo_data:specialty', 'Especialidad') },
              { key: 'date', header: t('demo_data:date', 'Fecha') },
              { key: 'time', header: t('demo_data:time', 'Hora') },
              {
                key: 'status',
                header: t('demo_data:status', 'Estado'),
                render: (b) => <Chip label={b.status} size="small" color={statusColor(b.status) as 'success' | 'warning' | 'info' | 'default'} />,
              },
            ]}
            data={bookings}
            keyExtractor={(b) => b.id}
            emptyTitle={t('demo_data:no_bookings', 'No hay reservas.')}
            rowsPerPage={Math.max(bookings.length, 1)}
          />
        )}
        {tab === 'clinical' && (
          <DataTable
            key="clinical"
            columns={[
              { key: 'patient_name', header: t('demo_data:patient', 'Paciente') },
              { key: 'patient_rut', header: t('demo_data:rut', 'RUT'), render: (r) => r.patient_rut || '—' },
              { key: 'doctor_name', header: t('demo_data:doctor', 'Doctor') },
              { key: 'diagnosis', header: t('demo_data:diagnosis', 'Diagnóstico'), render: (r) => r.diagnosis || '—' },
              { key: 'created_at', header: t('demo_data:date', 'Fecha'), render: (r) => r.created_at?.split('T')[0] },
              {
                key: 'status',
                header: t('demo_data:status', 'Estado'),
                render: (r) => <Chip label={r.status} size="small" color={statusColor(r.status) as 'success' | 'warning' | 'info' | 'default'} />,
              },
            ]}
            data={records}
            keyExtractor={(r) => r.id}
            emptyTitle={t('demo_data:no_records', 'No hay historial clínico.')}
            rowsPerPage={Math.max(records.length, 1)}
          />
        )}
        {tab === 'lab' && (
          <DataTable
            key="lab"
            columns={[
              { key: 'request_number', header: t('demo_data:request_number', 'N° Solicitud'), render: (r) => r.request_number || `#${r.id}` },
              { key: 'patient_name', header: t('demo_data:patient', 'Paciente'), render: (r) => r.patient_name || '—' },
              { key: 'doctor_name', header: t('demo_data:doctor', 'Doctor'), render: (r) => r.doctor_name || '—' },
              { key: 'priority', header: t('demo_data:priority', 'Prioridad') },
              { key: 'created_at', header: t('demo_data:date', 'Fecha'), render: (r) => r.created_at?.split('T')[0] },
              {
                key: 'status',
                header: t('demo_data:status', 'Estado'),
                render: (r) => <Chip label={r.status} size="small" color={statusColor(r.status) as 'success' | 'warning' | 'info' | 'default'} />,
              },
            ]}
            data={labReqs}
            keyExtractor={(r) => r.id}
            emptyTitle={t('demo_data:no_lab', 'No hay exámenes.')}
            rowsPerPage={Math.max(labReqs.length, 1)}
          />
        )}
        </>
      )}
    </Box>
  );
}
