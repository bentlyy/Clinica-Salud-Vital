import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import UploadFile from '@mui/icons-material/UploadFile';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import { onboardingService, fileToBase64 } from '../services/onboarding.service';
import type { OnboardingDocumentCategory, OnboardingDraftDocument, OnboardPayload } from '../types/onboarding.types';

interface FileRow {
  category: OnboardingDocumentCategory;
  file: File | null;
  name: string;
}

const defaultForm: OnboardPayload = {
  tenant_name: '',
  domain: '',
  admin_name: '',
  admin_email: '',
  admin_password: '',
  country: '',
  plan_code: 'free',
  legal_name: '',
  tax_id: '',
  region: '',
  city: '',
  address: '',
  postal_code: '',
  phone: '',
  website: '',
  license_number: '',
  legal_entity_type: '',
  legal_representative_name: '',
  legal_representative_email: '',
  specialties: [] as string[],
  doctor_count: undefined,
  operating_hours: undefined,
  notes: '',
  documents: [] as OnboardingDraftDocument[],
} as OnboardPayload;

const steps = ['account', 'profile', 'documents', 'review'];

const DOC_CATEGORIES: OnboardingDocumentCategory[] = ['contract', 'license', 'tax_id', 'constitution', 'logo', 'other'];

export default function OnboardingContractPage() {
  const { t } = useTranslation('onboarding');
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof onboardingService.getPlans>>>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const { control, handleSubmit, watch, setValue, getValues } = useForm({
    defaultValues: defaultForm,
  });

  const watchPlan = watch('plan_code');

  const loadPlans = useCallback(async () => {
    try {
      const data = await onboardingService.getPlans();
      setPlans(data);
      if (data.length > 0) setValue('plan_code', data[0]?.code || 'free');
    } finally {
      setLoading(false);
    }
  }, [setValue]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const validateStep = (): boolean => {
    const f = getValues();
    if (activeStep === 0) {
      if (!f.tenant_name || !f.domain || !f.admin_name || !f.admin_email || !f.admin_password || !f.country) {
        setFieldError(t('account.requiredFields'));
        return false;
      }
      if (!/^[a-z0-9-]+$/.test(f.domain)) {
        setFieldError(t('account.invalidDomain'));
        return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(f.admin_email)) {
        setFieldError(t('account.invalidEmail'));
        return false;
      }
      if (f.admin_password.length < 8) {
        setFieldError(t('account.passwordMin'));
        return false;
      }
    }
    setFieldError(null);
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setActiveStep((s) => Math.max(s - 1, 0));

  const onPickFile = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFiles((prev) => prev.map((row, i) => (i === index ? { ...row, file, name: file?.name || '' } : row)));
  };

  const addFileRow = () => setFiles((prev) => [...prev, { category: 'contract', file: null, name: '' }]);

  const removeFileRow = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setSubmitting(true);
    try {
      const documents: OnboardingDraftDocument[] = [];
      for (const row of files) {
        if (row.file) {
          documents.push({ ...(await fileToBase64(row.file)), category: row.category });
        }
      }
      const payload: OnboardPayload = {
        tenant_name: values.tenant_name,
        domain: values.domain,
        admin_email: values.admin_email,
        admin_password: values.admin_password,
        admin_name: values.admin_name,
        admin_phone: values.admin_phone,
        country: values.country,
        plan_code: values.plan_code,
        locale: 'es',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago',
        ...(values.legal_name && { legal_name: values.legal_name }),
        ...(values.tax_id && { tax_id: values.tax_id }),
        ...(values.region && { region: values.region }),
        ...(values.city && { city: values.city }),
        ...(values.address && { address: values.address }),
        ...(values.postal_code && { postal_code: values.postal_code }),
        ...(values.phone && { phone: values.phone }),
        ...(values.website && { website: values.website }),
        ...(values.license_number && { license_number: values.license_number }),
        ...(values.legal_entity_type && { legal_entity_type: values.legal_entity_type }),
        ...(values.legal_representative_name && { legal_representative_name: values.legal_representative_name }),
        ...(values.legal_representative_email && { legal_representative_email: values.legal_representative_email }),
        ...(values.specialties && values.specialties.length > 0 ? { specialties: values.specialties } : {}),
        ...(values.doctor_count != null ? { doctor_count: Number(values.doctor_count) } : {}),
        ...(values.operating_hours ? { operating_hours: values.operating_hours } : {}),
        ...(values.notes && { notes: values.notes }),
        ...(documents.length > 0 ? { documents } : {}),
      };
      await onboardingService.onboardTenant(payload);
      setDone(true);
    } catch (err) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || t('common.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  });

  const domainFromName = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const onQuestionnaire = getValues();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ px: 2, py: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ fontWeight: 700, fontSize: 18 }}>+ {t('brandName')}</Box>
            <Typography variant="body2" color="text.secondary">{t('pageSubtitle')}</Typography>
          </Box>
          <Button onClick={() => navigate('/')} color="inherit">{t('common.backHome')}</Button>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {done ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleOutline color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1 }}>{t('success.title')}</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>{t('success.description')}</Typography>
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>{t('success.credentials')}</Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" onClick={() => navigate('/#cta')}>Ir al inicio</Button>
            </Box>
          </Paper>
        ) : (
          <>
            <Paper sx={{ p: { xs: 2, md: 4 } }}>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{t(`steps.${label}`)}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {loading ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box component="form" onSubmit={onSubmit}>
                  {activeStep === 0 && (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 3 }}>{t('account.title')}</Typography>
                      {fieldError && <Alert severity="error" sx={{ mb: 2 }}>{fieldError}</Alert>}
                      <Box sx={{ display: 'grid', gap: 2 }}>
                        <Controller
                          control={control}
                          name="tenant_name"
                          render={({ field }) => (
                            <TextField
                              {...field}
                              label={t('account.tenantName')}
                              required
                              fullWidth
                              onChange={(e) => {
                                field.onChange(e);
                                if (!getValues('domain') || getValues('domain') === domainFromName(getValues('tenant_name'))) {
                                  setValue('domain', domainFromName(e.target.value));
                                }
                              }}
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name="domain"
                          render={({ field }) => (
                            <TextField {...field} label={t('account.domain')} required fullWidth helperText={t('account.domainHint')} />
                          )}
                        />
                        <Controller
                          control={control}
                          name="country"
                          render={({ field }) => (
                            <TextField {...field} label={t('account.country')} required fullWidth />
                          )}
                        />
                        <Controller
                          control={control}
                          name="plan_code"
                          render={({ field }) => (
                            <FormControl fullWidth required>
                              <InputLabel>{t('account.plan')}</InputLabel>
                              <Select {...field} label={t('account.plan')}>
                                {plans.map((p) => (
                                  <MenuItem key={p.code} value={p.code}>
                                    {p.name} — {p.description || ''}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        />
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('account.adminTitle')}</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                          <Controller
                            control={control}
                            name="admin_name"
                            render={({ field }) => <TextField {...field} label={t('account.adminName')} required fullWidth />}
                          />
                          <Controller
                            control={control}
                            name="admin_phone"
                            render={({ field }) => <TextField {...field} label={t('account.adminPhone')} fullWidth />}
                          />
                          <Controller
                            control={control}
                            name="admin_email"
                            render={({ field }) => <TextField {...field} type="email" label={t('account.adminEmail')} required fullWidth />}
                          />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                          <Controller
                            control={control}
                            name="admin_password"
                            render={({ field }) => <TextField {...field} type="password" label={t('account.adminPassword')} required fullWidth />}
                          />
                          <TextField
                            type="password"
                            label={t('account.confirmPassword')}
                            required
                            fullWidth
                            error={confirmPassword.length > 0 && confirmPassword !== getValues('admin_password')}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                          />
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {activeStep === 1 && (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>{t('profile.title')}</Typography>
                      <Alert severity="info" sx={{ mb: 3 }}>{t('profile.optionalHint')}</Alert>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <Controller control={control} name="legal_name" render={({ field }) => <TextField {...field} label={t('profile.legalName')} fullWidth />} />
                        <Controller control={control} name="tax_id" render={({ field }) => <TextField {...field} label={t('profile.taxId')} fullWidth />} />
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
                        <Controller control={control} name="specialties" render={({ field }) => <TextField {...field} label={t('profile.specialties')} fullWidth multiline minRows={2} placeholder={t('profile.specialtiesPlaceholder')} value={field.value?.join(', ')} onChange={(e) => field.onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />} />
                        <Controller control={control} name="doctor_count" render={({ field }) => <TextField {...field} type="number" label={t('profile.doctorCount')} fullWidth onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />} />
                        <Controller control={control} name="operating_hours" render={({ field }) => <TextField {...field} label={t('profile.operatingHours')} fullWidth multiline minRows={2} value={typeof field.value === 'string' ? field.value : ''} onChange={(e) => { const v = e.target.value.trim(); field.onChange(v ? { raw: v } : undefined); }} />} />
                        <Controller control={control} name="notes" render={({ field }) => <TextField {...field} label={t('profile.notes')} fullWidth multiline minRows={2} />} />
                      </Box>
                    </Box>
                  )}

                  {activeStep === 2 && (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>{t('documents.title')}</Typography>
                      <Alert severity="info" sx={{ mb: 3 }}>{t('documents.hint')}</Alert>
                      {files.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>{t('documents.empty')}</Box>
                      )}
                      {files.map((row, i) => (
                        <Box key={`${i}-${row.name}`} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                          <FormControl sx={{ minWidth: 180 }}>
                            <InputLabel id={`cat-${i}`}>{t('documents.category')}</InputLabel>
                            <Select
                              labelId={`cat-${i}`}
                              label={t('documents.category')}
                              value={row.category}
                              onChange={(e) => setFiles((prev) => prev.map((r, idx) => (idx === i ? { ...r, category: e.target.value as OnboardingDocumentCategory } : r)))}
                            >
                              {DOC_CATEGORIES.map((c) => (
                                <MenuItem key={c} value={c}>{t(`documents.categories.${c}`)}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <input
                            type="file"
                            ref={(el) => { fileInputs.current[i] = el; }}
                            style={{ display: 'none' }}
                            onChange={onPickFile(i)}
                          />
                          <Button
                            variant="outlined"
                            startIcon={<UploadFile />}
                            onClick={() => fileInputs.current[i]?.click()}
                            sx={{ flexGrow: 1, justifyContent: 'flex-start', textTransform: 'none' }}
                          >
                            {row.file ? row.name : t('documents.selectFile')}
                          </Button>
                          <Button color="error" onClick={() => removeFileRow(i)}>{t('common.remove')}</Button>
                        </Box>
                      ))}
                      {files.length < 6 && (
                        <Button variant="text" onClick={addFileRow}>{t('documents.addFile')}</Button>
                      )}
                    </Box>
                  )}

                  {activeStep === 3 && (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 3 }}>{t('review.title')}</Typography>
                      <LinearProgress variant="determinate" value={computePreviewCompleteness(getValues())} sx={{ mb: 1, height: 10, borderRadius: 5 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {Math.round(computePreviewCompleteness(getValues()))}% {t('review.completeness')}
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                        <ReviewField label={t('account.tenantName')} value={onQuestionnaire.tenant_name} md />
                        <ReviewField label={t('account.domain')} value={onQuestionnaire.domain} md />
                        <ReviewField label={t('account.country')} value={onQuestionnaire.country} md />
                        <ReviewField label={t('account.plan')} value={watchPlan} md />
                        <ReviewField label={t('account.adminName')} value={onQuestionnaire.admin_name} md />
                        <ReviewField label={t('account.adminEmail')} value={onQuestionnaire.admin_email} md />
                        <ReviewField label={t('profile.legalName')} value={onQuestionnaire.legal_name} />
                        <ReviewField label={t('profile.taxId')} value={onQuestionnaire.tax_id} />
                        <ReviewField label={t('profile.city')} value={onQuestionnaire.city} />
                        <ReviewField label={t('profile.phone')} value={onQuestionnaire.phone} />
                      </Box>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('review.attachments')}</Typography>
                        {files.some((f) => f.file) ? (
                          files.filter((f) => f.file).map((f, i) => (
                            <Chip key={`${i}-${f.name}`} label={`${t(`documents.categories.${f.category}`)}: ${f.name}`} sx={{ mb: 1, mr: 1 }} />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">{t('documents.empty')}</Typography>
                        )}
                      </Box>
                    </Box>
                  )}

                  {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button onClick={back} disabled={activeStep === 0}>{t('common.back')}</Button>
                    {activeStep < steps.length - 1 ? (
                      <Button variant="contained" onClick={next}>{t('common.next')}</Button>
                    ) : (
                      <Button type="submit" variant="contained" disabled={submitting}>
                        {submitting ? <CircularProgress size={22} color="inherit" /> : t('common.submit')}
                      </Button>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          </>
        )}
      </Container>
    </Box>
  );
}

export function computePreviewCompleteness(f: Partial<OnboardPayload>): number {
  const fields: unknown[] = [
    f.tenant_name, f.domain, f.admin_email, f.admin_password, f.country,
    f.legal_name, f.tax_id, f.city, f.address, f.phone,
    f.website, f.license_number, f.legal_entity_type, f.legal_representative_name,
    f.specialties, f.doctor_count, f.operating_hours,
  ];
  const filled = fields.filter((v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)).length;
  if (fields.length === 0) return 0;
  return Math.min(100, Math.round((filled / fields.length) * 100));
}

function ReviewField({ label, value, md }: { label: string; value?: unknown; md?: boolean }) {
  const show = value !== undefined && value !== null && value !== '';
  if (!show) return null;
  return (
    <Box sx={{ mb: md ? 0 : 1 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{typeof value === 'string' ? value : JSON.stringify(value)}</Typography>
    </Box>
  );
}