import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Remove from '@mui/icons-material/Remove';
import Visibility from '@mui/icons-material/Visibility';
import Download from '@mui/icons-material/Download';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';
import { getLabRequests, getLabRequestById, createLabRequest, getLabTests } from '../../laboratory/services/lab.service';
import { clinicalRecordService } from '../../clinical-records/services/clinical-record.service';
import { downloadLabOrderPdf } from '@/shared/utils/pdf';
import type { LabRequest, LabRequestItem } from '../../laboratory/types/lab.types';
import toast from 'react-hot-toast';

export default function DoctorLabResultsPage() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<(LabRequest & { items: LabRequestItem[] }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New request form
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [testIds, setTestIds] = useState<number[]>([]);
  const [labTests, setLabTests] = useState<{ id: number; name: string; category?: string }[]>([]);
  const [patients, setPatients] = useState<{ patient_id: number; patient_name?: string; patient_email?: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, testsRes, recsRes] = await Promise.allSettled([
        getLabRequests({ limit: 100 }),
        getLabTests({}).catch(() => []),
        clinicalRecordService.list({ limit: 500 }),
      ]);

      if (reqRes.status === 'fulfilled') {
        const d = reqRes.value;
        setRequests(Array.isArray(d) ? d : d.data || []);
      }
      if (testsRes.status === 'fulfilled') {
        setLabTests(testsRes.value as unknown as { id: number; name: string }[]);
      }
      if (recsRes.status === 'fulfilled') {
        const page = recsRes.value;
        const records = page.data || [];
        const patientMap = new Map<number, { patient_id: number; patient_name?: string; patient_email?: string }>();
        for (const r of records) {
          if (r.patient_id && !patientMap.has(r.patient_id)) {
            patientMap.set(r.patient_id, { patient_id: r.patient_id, patient_name: r.patient_name, patient_email: r.patient_email });
          }
        }
        setPatients(Array.from(patientMap.values()));
      }
    } catch {
      setError(t('doctor_lab_results:errorLoad'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const req = await getLabRequestById(id);
      setDetailRequest(req as LabRequest & { items: LabRequestItem[] });
    } catch {
      toast.error(t('doctor_lab_results:errorDetail'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!patientId || testIds.length === 0) {
      toast.error(t('doctor_lab_results:selectPatientAndExam'));
      return;
    }
    setSaving(true);
    try {
      await createLabRequest({
        patient_id: Number(patientId),
        notes: notes || undefined,
        test_ids: testIds,
      });
      toast.success(t('doctor_lab_results:requestCreated'));
      setNewDialogOpen(false);
      setPatientId('');
      setNotes('');
      setTestIds([]);
      fetchAll();
    } catch {
      toast.error(t('doctor_lab_results:errorCreate'));
    } finally {
      setSaving(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      pending: { bg: theme.palette.warning.light, fg: theme.palette.warning.main, label: t('lab:statusLabels.pending') },
      received: { bg: theme.palette.info.light, fg: theme.palette.info.main, label: t('lab:statusLabels.received') },
      processing: { bg: theme.palette.custom.orange.bg, fg: theme.palette.custom.orange.main, label: t('lab:statusLabels.processing') },
      result_entered: { bg: theme.palette.custom.brand.lightest, fg: theme.palette.custom.brand.main, label: t('lab:statusLabels.result_entered') },
      validated_tech: { bg: theme.palette.custom.status.success.bg, fg: theme.palette.success.main, label: t('lab:statusLabels.validated_tech') },
      validated_doctor: { bg: theme.palette.custom.status.success.bg, fg: theme.palette.success.main, label: t('lab:statusLabels.validated_doctor') },
      signed: { bg: theme.palette.custom.brand.lightest, fg: theme.palette.primary.main, label: t('lab:statusLabels.signed') },
      delivered: { bg: theme.palette.custom.status.success.bg, fg: theme.palette.success.dark, label: t('lab:statusLabels.delivered') },
      cancelled: { bg: theme.palette.grey[100], fg: theme.palette.text.secondary, label: t('lab:statusLabels.cancelled') },
      rejected: { bg: theme.palette.error.light, fg: theme.palette.error.main, label: t('lab:statusLabels.rejected') },
    };
    return map[status] || { bg: theme.palette.grey[100], fg: theme.palette.text.secondary, label: status };
  };

  const tableColumns: DataTableColumn<LabRequest>[] = [
    {
      key: 'test_name',
      header: t('doctor_lab_results:colRequest'),
      render: (r) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {r.items?.[0]?.test_name || r.request_number || `#${r.id}`}
        </Typography>
      ),
    },
    {
      key: 'patient_name',
      header: t('doctor_lab_results:colPatient'),
      render: (r) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          {r.patient_name || r.patient_email || `Paciente #${r.patient_id}`}
        </Typography>
      ),
    },
    {
      key: 'doctor_name',
      header: t('doctor_lab_results:colDoctor'),
      render: (r) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{r.doctor_name || '—'}</Typography>
      ),
    },
    {
      key: 'created_at',
      header: t('doctor_lab_results:colDate'),
      render: (r) => (
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{r.created_at?.split('T')[0] || '—'}</Typography>
      ),
    },
    {
      key: 'status',
      header: t('doctor_lab_results:colStatus'),
      render: (r) => {
        const st = getStatusConfig(r.status);
        return <Chip label={st.label} size="small" sx={{ backgroundColor: st.bg, color: st.fg, fontWeight: 600 }} />;
      },
    },
    {
      key: 'actions',
      header: t('doctor_lab_results:colActions'),
      align: 'right',
      render: (r) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <IconButton size="small" onClick={() => openDetail(r.id)} sx={{ color: theme.palette.text.secondary }} aria-label={t('doctor_lab_results:viewDetail') || 'Ver detalle'}>
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => downloadLabOrderPdf(r.id)} sx={{ color: theme.palette.info.main }} aria-label={t('doctor_lab_results:downloadPdf') || 'Descargar PDF'}>
            <Download fontSize="small" />
          </IconButton>
          <Button
            size="small"
            onClick={() => navigate(`/patient-history?patientId=${r.patient_id}`)}
            sx={{ textTransform: 'none', fontSize: 12, color: theme.palette.primary.main, ml: 0.5 }}
          >
            {t('doctor_lab_results:history')}
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) return <LoadingState message={t('doctor_lab_results:loadingRequests')} />;

  return (
    <Box>
      <PageHeader
        title={t('doctor_lab_results:title')}
        subtitle={t('doctor_lab_results:subtitle')}
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => setNewDialogOpen(true)}>
            {t('doctor_lab_results:newRequest')}
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}

      {requests.length === 0 ? (
        <EmptyState title={t('doctor_lab_results:emptyTitle')} message={t('doctor_lab_results:emptyDesc')} action={{ label: t('doctor_lab_results:newRequest'), onClick: () => setNewDialogOpen(true) }} />
      ) : (
        <DataTable columns={tableColumns} data={requests} keyExtractor={(r) => r.id} />
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailRequest} onClose={() => setDetailRequest(null)} maxWidth="md" fullWidth>
        {detailRequest && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>
              Solicitud #{detailRequest.id} — {detailRequest.patient_name || `Paciente #${detailRequest.patient_id}`}
            </DialogTitle>
            <DialogContent>
              {detailLoading ? (
                <LoadingState message={t('doctor_lab_results:loadingDetail') || 'Cargando...'} />
              ) : (
                <Box>
                  {detailRequest.items?.map((item) => (
                    <Box key={item.id} sx={{ py: 1.5, borderBottom: `1px solid ${theme.palette.grey[100]}` }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.test_name || `Test #${item.lab_test_id}`}</Typography>
                        {item.result_value && <Chip label={item.result_value} size="small" sx={{ backgroundColor: theme.palette.success.light, color: theme.palette.success.main }} />}
                      </Box>
                      {item.reference_range && (
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>Ref: {item.reference_range}</Typography>
                      )}
                      {item.result_notes && (
                        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mt: 0.5 }}>{item.result_notes}</Typography>
                      )}
                    </Box>
                  ))}
                  {detailRequest.notes && (
                    <Box sx={{ mt: 2, p: 1.5, backgroundColor: theme.palette.custom.surface.muted, borderRadius: '8px' }}>
                      <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}>{t('doctor_lab_results:notes')}</Typography>
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{detailRequest.notes}</Typography>
                    </Box>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailRequest(null)}>{t('doctor_lab_results:close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>{t('doctor_lab_results:newRequestTitle')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('doctor_lab_results:patient') + ' *'}</InputLabel>
              <Select value={patientId} label={t('doctor_lab_results:patient') + ' *'} onChange={(e) => setPatientId(e.target.value)}>
                {patients.map((p) => (
                  <MenuItem key={p.patient_id} value={p.patient_id}>
                    {p.patient_name || p.patient_email || `Paciente #${p.patient_id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label={t('doctor_lab_results:notesLabel')}
              multiline
              rows={2}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNotes(e.target.value)}
            />

            <Divider />

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t('doctor_lab_results:exams')}</Typography>
            {testIds.map((tid, idx) => {
              return (
                <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{t('doctor_lab_results:exam')}</InputLabel>
                    <Select
                      value={tid}
                      label={t('doctor_lab_results:exam')}
                      onChange={(e) => {
                        const newIds = [...testIds];
                        newIds[idx] = Number(e.target.value);
                        setTestIds(newIds);
                      }}
                    >
                      {labTests.map((lt) => (
                        <MenuItem key={lt.id} value={lt.id}>{lt.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <IconButton
                    onClick={() => setTestIds(testIds.filter((_, i) => i !== idx))}
                    sx={{ color: theme.palette.error.main }}
                    aria-label={t('doctor_lab_results:removeExam') || 'Quitar examen'}
                  >
                    <Remove />
                  </IconButton>
                </Box>
              );
            })}
            <Button
              startIcon={<Add />}
              onClick={() => setTestIds([...testIds, 0])}
              sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
            >
              {t('doctor_lab_results:addExam')}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialogOpen(false)}>{t('doctor_lab_results:cancel')}</Button>
          <Button variant="contained" onClick={handleCreateRequest} disabled={saving}>
            {saving ? t('doctor_lab_results:creating') : t('doctor_lab_results:createRequest')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
