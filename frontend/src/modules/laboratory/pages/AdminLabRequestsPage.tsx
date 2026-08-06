import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Skeleton,
} from '@mui/material';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { getLabRequests } from '../../laboratory/services/lab.service';
import type { LabRequest } from '../../laboratory/types/lab.types';

export default function AdminLabRequestsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getLabRequests({ limit: 500 });
        setRequests(Array.isArray(res) ? res : res.data || []);
      } catch {
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, LabRequest[]>();
    for (const r of requests) {
      const key = r.doctor_name || t('admin_lab_requests:noDoctor');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [requests]);

  const getStatusConfig = (status: string) => {
    const map: Record<string, { bg: string; fg: string }> = {
      pending: { bg: theme.palette.custom.status.warning.bg, fg: theme.palette.warning.dark },
      completed: { bg: theme.palette.custom.status.success.bg, fg: theme.palette.success.dark },
      delivered: { bg: theme.palette.custom.status.success.bg, fg: theme.palette.custom.status.success.text },
      cancelled: { bg: theme.palette.custom.surface.sunken, fg: theme.palette.text.secondary },
      rejected: { bg: theme.palette.custom.status.error.bg, fg: theme.palette.error.main },
    };
    return map[status] || { bg: theme.palette.custom.surface.sunken, fg: theme.palette.text.secondary };
  };

  const getPriorityConfig = (priority: string) => {
    const map: Record<string, { bg: string; fg: string }> = {
      urgent: { bg: theme.palette.custom.status.warning.bg, fg: theme.palette.warning.dark },
      emergency: { bg: theme.palette.custom.status.error.bg, fg: theme.palette.error.main },
      normal: { bg: theme.palette.custom.status.info.bg, fg: theme.palette.info.dark },
      low: { bg: theme.palette.custom.surface.sunken, fg: theme.palette.text.secondary },
    };
    return map[priority] || { bg: theme.palette.custom.surface.sunken, fg: theme.palette.text.secondary };
  };

  if (loading) return <Box sx={{ p: 4 }}>{[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={200} sx={{ mb: 2, borderRadius: '12px' }} />)}</Box>;

  return (
    <Box>
      <PageHeader title={t('admin_lab_requests:title')} subtitle={t('admin_lab_requests:subtitle')} />

      {grouped.length === 0 ? (
        <EmptyState title={t('admin_lab_requests:emptyTitle')} message={t('admin_lab_requests:emptyDesc')} />
      ) : (
        grouped.map(([doctorName, doctorRequests]) => (
          <Paper key={doctorName} sx={{ p: 2.5, mb: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>{doctorName}</Typography>
              <Chip label={t('admin_lab_requests:requestCount', { count: doctorRequests.length })} size="small" sx={{ backgroundColor: theme.palette.custom.status.info.bg, color: theme.palette.info.dark, fontWeight: 600 }} />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('admin_lab_requests:colRequestNumber')}</TableCell>
                    <TableCell>{t('admin_lab_requests:colPatient')}</TableCell>
                    <TableCell>{t('admin_lab_requests:colPriority')}</TableCell>
                    <TableCell>{t('admin_lab_requests:colDate')}</TableCell>
                    <TableCell>{t('admin_lab_requests:colStatus')}</TableCell>
                    <TableCell align="right">{t('admin_lab_requests:colAction')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {doctorRequests.map((r) => {
                    const st = getStatusConfig(r.status);
                    const pr = getPriorityConfig(r.priority);
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{r.request_number || `#${r.id}`}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{r.patient_name || `ID ${r.patient_id}`}</Typography></TableCell>
                        <TableCell><Chip label={r.priority} size="small" sx={{ backgroundColor: pr.bg, color: pr.fg, fontSize: 11 }} /></TableCell>
                        <TableCell><Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: 13 }}>{r.created_at?.split('T')[0] || '—'}</Typography></TableCell>
                        <TableCell><Chip label={r.status} size="small" sx={{ backgroundColor: st.bg, color: st.fg, fontSize: 11 }} /></TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => navigate(`/laboratory/requests/${r.id}`)} sx={{ textTransform: 'none', fontSize: 12, color: theme.palette.primary.main }}>
                            {t('admin_lab_requests:view')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))
      )}
    </Box>
  );
}
