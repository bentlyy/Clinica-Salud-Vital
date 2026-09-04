import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import { formatDate } from '@/shared/utils/localeUtils';
import { clinicalRecordService } from '../../clinical-records/services/clinical-record.service';
import type { ClinicalRecord } from '../../clinical-records/types/clinical-record.types';

export default function AdminMedicalHistoryPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await clinicalRecordService.list({ limit: 500 });
        setRecords(res.data || []);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ClinicalRecord[]>();
    for (const r of records) {
      const key = `${r.doctor_name || t('admin_medical_history:noDoctor')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [records]);

  const getStatusConfig = (status: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      completed: { bg: theme.palette.success.light, fg: theme.palette.success.main, label: t('admin_medical_history:status.completed') },
      draft: { bg: theme.palette.warning.light, fg: theme.palette.warning.main, label: t('admin_medical_history:status.draft') },
      cancelled: { bg: theme.palette.grey[100], fg: theme.palette.text.secondary, label: t('admin_medical_history:status.cancelled') },
    };
    return map[status] || { bg: theme.palette.grey[100], fg: theme.palette.text.secondary, label: status };
  };

  const historyColumns: DataTableColumn<ClinicalRecord>[] = [
    {
      key: 'patient_name',
      header: t('admin_medical_history:colPatient'),
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {r.patient_name || `Paciente #${r.patient_id}`}
        </Typography>
      ),
    },
    {
      key: 'diagnosis',
      header: t('admin_medical_history:colDiagnosis'),
      render: (r) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {r.diagnosis || '—'}
        </Typography>
      ),
    },
    {
      key: 'created_at',
      header: t('admin_medical_history:colDate'),
      render: (r) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: 13 }}>
          {formatDate(r.created_at)}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: t('admin_medical_history:colStatus'),
      render: (r) => {
        const st = getStatusConfig(r.status || 'draft');
        return <Chip label={st.label} size="small" sx={{ backgroundColor: st.bg, color: st.fg, fontSize: 11 }} />;
      },
    },
  ];

  if (loading) return <LoadingState message={t('admin_medical_history:loading', 'Cargando historial...')} />;

  return (
    <Box>
      <PageHeader title={t('admin_medical_history:title')} subtitle={t('admin_medical_history:subtitle')} />

      {grouped.length === 0 ? (
        <EmptyState title={t('admin_medical_history:emptyTitle')} message={t('admin_medical_history:emptyDesc')} />
      ) : (
        grouped.map(([doctorName, doctorRecords]) => (
          <Paper key={doctorName} sx={{ p: 2.5, mb: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{doctorName}</Typography>
              <Chip label={t('admin_medical_history:recordCount', { count: doctorRecords.length })} size="small" sx={{ backgroundColor: theme.palette.info.light, color: theme.palette.info.main, fontWeight: 600 }} />
            </Box>
            <DataTable<ClinicalRecord>
              columns={historyColumns}
              data={doctorRecords}
              keyExtractor={(r) => r.id}
              emptyTitle={t('admin_medical_history:emptyTitle')}
              emptyMessage={t('admin_medical_history:emptyDesc')}
              rowsPerPage={doctorRecords.length || 1}
            />
          </Paper>
        ))
      )}
    </Box>
  );
}
