import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/useI18n';
import { useNavigate } from 'react-router-dom';
import {
  getClinicalRecords,
  getClinicalRecordById,
  createClinicalRecord,
  updateClinicalRecord,
  deleteClinicalRecord,
  searchCie10,
  createPrescription,
  deletePrescription,
} from '../api/clinicalRecords';
import { getDoctorBookings } from '../api/doctors';
import { getLabResultsByClinicalRecord, getLabTests } from '../api/laboratory';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';
import Alert from '../components/ui/Alert';

const ROUTES_MAP = {
  oral: 'Oral',
  intravenous: 'Intravenosa',
  intramuscular: 'Intramuscular',
  subcutaneous: 'Subcutánea',
  topical: 'Tópica',
  rectal: 'Rectal',
  sublingual: 'Sublingual',
  inhaled: 'Inhalada',
  ophthalmic: 'Oftálmica',
  otic: 'Ótica',
  nasal: 'Nasal',
};

const initialForm = {
  patient_id: '',
  chief_complaint: '',
  anamnesis: '',
  vital_signs: {
    blood_pressure: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    bmi: '',
  },
  physical_exam: '',
  diagnosis: '',
  cie10_codes: [],
  treatment_plan: '',
  notes: '',
  status: 'draft',
  lab_test_ids: [],
};

