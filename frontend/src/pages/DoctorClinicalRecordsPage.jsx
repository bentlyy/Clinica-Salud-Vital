import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/useI18n';
import {
  getClinicalRecords,
  getClinicalRecordById,
  createClinicalRecord,
  updateClinicalRecord,
  deleteClinicalRecord,
  searchCie10,
  getDoctorBookings,
  createPrescription,
  deletePrescription,
} from '../api/clinicalRecords';

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsRes, bookingsRes] = await Promise.all([
        getClinicalRecords({ limit: 50 }),
        getDoctorBookings(),
      ]);
      setRecords(recordsRes.data || []);
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes.data || []));
    } catch (err) {
      setError(t('clinical_records.error_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      setError('Error al eliminar ficha clínica');
    }
  };

  const getPatientName = (record) => {
    return record.patient_email || `Paciente #${record.patient_id}`;
  };

  const getBookingPatientName = (b) => {
    return b.patient_email || b.guest_name || `Paciente #${b.user_id || b.guest_rut}`;
  };

  const bookingsWithoutRecord = bookings.filter(b => {
    return b.user_id && !records.some(r => r.patient_id === b.user_id && r.booking_id === b.id);
  });

  if (view === 'form') {
    return (
      <div className="page-container-wide">
        <div className="page-header">
          <div>
            <h1 style={{ marginBottom: 4 }}>{selectedRecordId ? t('clinical_records.edit_record') : t('clinical_records.new_record')}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {formData.patient_id ? `Paciente ID: ${formData.patient_id}` : 'Complete los datos del paciente'}
            </p>
          </div>
          <button onClick={handleCancel} className="btn btn-ghost">← Volver</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="analytics-card">
          <h3>Motivo de Consulta</h3>
          <div className="form-group">
            <label className="form-label">Motivo de consulta *</label>
            <textarea
              className="form-input"
              rows={2}
              value={formData.chief_complaint}
              onChange={e => setFormData(prev => ({ ...prev, chief_complaint: e.target.value }))}
              placeholder="Ej: Dolor de cabeza persistente, control rutinario..."
            />
          </div>
        </div>

        <div className="analytics-card">
          <h3>Anamnesis</h3>
          <div className="form-group">
            <label className="form-label">Historia de la enfermedad actual / Antecedentes</label>
            <textarea
              className="form-input"
              rows={4}
              value={formData.anamnesis}
              onChange={e => setFormData(prev => ({ ...prev, anamnesis: e.target.value }))}
              placeholder="Evolución del síntoma, antecedentes mórbidos, familiares, hábitos..."
            />
          </div>
        </div>

        <div className="analytics-card">
          <h3>Signos Vitales</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('clinical_records.blood_pressure')}</label>
              <input
                className="form-input"
                value={formData.vital_signs.blood_pressure}
                onChange={e => handleVitalSignChange('blood_pressure', e.target.value)}
                placeholder="Ej: 120/80"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('clinical_records.heart_rate')}</label>
              <input
                className="form-input"
                type="number"
                value={formData.vital_signs.heart_rate}
                onChange={e => handleVitalSignChange('heart_rate', e.target.value)}
                placeholder="70"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Temperatura (°C)</label>
              <input
                className="form-input"
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
                className="form-input"
                type="number"
                value={formData.vital_signs.respiratory_rate}
                onChange={e => handleVitalSignChange('respiratory_rate', e.target.value)}
                placeholder="16"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sat. O2 (%)</label>
              <input
                className="form-input"
                type="number"
                value={formData.vital_signs.oxygen_saturation}
                onChange={e => handleVitalSignChange('oxygen_saturation', e.target.value)}
                placeholder="98"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Peso (kg)</label>
              <input
                className="form-input"
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
                className="form-input"
                type="number"
                value={formData.vital_signs.height}
                onChange={e => handleVitalSignChange('height', e.target.value)}
                placeholder="170"
              />
            </div>
            <div className="form-group">
              <label className="form-label">IMC</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={formData.vital_signs.bmi}
                onChange={e => handleVitalSignChange('bmi', e.target.value)}
                placeholder="24.2"
              />
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <h3>{t('clinical_records.physical_exam')}</h3>
          <div className="form-group">
            <label className="form-label">{t('clinical_records.physical_exam_label')}</label>
            <textarea
              className="form-input"
              rows={4}
              value={formData.physical_exam}
              onChange={e => setFormData(prev => ({ ...prev, physical_exam: e.target.value }))}
              placeholder="Inspección, palpación, auscultación... orientado por sistema"
            />
          </div>
        </div>

        <div className="analytics-card">
          <h3>Diagnóstico</h3>
          <div className="form-group">
            <label className="form-label">{t('clinical_records.diagnosis_label')}</label>
            <textarea
              className="form-input"
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
                <span key={i} className="badge badge-info" style={{ cursor: 'pointer' }} onClick={() => removeCie10Code(i)}>
                  {code} ✕
                </span>
              ))}
            </div>
            <input
              className="form-input"
              value={cie10Query}
              onChange={e => setCie10Query(e.target.value)}
              placeholder="Buscar código CIE-10..."
            />
            {cie10Open && cie10Results.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--bg-primary)', border: '1px solid var(--border-light)',
                borderRadius: 8, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                {cie10Results.slice(0, 10).map((r, i) => (
                  <div
                    key={i}
                    onClick={() => addCie10Code(r.code || r.codigo, r.description || r.descripcion)}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <strong>{r.code || r.codigo}</strong> — {r.description || r.descripcion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Plan de Tratamiento</h3>
          <div className="form-group">
            <label className="form-label">Indicaciones y tratamiento</label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.treatment_plan}
              onChange={e => setFormData(prev => ({ ...prev, treatment_plan: e.target.value }))}
              placeholder="Dieta, ejercicio, medicamentos, derivaciones..."
            />
          </div>
        </div>

        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Receta / Prescripciones</h3>
            <button onClick={addPrescription} className="btn btn-outline btn-sm">+ {t('clinical_records.add_medication')}</button>
          </div>
          {prescriptions.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('clinical_records.no_medications')}</p>
          )}
          {prescriptions.map((p, idx) => (
            <div key={idx} style={{
              padding: 16, marginBottom: 12, borderRadius: 8,
              border: '1px solid var(--border-light)', background: 'var(--bg-primary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>Medicamento #{idx + 1}</strong>
                <button onClick={() => removePrescription(idx)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)' }}>Eliminar</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                <div className="form-group">
                  <label className="form-label">Medicamento *</label>
                  <input className="form-input" value={p.medication} onChange={e => updatePrescriptionField(idx, 'medication', e.target.value)} placeholder="Ej: Enalapril" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dosis *</label>
                  <input className="form-input" value={p.dosage} onChange={e => updatePrescriptionField(idx, 'dosage', e.target.value)} placeholder="Ej: 10 mg" />
                </div>
                <div className="form-group">
                  <label className="form-label">Frecuencia *</label>
                  <input className="form-input" value={p.frequency} onChange={e => updatePrescriptionField(idx, 'frequency', e.target.value)} placeholder="Ej: Cada 12 horas" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('clinical_records.medication_duration')}</label>
                  <input className="form-input" value={p.duration} onChange={e => updatePrescriptionField(idx, 'duration', e.target.value)} placeholder="Ej: 10 días" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('clinical_records.medication_route')}</label>
                  <select className="form-input" value={p.route} onChange={e => updatePrescriptionField(idx, 'route', e.target.value)}>
                    {Object.entries(ROUTES_MAP).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">{t('clinical_records.medication_instructions')}</label>
                  <input className="form-input" value={p.instructions} onChange={e => updatePrescriptionField(idx, 'instructions', e.target.value)} placeholder="Ej: Tomar después de las comidas" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="analytics-card">
          <h3>Notas</h3>
          <div className="form-group">
            <label className="form-label">Notas adicionales</label>
            <textarea
              className="form-input"
              rows={2}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Comentarios, observaciones, próximos pasos..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 0' }}>
          <button onClick={handleCancel} className="btn btn-ghost" disabled={saving}>{t('clinical_records.cancel')}</button>
          <button onClick={() => handleSave('draft')} className="btn btn-outline" disabled={saving || !formData.chief_complaint}>
            {saving ? t('clinical_records.saving') : t('clinical_records.save')}
          </button>
          <button onClick={() => handleSave('completed')} className="btn btn-primary" disabled={saving || !formData.chief_complaint}>
            {saving ? t('clinical_records.saving') : 'Guardar y Completar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <h1>{t('clinical_records.title')}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: 'auto' }}></div>
          <p>Cargando...</p>
        </div>
      ) : (
        <>
          {bookingsWithoutRecord.length > 0 && (
            <div className="analytics-card">
              <h3>{t('clinical_records.pending_title')}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Estos pacientes tienen citas próximas y aún no tienen ficha clínica registrada.
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {bookingsWithoutRecord.slice(0, 10).map((b) => (
                  <div key={b.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong>{getBookingPatientName(b)}</strong>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {b.date} — {b.time} ({b.duration} min)
                      </div>
                    </div>
                    <button onClick={() => handleNewRecord(b)} className="btn btn-primary btn-sm">
                      {t('clinical_records.new_record')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="analytics-card">
            <h3>{t('clinical_records.registered_title')}</h3>
            {records.length === 0 ? (
              <div className="empty-state">
                <p>{t('clinical_records.no_records')}</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)' }}>
                      <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.patient')}</th>
                      <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.diagnosis')}</th>
                      <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.date')}</th>
                      <th style={{ padding: 10, textAlign: 'left' }}>Estado</th>
                      <th style={{ padding: 10, textAlign: 'right' }}>{t('clinical_records.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: 10 }}>{getPatientName(r)}</td>
                        <td style={{ padding: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.diagnosis || <span style={{ color: 'var(--text-muted)' }}>{t('clinical_records.no_diagnosis')}</span>}
                        </td>
                        <td style={{ padding: 10 }}>{r.created_at?.split('T')[0] || '-'}</td>
                        <td style={{ padding: 10 }}>
                          <span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                            {r.status === 'completed' ? 'Completada' : r.status === 'cancelled' ? 'Anulada' : 'Borrador'}
                          </span>
                        </td>
                        <td style={{ padding: 10, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => handleEditRecord(r.id)} className="btn btn-outline btn-sm">
                              {r.status === 'draft' ? t('clinical_records.edit') : t('clinical_records.view')}
                            </button>
                            {r.status === 'draft' && (
                              <button onClick={() => handleDelete(r.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)' }}>
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
