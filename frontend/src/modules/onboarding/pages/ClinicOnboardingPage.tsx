import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import CloudUpload from '@mui/icons-material/CloudUpload';
import Download from '@mui/icons-material/Download';
import Delete from '@mui/icons-material/Delete';
import { onboardingService, fileToBase64 } from '../services/onboarding.service';
import type {
  OnboardingDocumentCategory,
  OnboardingProfile,
  OnboardingProfileUpdate,
} from '../types/onboarding.types';

const DOC_CATEGORIES: OnboardingDocumentCategory[] = ['contract', 'license', 'tax_id', 'constitution', 'logo', 'other'];

const statusTone = (status: OnboardingProfile['status']) => {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'error' as const;
  return 'warning' as const;
};

export default function ClinicOnboardingPage() {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<OnboardingDocumentCategory>('contract');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { control, handleSubmit, reset } = useForm<OnboardingProfileUpdate>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await onboardingService.getMyOnboarding();
      setProfile(data);
      if (data) {
        reset({
          legal_name: data.legal_name || '',
          tax_id: data.tax_id || '',
          country: data.country || '',
          region: data.region || '',
          city: data.city || '',
          address: data.address || '',
          postal_code: data.postal_code || '',
          phone: data.phone || '',
          website: data.website || '',
          license_number: data.license_number || '',
          legal_entity_type: data.legal_entity_type || '',
          legal_representative_name: data.legal_representative_name || '',
          legal_representative_email: data.legal_representative_email || '',
          specialties: data.specialties || [],
          doctor_count: data.doctor_count ?? undefined,
          operating_hours: data.operating_hours || undefined,
          notes: data.notes || '',
          admin_phone: data.admin_phone || '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const updated = await onboardingService.updateProfile(values);
      setProfile(updated);
      setToast(t('common.saved'));
    } finally {
      setSaving(false);
    }
  });

  const onUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const base = await fileToBase64(uploadFile);
      const doc = await onboardingService.uploadDocument({ ...base, category: uploadCategory });
      setProfile((prev) => (prev ? { ...prev, documents: [...prev.documents, doc] } : prev));
      setUploadFile(null);
      setToast(t('documents.uploaded'));
    } finally {
      setUploading(false);
    }
  };

  const onDownload = async (id: number, name: string) => {
    const blob = await onboardingService.downloadDocument(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDelete = async (id: number) => {
    await onboardingService.deleteDocument(id);
    setProfile((prev) => (prev ? { ...prev, documents: prev.documents.filter((d) => d.id !== id) } : prev));
    setToast(t('documents.deleted'));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Paper sx={{ p: 4, maxWidth: 560, mx: 'auto', mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>{t('missing.title')}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>{t('missing.description')}</Typography>
        <Button variant="contained" onClick={() => navigate('/contratar')}>{t('missing.cta')}</Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 2 }}>{t('clinic.title')}</Typography>
      <Alert severity={statusTone(profile.status)} sx={{ mb: 3 }}>
        <strong>{t(`status.${profile.status}`)}</strong>
        {profile.status === 'rejected' && profile.rejection_reason ? ` — ${profile.rejection_reason}` : ''}
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">{t('clinic.completeness')}</Typography>
          <Typography variant="body2" color="text.secondary">{profile.completeness_pct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={profile.completeness_pct} sx={{ height: 10, borderRadius: 5 }} />
        {profile.missing_fields.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('clinic.missing')}</Typography>
            {profile.missing_fields.map((f) => (
              <Chip key={f} size="small" label={t(`clinic.fields.${f}`, f)} sx={{ mr: 1, mb: 1 }} />
            ))}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>{t('clinic.profileData')}</Typography>
        <Box component="form" onSubmit={onSave}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Controller control={control} name="legal_name" render={({ field }) => <TextField {...field} label={t('profile.legalName')} fullWidth />} />
            <Controller control={control} name="tax_id" render={({ field }) => <TextField {...field} label={t('profile.taxId')} fullWidth />} />
            <Controller control={control} name="country" render={({ field }) => <TextField {...field} label={t('account.country')} fullWidth />} />
            <Controller control={control} name="region" render={({ field }) => <TextField {...field} label={t('profile.region')} fullWidth />} />
            <Controller control={control} name="city" render={({ field }) => <TextField {...field} label={t('profile.city')} fullWidth />} />
            <Controller control={control} name="address" render={({ field }) => <TextField {...field} label={t('profile.address')} fullWidth />} />
            <Controller control={control} name="postal_code" render={({ field }) => <TextField {...field} label={t('profile.postalCode')} fullWidth />} />
            <Controller control={control} name="phone" render={({ field }) => <TextField {...field} label={t('profile.phone')} fullWidth />} />
            <Controller control={control} name="website" render={({ field }) => <TextField {...field} label={t('profile.website')} fullWidth />} />
            <Controller control={control} name="license_number" render={({ field }) => <TextField {...field} label={t('profile.licenseNumber')} fullWidth />} />
            <Controller control={control} name="legal_entity_type" render={({ field }) => <TextField {...field} label={t('profile.legalEntityType')} fullWidth />} />
            <Controller control={control} name="legal_representative_name" render={({ field }) => <TextField {...field} label={t('profile.legalRepName')} fullWidth />} />
            <Controller control={control} name="legal_representative_email" render={({ field }) => <TextField {...field} type="email" label={t('profile.legalRepEmail')} fullWidth />} />
            <Controller control={control} name="admin_phone" render={({ field }) => <TextField {...field} label={t('account.adminPhone')} fullWidth />} />
            <Controller control={control} name="specialties" render={({ field }) => <TextField {...field} label={t('profile.specialties')} fullWidth multiline minRows={2} value={field.value?.join(', ') || ''} onChange={(e) => field.onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />} />
            <Controller control={control} name="doctor_count" render={({ field }) => <TextField {...field} type="number" label={t('profile.doctorCount')} fullWidth onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />} />
            <Controller control={control} name="operating_hours" render={({ field }) => <TextField {...field} label={t('profile.operatingHours')} fullWidth multiline minRows={2} value={typeof field.value === 'string' ? field.value : typeof field.value === 'object' && field.value ? JSON.stringify(field.value) : ''} onChange={(e) => field.onChange(JSON.stringify(e.target.value))} />} />
            <Controller control={control} name="notes" render={({ field }) => <TextField {...field} label={t('profile.notes')} fullWidth multiline minRows={2} />} />
          </Box>
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} color="inherit" /> : t('common.save')}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{t('documents.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 190 }}>
            <InputLabel id="upload-cat">{t('documents.category')}</InputLabel>
            <Select
              labelId="upload-cat"
              label={t('documents.category')}
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value as OnboardingDocumentCategory)}
            >
              {DOC_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>{t(`documents.categories.${c}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <input
            type="file"
            id="onboarding-file-input"
            style={{ display: 'none' }}
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
          <Button variant="outlined" startIcon={<CloudUpload />} component="label" htmlFor="onboarding-file-input" sx={{ textTransform: 'none' }}>
            {uploadFile ? uploadFile.name : t('documents.selectFile')}
          </Button>
          <Button variant="contained" onClick={onUpload} disabled={!uploadFile || uploading}>
            {uploading ? <CircularProgress size={20} color="inherit" /> : t('documents.upload')}
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {profile.documents.length === 0 ? (
          <Typography color="text.secondary">{t('documents.empty')}</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('documents.category')}</TableCell>
                  <TableCell>{t('documents.filename')}</TableCell>
                  <TableCell align="right">{t('documents.size')}</TableCell>
                  <TableCell align="right">{t('documents.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {profile.documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{t(`documents.categories.${d.category}`)}</TableCell>
                    <TableCell>{d.original_name}</TableCell>
                    <TableCell align="right">{formatBytes(d.size_bytes)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" startIcon={<Download />} onClick={() => onDownload(d.id, d.original_name)}>{t('documents.download')}</Button>
                      <Button size="small" color="error" startIcon={<Delete />} onClick={() => onDelete(d.id)}>{t('common.delete')}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} message={toast} />
    </Box>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}