export default function DoctorClinicalRecordsPage() {
  const { t } = useI18n();
  const [view, setView] = useState('list');
  const [records, setRecords] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ ...initialForm });
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [cie10Query, setCie10Query] = useState('');
  const [cie10Results, setCie10Results] = useState([]);
  const [cie10Open, setCie10Open] = useState(false);
  const [labResults, setLabResults] = useState([]);
  const [showLab, setShowLab] = useState(false);
  const [labTests, setLabTests] = useState([]);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsRes, bookingsRes] = await Promise.all([
        getClinicalRecords({ limit: 50 }),
        getDoctorBookings(),
      ]);
      setRecords(Array.isArray(recordsRes) ? recordsRes : (recordsRes.data || []));
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data || []));
    } catch (err) {
      setError(t('clinical_records.error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (view === 'form') {
      getLabTests({ active: true, limit: 100 }).then((tests) => {
        setLabTests(Array.isArray(tests) ? tests : (tests.data || []));
      }).catch(() => {});
    }
  }, [view]);

  useEffect(() => {
    if (!cie10Query || cie10Query.length < 2) {
      setCie10Results([]);
      setCie10Open(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchCie10(cie10Query);
        setCie10Results(res.data || res || []);
        setCie10Open(true);
      } catch {
        setCie10Results([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [cie10Query]);

  const handleNewRecord = (booking) => {
    setSelectedRecordId(null);
    setFormData({
      ...initialForm,
      patient_id: booking.user_id || '',
      chief_complaint: '',
    });
    setPrescriptions([]);
    setCie10Query('');
    setCie10Results([]);
    setView('form');
  };

  const handleEditRecord = async (id) => {
    try {
      setError(null);
      const res = await getClinicalRecordById(id);
      const record = res.data || res;
      setSelectedRecordId(record.id);
      setFormData({
        patient_id: record.patient_id,
        chief_complaint: record.chief_complaint || '',
        anamnesis: record.anamnesis || '',
        vital_signs: {
          blood_pressure: record.vital_signs?.blood_pressure || '',
          heart_rate: record.vital_signs?.heart_rate || '',
          temperature: record.vital_signs?.temperature || '',
          respiratory_rate: record.vital_signs?.respiratory_rate || '',
          oxygen_saturation: record.vital_signs?.oxygen_saturation || '',
          weight: record.vital_signs?.weight || '',
          height: record.vital_signs?.height || '',
          bmi: record.vital_signs?.bmi || '',
        },
        physical_exam: record.physical_exam || '',
        diagnosis: record.diagnosis || '',
        cie10_codes: record.cie10_codes || [],
        treatment_plan: record.treatment_plan || '',
        notes: record.notes || '',
        status: record.status || 'draft',
      });
      setPrescriptions(record.prescriptions || []);
      setLabResults([]);
      setShowLab(false);
      getLabResultsByClinicalRecord(id).then((labs) => {
        setLabResults(Array.isArray(labs) ? labs : (labs.data || []));
      }).catch(() => {});
      setView('form');
    } catch (err) {
      setError(t('clinical_records.error_load'));
    }
  };

  const handleCancel = () => {
    setView('list');
    setSelectedRecordId(null);
    setError(null);
  };

  const handleVitalSignChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vital_signs: { ...prev.vital_signs, [field]: value },
    }));
  };

  const addCie10Code = (code, description) => {
    const label = `${code} - ${description}`;
    if (formData.cie10_codes.includes(label)) return;
    setFormData(prev => ({
      ...prev,
      cie10_codes: [...prev.cie10_codes, label],
    }));
    setCie10Query('');
    setCie10Results([]);
    setCie10Open(false);
  };

  const removeCie10Code = (idx) => {
    setFormData(prev => ({
      ...prev,
      cie10_codes: prev.cie10_codes.filter((_, i) => i !== idx),
    }));
  };

  const toggleLabTest = (testId) => {
    setFormData(prev => ({
      ...prev,
      lab_test_ids: prev.lab_test_ids.includes(testId)
        ? prev.lab_test_ids.filter(id => id !== testId)
        : [...prev.lab_test_ids, testId],
    }));
  };

  const addPrescription = () => {
    setPrescriptions(prev => [...prev, {
      _temp: true,
      medication: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      route: 'oral',
    }]);
  };

  const updatePrescriptionField = (idx, field, value) => {
    setPrescriptions(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removePrescription = (idx) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (status) => {
    setSaving(true);
    setError(null);

    const pendingPrescriptions = prescriptions.filter(p => p._temp);
    for (const p of pendingPrescriptions) {
      if (!p.medication.trim() || !p.dosage.trim() || !p.frequency.trim()) {
        setError(t('clinical_records.prescription_error'));
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        patient_id: Number(formData.patient_id),
        chief_complaint: formData.chief_complaint,
        anamnesis: formData.anamnesis || undefined,
        vital_signs: Object.fromEntries(
          Object.entries(formData.vital_signs).filter(([, v]) => v !== '')
        ),
        physical_exam: formData.physical_exam || undefined,
        diagnosis: formData.diagnosis || undefined,
        cie10_codes: formData.cie10_codes.length > 0 ? formData.cie10_codes : undefined,
        treatment_plan: formData.treatment_plan || undefined,
        notes: formData.notes || undefined,
        status: status || formData.status,
      };

      if (Object.keys(payload.vital_signs).length === 0) delete payload.vital_signs;
      if (formData.lab_test_ids.length > 0) payload.lab_test_ids = formData.lab_test_ids;

      let savedRecord;
      if (selectedRecordId) {
        savedRecord = await updateClinicalRecord(selectedRecordId, { ...payload, id: selectedRecordId });
      } else {
        savedRecord = await createClinicalRecord(payload);
      }

      const recordId = savedRecord.data?.id || savedRecord.id;

      const pendingPrescriptions = prescriptions.filter(p => p._temp);
      await Promise.all(pendingPrescriptions.map(p =>
        createPrescription({
          clinical_record_id: recordId,
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration || undefined,
          instructions: p.instructions || undefined,
          route: p.route,
        })
      ));

      await fetchData();
      setView('list');
      setSelectedRecordId(null);
    } catch (err) {
      setError(err.response?.data?.error || t('clinical_records.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta ficha clínica?')) return;
    try {
      await deleteClinicalRecord(id);
      await fetchData();
    } catch (err) {
      setError(t('clinical_records.error_delete'));
    }
  };

  const getPatientName = (record) => {
    return record.patient_email || `${t('clinical_records.patient')} #${record.patient_id}`;
  };

  const getBookingPatientName = (b) => {
    return b.patient_email || b.guest_name || `Paciente #${b.user_id || b.guest_rut}`;
  };

  const bookingsWithoutRecord = bookings.filter(b => {
    return b.user_id && !records.some(r => r.patient_id === b.user_id && r.booking_id === b.id);
  });

  if (view === 'form') {
    return (
      <PageContainer maxWidth="xl">
        <PageHeader
          title={selectedRecordId ? t('clinical_records.edit_record') : t('clinical_records.new_record')}
          subtitle={formData.patient_id ? `${t('clinical_records.patient_id_label')}: ${formData.patient_id}` : t('clinical_records.complete_patient_data')}
          actions={
            <Button variant="ghost" onClick={handleCancel}>← {t('clinical_records.back')}</Button>
          }
        />

        {error && <Alert variant="error">{error}</Alert>}

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>Motivo de Consulta</h3>
          <div className="form-group">
            <label className="form-label">Motivo de consulta *</label>
            <textarea
              className="ds-input"
              rows={2}
              value={formData.chief_complaint}
              onChange={e => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
              placeholder="Ej: Dolor de cabeza persistente, control rutinario..."
            />
          </div>
        </Card>

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>Anamnesis</h3>
          <div className="form-group">
            <label className="form-label">Historia de la enfermedad actual / Antecedentes</label>
            <textarea
              className="ds-input"
              rows={4}
              value={formData.anamnesis}
              onChange={e => setFormData(prev => ({ ...prev, anamnesis: e.target.value }))}
              placeholder="Evolución del síntoma, antecedentes mórbidos, familiares, hábitos..."
            />
          </div>
        </Card>

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>Signos Vitales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('clinical_records.blood_pressure')}</label>
              <input
                className="ds-input"
                value={formData.vital_signs.blood_pressure}
                onChange={e => handleVitalSignChange('blood_pressure', e.target.value)}
                placeholder="Ej: 120/80"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('clinical_records.heart_rate')}</label>
              <input
                className="ds-input"
                type="number"
                value={formData.vital_signs.heart_rate}
                onChange={e => handleVitalSignChange('heart_rate', e.target.value)}
                placeholder="70"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Temperatura (°C)</label>
              <input
                className="ds-input"
                type="number"
                step="0.1"
                value={formData.vital_signs.temperature}
                onChange={e => handleVitalSignChange('temperature', e.target.value)}
                placeholder="36.5"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Frec. respiratoria (rpm)</label>
              <input
                className="ds-input"
                type="number"
                value={formData.vital_signs.respiratory_rate}
                onChange={e => handleVitalSignChange('respiratory_rate', e.target.value)}
                placeholder="16"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sat. O2 (%)</label>
              <input
                className="ds-input"
                type="number"
                value={formData.vital_signs.oxygen_saturation}
                onChange={e => handleVitalSignChange('oxygen_saturation', e.target.value)}
                placeholder="98"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Peso (kg)</label>
              <input
                className="ds-input"
                type="number"
                step="0.1"
                value={formData.vital_signs.weight}
                onChange={e => handleVitalSignChange('weight', e.target.value)}
                placeholder="70"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Talla (cm)</label>
              <input
                className="ds-input"
                type="number"
                value={formData.vital_signs.height}
                onChange={e => handleVitalSignChange('height', e.target.value)}
                placeholder="170"
              />
            </div>
            <div className="form-group">
              <label className="form-label">IMC</label>
              <input
                className="ds-input"
                type="number"
                step="0.1"
                value={formData.vital_signs.bmi}
                onChange={e => handleVitalSignChange('bmi', e.target.value)}
                placeholder="24.2"
              />
            </div>
          </div>
        </Card>

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('clinical_records.physical_exam')}</h3>
          <div className="form-group">
            <label className="form-label">{t('clinical_records.physical_exam_label')}</label>
            <textarea
              className="ds-input"
              rows={4}
              value={formData.physical_exam}
              onChange={e => setFormData(prev => ({ ...prev, physical_exam: e.target.value }))}
              placeholder="Inspección, palpación, auscultación... orientado por sistema"
            />
          </div>
        </Card>

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>Diagnóstico</h3>
          <div className="form-group">
            <label className="form-label">{t('clinical_records.diagnosis_label')}</label>
            <textarea
              className="ds-input"
              rows={3}
              value={formData.diagnosis}
              onChange={e => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder={t('clinical_records.diagnosis_placeholder')}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">{t('clinical_records.cie10_codes')}</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {formData.cie10_codes.map((code, i) => (
                <Badge key={code} variant="info" style={{ cursor: 'pointer' }} onClick={() => removeCie10Code(i)}>
                  {code} ✕
                </Badge>
              ))}
            </div>
            <input
              className="ds-input"
              value={cie10Query}
              onChange={e => setCie10Query(e.target.value)}
              placeholder="Buscar código CIE-10..."
            />
            {cie10Open && cie10Results.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--ds-bg-primary)', border: '1px solid var(--ds-border)',
                borderRadius: 8, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                {cie10Results.slice(0, 10).map((r) => (
                  <div
                    key={r.code || r.codigo}
                    onClick={() => addCie10Code(r.code || r.codigo, r.description || r.descripcion)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--ds-border)', fontSize: 13 }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--ds-bg-secondary)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <strong>{r.code || r.codigo}</strong> — {r.description || r.descripcion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>Plan de Tratamiento</h3>
          <div className="form-group">
            <label className="form-label">Indicaciones y tratamiento</label>
            <textarea
              className="ds-input"
              rows={3}
              value={formData.treatment_plan}
              onChange={e => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
              placeholder="Dieta, ejercicio, medicamentos, derivaciones..."
            />
          </div>
        </Card>

        {labTests.length > 0 && (
          <Card padding="md" style={{ marginBottom: 20 }}>
            <h3>Exámenes de Laboratorio</h3>
            <p style={{ fontSize: 14, color: 'var(--ds-text-secondary)', marginBottom: 12 }}>
              Selecciona los exámenes que deseas solicitar para este paciente. Se creará una orden de laboratorio automáticamente.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {labTests.map((test) => (
                <label
                  key={test.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid var(--ds-border)',
                    background: formData.lab_test_ids.includes(test.id) ? 'var(--ds-primary-50)' : 'transparent',
                    fontSize: 14,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.lab_test_ids.includes(test.id)}
                    onChange={() => toggleLabTest(test.id)}
                  />
                  {test.name}
                  {test.category && <span style={{ fontSize: 11, color: 'var(--ds-text-secondary)' }}>({test.category})</span>}
                </label>
              ))}
            </div>
          </Card>
        )}

        <Card padding="md" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Receta / Prescripciones</h3>
            <Button variant="outline" size="sm" onClick={addPrescription}>+ {t('clinical_records.add_medication')}</Button>
          </div>
          {prescriptions.length === 0 && (
            <p style={{ color: 'var(--ds-text-secondary)', fontSize: 14 }}>{t('clinical_records.no_medications')}</p>
          )}
          {prescriptions.map((p, idx) => (
            <div key={idx} style={{
              padding: 16, marginBottom: 12, borderRadius: 8,
              border: '1px solid var(--ds-border)', background: 'var(--ds-bg-primary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>Medicamento #{idx + 1}</strong>
                <Button variant="ghost" size="sm" onClick={() => removePrescription(idx)} style={{ color: 'var(--ds-danger-500)' }}>Eliminar</Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                <div className="form-group">
                  <label className="form-label">Medicamento *</label>
                  <input className="ds-input" value={p.medication} onChange={e => updatePrescriptionField(idx, 'medication', e.target.value)} placeholder="Ej: Enalapril" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dosis *</label>
                  <input className="ds-input" value={p.dosage} onChange={e => updatePrescriptionField(idx, 'dosage', e.target.value)} placeholder="Ej: 10 mg" />
                </div>
                <div className="form-group">
                  <label className="form-label">Frecuencia *</label>
                  <input className="ds-input" value={p.frequency} onChange={e => updatePrescriptionField(idx, 'frequency', e.target.value)} placeholder="Ej: Cada 12 horas" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('clinical_records.medication_duration')}</label>
                  <input className="ds-input" value={p.duration} onChange={e => updatePrescriptionField(idx, 'duration', e.target.value)} placeholder="Ej: 10 días" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('clinical_records.medication_route')}</label>
                  <select className="ds-input" value={p.route} onChange={e => updatePrescriptionField(idx, 'route', e.target.value)}>
                    {Object.entries(ROUTES_MAP).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">{t('clinical_records.medication_instructions')}</label>
                  <input className="ds-input" value={p.instructions} onChange={e => updatePrescriptionField(idx, 'instructions', e.target.value)} placeholder="Ej: Tomar después de las comidas" />
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>Notas</h3>
          <div className="form-group">
            <label className="form-label">Notas adicionales</label>
            <textarea
              className="ds-input"
              rows={2}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Comentarios, observaciones, próximos pasos..."
            />
          </div>
        </Card>

        {selectedRecordId && labResults.length > 0 && (
          <Card padding="md" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{t('clinical_records.lab_results')}</h3>
              <Button variant="outline" size="sm" onClick={() => setShowLab(!showLab)}>
                {showLab ? t('clinical_records.hide') : t('clinical_records.show')}
              </Button>
            </div>
            {showLab && labResults.map((req) => (
              <div key={req.id} style={{ marginBottom: 12, padding: 12, border: '1px solid var(--ds-border)', borderRadius: 8 }}>
                <strong>{req.test_name || `${t('lab_results.request')} #${req.id}`}</strong>
                <Badge variant={req.status === 'completed' ? 'success' : 'warning'} style={{ marginLeft: 8 }}>{req.status}</Badge>
                {(req.items || []).map((item) => (
                  <div key={item.id} style={{ padding: '4px 0 0 16px', fontSize: 14 }}>
                    <strong>{item.test_name}</strong>: {item.result_value || <span style={{ color: 'var(--ds-text-tertiary)' }}>{t('lab_results.pending')}</span>}
                    {item.reference_range && <span style={{ color: 'var(--ds-text-secondary)', marginLeft: 8 }}>({item.reference_range})</span>}
                  </div>
                ))}
              </div>
            ))}
          </Card>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 0' }}>
          <Button variant="ghost" onClick={handleCancel} disabled={saving}>{t('clinical_records.cancel')}</Button>
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving || !formData.chief_complaint}>
            {saving ? t('clinical_records.saving') : t('clinical_records.save')}
          </Button>
          <Button variant="primary" onClick={() => handleSave('completed')} disabled={saving || !formData.chief_complaint}>
            {saving ? t('clinical_records.saving') : t('clinical_records.save_complete')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader title={t('clinical_records.title')} />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="ds-spinner" style={{ margin: 'auto' }}></div>
          <p style={{ color: 'var(--ds-text-secondary)' }}>Cargando...</p>
        </div>
      ) : (
        <>
          {bookingsWithoutRecord.length > 0 && (
            <Card padding="md" style={{ marginBottom: 20 }}>
              <h3>{t('clinical_records.pending_title')}</h3>
              <p style={{ fontSize: 14, color: 'var(--ds-text-secondary)', marginBottom: 16 }}>
                Estos pacientes tienen citas próximas y aún no tienen ficha clínica registrada.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {bookingsWithoutRecord.slice(0, 10).map((b) => (
                  <Card key={b.id} padding="sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong>{getBookingPatientName(b)}</strong>
                      <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>
                        {b.date} — {b.time} ({b.duration} min)
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/doctor/patient-history?patientId=${b.user_id}`)} style={{ marginRight: 8 }}>
                      {t('clinical_records.view_history')}
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handleNewRecord(b)}>
                      {t('clinical_records.new_record')}
                    </Button>
                  </Card>
                ))}
              </div>
            </Card>
          )}

          <Card padding="md" style={{ marginBottom: 20 }}>
            <h3>{t('clinical_records.registered_title')}</h3>
            {records.length === 0 ? (
              <div className="empty-state">
                <p>{t('clinical_records.no_records')}</p>
              </div>
            ) : (
              <div className="ds-table-wrapper">
                <table className="ds-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>{t('clinical_records.patient')}</th>
                      <th>{t('clinical_records.diagnosis')}</th>
                      <th>{t('clinical_records.date')}</th>
                      <th>Estado</th>
                      <th style={{ textAlign: 'right' }}>{t('clinical_records.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td>{getPatientName(r)}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.diagnosis || <span style={{ color: 'var(--ds-text-tertiary)' }}>{t('clinical_records.no_diagnosis')}</span>}
                        </td>
                        <td>{r.created_at?.split('T')[0] || '-'}</td>
                        <td>
                          <Badge variant={r.status === 'completed' ? 'success' : r.status === 'cancelled' ? 'danger' : 'warning'}>
                            {r.status === 'completed' ? t('clinical_records.status_completed') : r.status === 'cancelled' ? t('clinical_records.status_cancelled') : t('clinical_records.status_draft')}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/doctor/patient-history?patientId=${r.patient_id}`)}>
                              {t('clinical_records.view_history')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEditRecord(r.id)}>
                              {r.status === 'draft' ? t('clinical_records.edit') : t('clinical_records.view')}
                            </Button>
                            {r.status === 'draft' && (
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} style={{ color: 'var(--ds-danger-500)' }}>
                                {t('clinical_records.delete')}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </PageContainer>
  );
}
