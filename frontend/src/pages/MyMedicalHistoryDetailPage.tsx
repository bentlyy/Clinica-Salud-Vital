import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClinicalRecordById } from '../api/clinicalRecords';
import { getLabResultsByClinicalRecord } from '../api/laboratory';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

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

  if (loading) return <PageContainer maxWidth="md"><p style={{ color: 'var(--ds-text-tertiary)' }}>{t('medical_history.loading')}</p></PageContainer>;
  if (error) return <PageContainer maxWidth="md"><Alert variant="error">{error}</Alert></PageContainer>;
  if (!record) return <PageContainer maxWidth="md"><p>{t('medical_history.not_found')}</p></PageContainer>;

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={t('medical_history.detail_title')}
        subtitle={`${record.created_at?.split('T')[0]} — ${record.doctor_name || t('medical_history.doctor_unknown')}`}
        actions={
          <Button variant="ghost" onClick={() => navigate('/my-medical-history')}>
            ← {t('medical_history.back')}
          </Button>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card padding="md" style={{ marginBottom: 20 }}>
        <h3>{t('medical_history.chief_complaint')}</h3>
        <p>{record.chief_complaint}</p>
      </Card>

      {record.anamnesis && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('medical_history.anamnesis')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.anamnesis}</p>
        </Card>
      )}

      {record.vital_signs && Object.values(record.vital_signs).some(v => v) && (
        <Card padding="md" style={{ marginBottom: 20 }}>
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
        </Card>
      )}

      {record.physical_exam && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('clinical_records.physical_exam')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.physical_exam}</p>
        </Card>
      )}

      {record.diagnosis && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('clinical_records.diagnosis_label')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.diagnosis}</p>
        </Card>
      )}

      {record.cie10_codes?.length > 0 && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('clinical_records.cie10_codes')}</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {record.cie10_codes.map((c) => (
              <Badge key={c} variant="info">{c}</Badge>
            ))}
          </div>
        </Card>
      )}

      {record.treatment_plan && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('medical_history.treatment_plan')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.treatment_plan}</p>
        </Card>
      )}

      {record.prescriptions?.length > 0 && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('medical_history.prescriptions')}</h3>
          {record.prescriptions.map((p, i) => (
            <div key={p.id || i} style={{ padding: '12px 0', borderBottom: '1px solid var(--ds-border)' }}>
              <strong>{p.medication}</strong> — {p.dosage}, {p.frequency}
              {p.duration && <span>, {p.duration}</span>}
              {p.instructions && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ds-text-secondary)' }}>{p.instructions}</p>}
            </div>
          ))}
        </Card>
      )}

      {labResults.length > 0 && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t('medical_history.lab_results')}</h3>
            <Button variant="outline" size="sm" onClick={() => setShowLab(!showLab)}>
              {showLab ? t('medical_history.hide') : t('medical_history.show')}
            </Button>
          </div>
          {showLab && labResults.map((req) => (
            <div key={req.id} style={{ marginBottom: 16, padding: 12, border: '1px solid var(--ds-border)', borderRadius: 8 }}>
              <strong>{req.test_name || t('lab_results.request')} #{req.id}</strong>
              <Badge variant={req.status === 'completed' ? 'success' : 'warning'} style={{ marginLeft: 8 }}>
                {req.status}
              </Badge>
              {(req.items || []).map((item) => (
                <div key={item.id} style={{ padding: '8px 0 0 16px', fontSize: 14 }}>
                  <strong>{item.test_name}</strong>: {item.result_value || <span style={{ color: 'var(--ds-text-tertiary)' }}>{t('lab_results.pending')}</span>}
                  {item.reference_range && <span style={{ color: 'var(--ds-text-secondary)', marginLeft: 8 }}>({item.reference_range})</span>}
                  {item.result_notes && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ds-text-secondary)' }}>{item.result_notes}</p>}
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}

      {record.notes && (
        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('medical_history.notes')}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</p>
        </Card>
      )}
    </PageContainer>
  );
}
