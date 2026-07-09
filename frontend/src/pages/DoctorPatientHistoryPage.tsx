import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getClinicalRecordsByPatient, getClinicalRecordById } from '../api/clinicalRecords';
import { getLabRequests } from '../api/laboratory';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

export default function DoctorPatientHistoryPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientId = searchParams.get('patientId');

  const [records, setRecords] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('records');
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    Promise.all([
      getClinicalRecordsByPatient(patientId).catch(() => []),
      getLabRequests({ patient_id: patientId, limit: 50 }).catch(() => []),
    ])
      .then(([recs, labs]) => {
        setRecords(Array.isArray(recs) ? recs : (recs.data || []));
        setLabRequests(Array.isArray(labs) ? labs : (labs.data || []));
      })
      .catch(() => setError(t('doctor_patient_history.error_loading')))
      .finally(() => setLoading(false));
  }, [patientId]);

  const viewRecord = async (id) => {
    try {
      const res = await getClinicalRecordById(id);
      setSelectedRecord(res.data || res);
    } catch {
      setError(t('medical_history.error_loading'));
    }
  };

  if (!patientId) {
    return (
      <PageContainer maxWidth="xl">
        <div className="empty-state">
          <p>{t('doctor_patient_history.no_patient')}</p>
        </div>
      </PageContainer>
    );
  }

  if (selectedRecord) {
    const r = selectedRecord;
    return (
      <PageContainer maxWidth="xl">
        <PageHeader
          title={t('doctor_patient_history.record_detail')}
          actions={<Button variant="ghost" onClick={() => setSelectedRecord(null)}>← {t('doctor_patient_history.back')}</Button>}
        />
        <Card padding="md" style={{ marginBottom: 12 }}>
          <h3>{t('medical_history.chief_complaint')}</h3>
          <p>{r.chief_complaint}</p>
        </Card>
        {r.anamnesis && <Card padding="md" style={{ marginBottom: 12 }}><h3>{t('medical_history.anamnesis')}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{r.anamnesis}</p></Card>}
        {r.diagnosis && <Card padding="md" style={{ marginBottom: 12 }}><h3>{t('clinical_records.diagnosis_label')}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{r.diagnosis}</p></Card>}
        {r.treatment_plan && <Card padding="md" style={{ marginBottom: 12 }}><h3>{t('medical_history.treatment_plan')}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{r.treatment_plan}</p></Card>}
        {r.prescriptions?.length > 0 && (
          <Card padding="md" style={{ marginBottom: 12 }}>
            <h3>{t('medical_history.prescriptions')}</h3>
            {r.prescriptions.map((p, i) => (
              <div key={p.id || i} style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>
                <strong>{p.medication}</strong> — {p.dosage}, {p.frequency}
              </div>
            ))}
          </Card>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={`${t('doctor_patient_history.title')} — ${t('doctor_patient_history.patient')} #${patientId}`}
        actions={<Button variant="ghost" onClick={() => navigate('/doctor/clinical-records')}>← {t('doctor_patient_history.back')}</Button>}
      />

      {error && <Alert variant="error">{error}</Alert>}
      {loading && <p>{t('doctor_patient_history.loading')}</p>}

      {!loading && (
        <>
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--ds-border)' }}>
            <Button
              variant="ghost"
              onClick={() => setTab('records')}
              style={{
                padding: '12px 24px', border: 'none', borderRadius: 0, background: tab === 'records' ? 'var(--ds-primary-50)' : 'transparent',
                color: tab === 'records' ? 'var(--ds-primary-600)' : 'var(--ds-text-secondary)', fontWeight: 600,
                borderBottom: tab === 'records' ? '2px solid var(--ds-primary-500)' : '2px solid transparent', marginBottom: -2,
              }}
            >{t('doctor_patient_history.clinical_records')} ({records.length})</Button>
            <Button
              variant="ghost"
              onClick={() => setTab('lab')}
              style={{
                padding: '12px 24px', border: 'none', borderRadius: 0, background: tab === 'lab' ? 'var(--ds-primary-50)' : 'transparent',
                color: tab === 'lab' ? 'var(--ds-primary-600)' : 'var(--ds-text-secondary)', fontWeight: 600,
                borderBottom: tab === 'lab' ? '2px solid var(--ds-primary-500)' : '2px solid transparent', marginBottom: -2,
              }}
            >{t('doctor_patient_history.lab_results')} ({labRequests.length})</Button>
          </div>

          {tab === 'records' && (
            <Card padding="md">
              {records.length === 0 ? (
                <div className="empty-state"><p>{t('doctor_patient_history.no_records')}</p></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--ds-bg-primary)' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.date')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.diagnosis')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('medical_history.chief_complaint')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.status')}</th>
                        <th style={{ padding: 10, textAlign: 'right' }}>{t('clinical_records.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                          <td style={{ padding: 10 }}>{r.created_at?.split('T')[0] || '-'}</td>
                          <td style={{ padding: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.diagnosis || '-'}
                          </td>
                          <td style={{ padding: 10 }}>{r.chief_complaint}</td>
                          <td style={{ padding: 10 }}>
                            <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{r.status}</Badge>
                          </td>
                          <td style={{ padding: 10, textAlign: 'right' }}>
                            <Button variant="outline" size="sm" onClick={() => viewRecord(r.id)}>{t('medical_history.view')}</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {tab === 'lab' && (
            <Card padding="md">
              {labRequests.length === 0 ? (
                <div className="empty-state"><p>{t('doctor_patient_history.no_lab_results')}</p></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--ds-bg-primary)' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.request')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.date')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.doctor')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.status')}</th>
                        <th style={{ padding: 10, textAlign: 'right' }}>{t('clinical_records.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labRequests.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                          <td style={{ padding: 10 }}>{r.test_name || `#${r.id}`}</td>
                          <td style={{ padding: 10 }}>{r.created_at?.split('T')[0] || '-'}</td>
                          <td style={{ padding: 10 }}>{r.doctor_name || '-'}</td>
                          <td style={{ padding: 10 }}>
                            <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{r.status}</Badge>
                          </td>
                          <td style={{ padding: 10, textAlign: 'right' }}>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/doctor/lab-results/${r.id}`)}>{t('medical_history.view')}</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
}
