import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClinicalRecordById } from '../api/clinicalRecords';
import { getLabResultsByClinicalRecord } from '../api/laboratory';
import { useI18n } from '../i18n/useI18n';

export default function MyMedicalHistoryDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [labResults, setLabResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLab, setShowLab] = useState(false);

  useEffect(() => {
    Promise.all([
      getClinicalRecordById(id),
      getLabResultsByClinicalRecord(id).catch(() => []),
    ])
      .then(([rec, labs]) => {
        setRecord(rec.data || rec);
        setLabResults(Array.isArray(labs) ? labs : (labs.data || []));
      })
      .catch(() => setError(t('medical_history.error_loading')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container"><p>{t('medical_history.loading')}</p></div>;
  if (error) return <div className="page-container"><div className="alert alert-error">{error}</div></div>;
  if (!record) return <div className="page-container"><p>{t('medical_history.not_found')}</p></div>;

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>{t('medical_history.detail_title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {record.created_at?.split('T')[0]} — {record.doctor_name || t('medical_history.doctor_unknown')}
          </p>
        </div>
        <button onClick={() => navigate('/my-medical-history')} className="btn btn-ghost">← {t('medical_history.back')}</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="analytics-card">
        <h3>{t('medical_history.chief_complaint')}</h3>
        <p>{record.chief_complaint}</p>
      </div>

      {record.anamnesis && (
        <div className="analytics-card">
          <h3>{t('medical_history.anamnesis')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.anamnesis}</p>
        </div>
      )}

      {record.vital_signs && Object.values(record.vital_signs).some(v => v) && (
        <div className="analytics-card">
          <h3>{t('medical_history.vital_signs')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {record.vital_signs.blood_pressure && <div><strong>{t('clinical_records.blood_pressure')}:</strong> {record.vital_signs.blood_pressure}</div>}
            {record.vital_signs.heart_rate && <div><strong>{t('clinical_records.heart_rate')}:</strong> {record.vital_signs.heart_rate}</div>}
            {record.vital_signs.temperature && <div><strong>{t('medical_history.temperature')}:</strong> {record.vital_signs.temperature}°C</div>}
            {record.vital_signs.oxygen_saturation && <div><strong>{t('medical_history.oxygen_sat')}:</strong> {record.vital_signs.oxygen_saturation}%</div>}
            {record.vital_signs.weight && <div><strong>{t('medical_history.weight')}:</strong> {record.vital_signs.weight} kg</div>}
            {record.vital_signs.height && <div><strong>{t('medical_history.height')}:</strong> {record.vital_signs.height} cm</div>}
            {record.vital_signs.bmi && <div><strong>IMC:</strong> {record.vital_signs.bmi}</div>}
          </div>
        </div>
      )}

      {record.physical_exam && (
        <div className="analytics-card">
          <h3>{t('clinical_records.physical_exam')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.physical_exam}</p>
        </div>
      )}

      {record.diagnosis && (
        <div className="analytics-card">
          <h3>{t('clinical_records.diagnosis_label')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.diagnosis}</p>
        </div>
      )}

      {record.cie10_codes?.length > 0 && (
        <div className="analytics-card">
          <h3>{t('clinical_records.cie10_codes')}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {record.cie10_codes.map((c) => (
              <span key={c} className="badge badge-info">{c}</span>
            ))}
          </div>
        </div>
      )}

      {record.treatment_plan && (
        <div className="analytics-card">
          <h3>{t('medical_history.treatment_plan')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.treatment_plan}</p>
        </div>
      )}

      {record.prescriptions?.length > 0 && (
        <div className="analytics-card">
          <h3>{t('medical_history.prescriptions')}</h3>
          {record.prescriptions.map((p, i) => (
            <div key={p.id || i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
              <strong>{p.medication}</strong> — {p.dosage}, {p.frequency}
              {p.duration && <span>, {p.duration}</span>}
              {p.instructions && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{p.instructions}</p>}
            </div>
          ))}
        </div>
      )}

      {labResults.length > 0 && (
        <div className="analytics-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t('medical_history.lab_results')}</h3>
            <button onClick={() => setShowLab(!showLab)} className="btn btn-outline btn-sm">
              {showLab ? t('medical_history.hide') : t('medical_history.show')}
            </button>
          </div>
          {showLab && labResults.map((req) => (
            <div key={req.id} style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border-light)', borderRadius: 8 }}>
              <strong>{req.test_name || t('lab_results.request')} #{req.id}</strong>
              <span className={`badge ${req.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ marginLeft: 8 }}>
                {req.status}
              </span>
              {(req.items || []).map((item) => (
                <div key={item.id} style={{ padding: '8px 0 0 16px', fontSize: 14 }}>
                  <strong>{item.test_name}</strong>: {item.result_value || <span style={{ color: 'var(--text-muted)' }}>{t('lab_results.pending')}</span>}
                  {item.reference_range && <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>({item.reference_range})</span>}
                  {item.result_notes && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{item.result_notes}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {record.notes && (
        <div className="analytics-card">
          <h3>{t('medical_history.notes')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</p>
        </div>
      )}
    </div>
  );
}
