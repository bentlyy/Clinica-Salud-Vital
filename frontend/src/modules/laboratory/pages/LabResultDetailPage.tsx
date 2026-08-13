import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/shared/providers/AuthProvider';
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
  LinearProgress,
  Alert,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WarningAmber from '@mui/icons-material/WarningAmber';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { getLabRequestById } from '../../laboratory/services/lab.service';
import { getLabColor } from '@/shared/components/lab-icons/LabIcons';
import { formatReferenceRange, getRangeStatus, type ReferenceRanges } from '../utils/labRange';
import type { LabRequest, LabRequestItem } from '../../laboratory/types/lab.types';

export default function LabResultDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [request, setRequest] = useState<(LabRequest & { items: LabRequestItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getLabRequestById(Number(id))
      .then((res) => setRequest(res as LabRequest & { items: LabRequestItem[] }))
      .catch(() => setError(t('lab_result_detail:errorLoading')))
      .finally(() => setLoading(false));
  }, [id]);

  const goBack = () => {
    if (user?.role === 'doctor') navigate('/doctor/lab-results');
    else navigate('/patient/laboratory');
  };

  if (loading) return <Box sx={{ p: 4 }}><Skeleton variant="rounded" height={200} sx={{ borderRadius: '12px' }} /></Box>;
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert></Box>;
  if (!request) return <Box sx={{ p: 4 }}><Alert severity="info" sx={{ borderRadius: '10px' }}>{t('lab_result_detail:notFound')}</Alert></Box>;

  const items = request.items || [];
  const testNames = items.map((i) => i.test_name).filter(Boolean).join(', ');
  const mainTestName = testNames || `Solicitud #${request.id}`;
  const color = getLabColor(items[0]?.lab_test_id?.toString() || '');
  const completedItems = items.filter((i) => i.result_value);
  const progressPct = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;
  const isCompleted = request.status === 'delivered' || request.status === 'signed';

  const outOfRangeItems = items.filter((item) => {
    const status = getRangeStatus(item.result_value, (item as { reference_ranges?: ReferenceRanges }).reference_ranges);
    return status === 'high' || status === 'low';
  });

  const statusColors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: theme.palette.custom.status.warning.bg, fg: theme.palette.warning.dark },
    delivered: { bg: theme.palette.custom.status.success.bg, fg: theme.palette.custom.status.success.text },
    signed: { bg: theme.palette.custom.brand.lightest, fg: theme.palette.primary.main },
    cancelled: { bg: theme.palette.custom.surface.sunken, fg: theme.palette.text.secondary },
  };
  const st = statusColors[request.status] || { bg: theme.palette.custom.surface.sunken, fg: theme.palette.text.secondary };

  return (
    <Box>
      <PageHeader
        title={mainTestName}
        subtitle={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={request.status} size="small" sx={{ backgroundColor: st.bg, color: st.fg, fontWeight: 600 }} />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {request.created_at?.split('T')[0]}
            </Typography>
          </Box>
        }
        action={
          <Button startIcon={<ArrowBack />} onClick={goBack} sx={{ textTransform: 'none' }}>{t('lab_result_detail:back')}</Button>
        }
      />

      {/* Progress */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${color}30`, borderRadius: '12px', backgroundColor: `${color}08` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              sx={{
                height: 8, borderRadius: 4,
                backgroundColor: theme.palette.divider,
                '& .MuiLinearProgress-bar': { borderRadius: 4, backgroundColor: isCompleted ? theme.palette.success.main : theme.palette.warning.main },
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: isCompleted ? theme.palette.success.main : theme.palette.warning.main, flexShrink: 0 }}>
            {completedItems.length}/{items.length}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          {isCompleted ? t('lab_result_detail:allCompleted') : t('lab_result_detail:progress', { done: completedItems.length, total: items.length })}
        </Typography>
      </Paper>

      {/* Results Table */}
      {outOfRangeItems.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: '10px' }}
          icon={<WarningAmber />}
        >
          {t('lab_result_detail:anomalyBanner', 'Este informe contiene {{count}} valor(es) fuera de rango', { count: outOfRangeItems.length })}
        </Alert>
      )}
      <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('lab_result_detail:colExam')}</TableCell>
                <TableCell>{t('lab_result_detail:colResult')}</TableCell>
                <TableCell>{t('lab_result_detail:colReference')}</TableCell>
                <TableCell>{t('lab_result_detail:colNotes')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => {
                const hasResult = !!item.result_value;
                const referenceRanges = (item as { reference_ranges?: ReferenceRanges }).reference_ranges;
                const rangeStatus = getRangeStatus(item.result_value, referenceRanges);
                const isAbnormal = rangeStatus === 'high' || rangeStatus === 'low';
                return (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{
                      backgroundColor: isAbnormal
                        ? theme.palette.error.light
                        : idx % 2 !== 0
                          ? theme.palette.custom.surface.muted
                          : 'transparent',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          backgroundColor: isAbnormal
                            ? theme.palette.error.main
                            : hasResult ? theme.palette.success.main : theme.palette.warning.main, flexShrink: 0,
                        }} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.test_name || `Test #${item.lab_test_id}`}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {hasResult ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: isAbnormal ? theme.palette.error.main : theme.palette.custom.status.success.text,
                          }}
                        >
                          {item.result_value}
                          {item.unit && <Typography component="span" variant="caption" sx={{ ml: 0.5, fontWeight: 400, color: theme.palette.text.secondary }}>{item.unit}</Typography>}
                          {isAbnormal && (
                            <Chip
                              size="small"
                              label={rangeStatus === 'high'
                                ? t('lab_result_detail:high', 'Alto')
                                : t('lab_result_detail:low', 'Bajo')}
                              sx={{ ml: 1, fontSize: 10, fontWeight: 700, bgcolor: theme.palette.error.main, color: theme.palette.common.white }}
                            />
                          )}
                        </Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>{t('lab_result_detail:pending')}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: 13 }}>{formatReferenceRange(referenceRanges)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: 13 }}>{item.result_notes || '—'}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {request.notes && (
        <Paper sx={{ p: 2, mt: 2, border: `1px solid ${color}30`, borderRadius: '12px', backgroundColor: `${color}08` }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>{t('lab_result_detail:requestNotes')}</Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.primary, mt: 0.5 }}>{request.notes}</Typography>
        </Paper>
      )}
    </Box>
  );
}
