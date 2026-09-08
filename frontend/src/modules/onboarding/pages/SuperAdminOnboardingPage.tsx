import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { onboardingService } from '../services/onboarding.service';
import type {
  OnboardingApplication,
  OnboardingApplicationDetail,
  OnboardingStatus,
} from '../types/onboarding.types';

type FilterTab = 'all' | OnboardingStatus;

export default function SuperAdminOnboardingPage() {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const [applications, setApplications] = useState<OnboardingApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<OnboardingApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await onboardingService.listApplications({
        status: statusTab === 'all' ? undefined : statusTab,
        search: search || undefined,
        page,
        limit: 20,
      });
      setApplications(res.data);
      setTotal(res.pagination.total);
    } finally {
      setLoading(false);
    }
  }, [statusTab, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await onboardingService.getApplication(id);
      setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  };

  const approve = async () => {
    if (!detail) return;
    setProcessing(true);
    try {
      await onboardingService.approveApplication(detail.id);
      setDetail((prev) => (prev ? { ...prev, status: 'approved' } : prev));
      await load();
    } finally {
      setProcessing(false);
    }
  };

  const reject = async () => {
    if (!detail || !rejectReason.trim()) return;
    setProcessing(true);
    try {
      await onboardingService.rejectApplication(detail.id, rejectReason.trim());
      setDetail((prev) => (prev ? { ...prev, status: 'rejected', rejection_reason: rejectReason.trim() } : prev));
      setRejectOpen(false);
      setRejectReason('');
      await load();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">{t('applications.title')}</Typography>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/saas')}>
          {t('applications.back')}
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1, flexWrap: 'wrap' }}>
          <Tabs value={statusTab} onChange={(_, v) => { setStatusTab(v); setPage(1); }}>
            <Tab label={t(`applications.tabs.all`)} value="all" />
            <Tab label={t(`applications.tabs.pending`)} value="pending" />
            <Tab label={t(`applications.tabs.approved`)} value="approved" />
            <Tab label={t(`applications.tabs.rejected`)} value="rejected" />
          </Tabs>
          <TextField
            size="small"
            label={t('applications.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            sx={{ minWidth: 260 }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">{t('applications.total', { count: total })}</Typography>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : applications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>{t('documents.empty')}</Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('applications.col.company')}</TableCell>
                <TableCell>{t('applications.col.taxId')}</TableCell>
                <TableCell>{t('applications.col.plan')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('applications.col.completeness')}</TableCell>
                <TableCell align="right">{t('applications.col.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{app.company_name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[app.country, app.city].filter(Boolean).join(', ')} · {app.admin_email}
                    </Typography>
                  </TableCell>
                  <TableCell>{app.tax_id || '—'}</TableCell>
                  <TableCell><Chip size="small" label={app.plan_code} /></TableCell>
                  <TableCell><StatusChip status={app.status} /></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={app.completeness_pct}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 5, maxWidth: 120 }}
                        color={app.completeness_pct >= 80 ? 'success' : app.completeness_pct >= 40 ? 'warning' : 'error'}
                      />
                      <Typography variant="caption">{app.completeness_pct}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openDetail(app.id)}>{t('applications.view')}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {page > 1 && (
        <Box sx={{ mt: 2 }}>
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>{t('common.previous')}</Button>
          <Button onClick={() => setPage((p) => p + 1)} disabled={applications.length < 20}>{t('common.next')}</Button>
        </Box>
      )}

      {/* Detalle */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {detail.company_name}
                <StatusChip status={detail.status} />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {detailLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : (
                <>
                  {detail.status === 'rejected' && detail.rejection_reason && (
                    <Alert severity="error" sx={{ mb: 2 }}>{detail.rejection_reason}</Alert>
                  )}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1, mb: 2 }}>
                    <DetailField label={t('account.tenantName')} value={detail.company_name} />
                    <DetailField label={t('profile.taxId')} value={detail.tax_id} />
                    <DetailField label={t('account.country')} value={detail.country} />
                    <DetailField label={t('profile.city')} value={detail.city} />
                    <DetailField label={t('profile.phone')} value={detail.phone} />
                    <DetailField label={t('profile.website')} value={detail.website} />
                    <DetailField label={t('account.adminName')} value={detail.admin_name} />
                    <DetailField label={t('account.adminEmail')} value={detail.admin_email} />
                    <DetailField label={t('profile.legalName')} value={detail.legal_name} />
                    <DetailField label={t('profile.licenseNumber')} value={detail.license_number} />
                    <DetailField label={t('profile.doctorCount')} value={detail.doctor_count != null ? String(detail.doctor_count) : undefined} />
                    <DetailField label={t('account.plan')} value={detail.plan_code} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('clinic.completeness')}</Typography>
                  <LinearProgress variant="determinate" value={detail.completeness_pct} sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('documents.title')} ({detail.documents.length})</Typography>
                  {detail.documents.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">{t('documents.empty')}</Typography>
                  ) : (
                    detail.documents.map((d) => (
                      <Chip key={d.id} size="small" label={`${t(`documents.categories.${d.category}`)} · ${d.original_name}`} sx={{ mr: 1, mb: 1 }} />
                    ))
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions>
              {detail.status === 'pending' && (
                <>
                  <Button color="error" startIcon={<Cancel />} onClick={() => setRejectOpen(true)} disabled={processing}>
                    {t('applications.reject')}
                  </Button>
                  <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={approve} disabled={processing}>
                    {t('applications.approve')}
                  </Button>
                </>
              )}
              <Button onClick={() => setDetail(null)}>{t('common.close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Rechazar */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('applications.rejectTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('applications.rejectHint')}</DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={t('applications.rejectReason')}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" onClick={reject} disabled={!rejectReason.trim() || processing}>
            {t('applications.reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const statusColor: Record<OnboardingStatus, 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

function StatusChip({ status }: { status: OnboardingStatus }) {
  const { t } = useTranslation('onboarding');
  return <Chip size="small" color={statusColor[status]} label={t(`status.${status}`)} />;
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}