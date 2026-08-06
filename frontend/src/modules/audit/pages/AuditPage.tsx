import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/shared/providers/AuthProvider';
import { superAdminService } from '@/modules/super-admin/services/super-admin.service';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  MenuItem,
  Button,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Security from '@mui/icons-material/Security';
import Visibility from '@mui/icons-material/Visibility';
import Download from '@mui/icons-material/Download';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { formatDateTime } from '@/shared/utils/localeUtils';
import { useAuditList } from '../hooks/useAudit';
import { AuditDetailDialog } from '../components/AuditDetailDialog';
import { MotionDiv } from '@/shared/utils/animations';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_OPTIONS,
  type AuditLog,
} from '../types/audit.types';

export default function AuditPage() {
  const { t } = useTranslation('audit');
  const { t: tc } = useTranslation('common');
  const theme = useTheme();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [clinicFilter, setClinicFilter] = useState('');
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    superAdminService
      .listTenants({ page: 1, limit: 200 })
      .then((res) => {
        if (active) setClinics(res.data.map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [isSuperAdmin]);

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useAuditList({
    page: page + 1,
    limit,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    entity_type: entityFilter !== 'all' ? entityFilter : undefined,
    tenant_id: isSuperAdmin && clinicFilter ? clinicFilter : undefined,
  });

  const logs = response?.data ?? [];
  const total = response?.total ?? 0;

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleExport = () => {
    const headers = [t('csvHeaders.date'), t('csvHeaders.user'), t('csvHeaders.action'), t('csvHeaders.entity'), t('csvHeaders.entityId'), t('csvHeaders.ip')];
    const rows = logs.map((log) => [
      formatDateTime(log.created_at),
      log.user_name || t('userFallback', { id: log.user_id }),
      AUDIT_ACTION_LABELS[log.action] || log.action,
      AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type,
      log.entity_id?.toString() ?? '',
      log.ip_address ?? '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <LoadingState message={t('loading')} />;
  if (error) return <ErrorState error={error as Error} onRetry={() => void refetch()} />;

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            {t('exportAuditLog')}
          </Button>
        }
      />

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 250 }}
          />
          <TextField
            select
            size="small"
            label={t('actionLabel')}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          >
            {AUDIT_ACTION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('entityLabel')}
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 140 }}
          >
            {AUDIT_ENTITY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          {isSuperAdmin && (
            <TextField
              select
              size="small"
              label={t('clinicFilter')}
              value={clinicFilter}
              onChange={(e) => {
                setClinicFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">{t('allClinics')}</MenuItem>
              {clinics.map((clinic) => (
                <MenuItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </Paper>

      {/* Table */}
      {logs.length === 0 ? (
        <EmptyState
          icon={<Security sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('noAuditLogs')}
          message={t('noResultsWithFilters')}
        />
      ) : (
        <TableContainer component={Paper} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('user')}</TableCell>
                <TableCell>{t('action')}</TableCell>
                <TableCell>{t('entity')}</TableCell>
                <TableCell>{t('details')}</TableCell>
                <TableCell>{t('ipAddress')}</TableCell>
                <TableCell>{t('date')}</TableCell>
                <TableCell align="right">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => {
                const actionLabel = AUDIT_ACTION_LABELS[log.action] || log.action;
                const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type;
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.custom.brand.lightest,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Security sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                        </Box>
                        <Box>
                          <Box component="span" sx={{ fontWeight: 500, color: theme.palette.text.primary, fontSize: '0.875rem' }}>
                            {log.user_name || t('userFallback', { id: log.user_id })}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={actionLabel}
                        size="small"
                        sx={{
                          backgroundColor: theme.palette.custom.brand.lightest,
                          color: theme.palette.primary.main,
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entityLabel}
                        size="small"
                        sx={{
                          backgroundColor: theme.palette.custom.status.info.bg,
                          color: theme.palette.info.dark,
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: theme.palette.text.secondary, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', fontSize: '0.875rem' }}>
                        {log.entity_id ? `ID: ${log.entity_id}` : '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: theme.palette.text.secondary, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.ip_address || '—'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box component="span" sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
                        {formatDateTime(log.created_at)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <MotionDiv whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetail(log)}
                          sx={{ color: theme.palette.primary.main }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </MotionDiv>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={limit}
            labelRowsPerPage={t('rowsLabel')}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} ${tc('of')} ${count}`
            }
          />
        </TableContainer>
      )}

      {/* Detail Dialog */}
      <AuditDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedLog(null);
        }}
        log={selectedLog}
      />
    </Box>
  );
}
