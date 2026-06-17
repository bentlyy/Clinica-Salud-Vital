import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getClinicalRecordsByPatient, getClinicalRecordById } from '../api/clinicalRecords';
import { getLabRequests } from '../api/laboratory';
import { useI18n } from '../i18n/useI18n';

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
      <div className="page-container">
        <div className="empty-state">
          <p>{t('doctor_patient_history.no_patient')}</p>
        </div>
      </div>
    );
  }

  if (selectedRecord) {
    const r = selectedRecord;
    return (
      <div className="page-container-wide">
        <div className="page-header">
          <h1>{t('doctor_patient_history.record_detail')}</h1>
          <button onClick={() => setSelectedRecord(null)} className="btn btn-ghost">← {t('doctor_patient_history.back')}</button>
        </div>
        <div className="analytics-card">
          <h3>{t('medical_history.chief_complaint')}</h3>
          <p>{r.chief_complaint}</p>
        </div>
        {r.anamnesis && <div className="analytics-card"><h3>{t('medical_history.anamnesis')}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{r.anamnesis}</p></div>}
        {r.diagnosis && <div className="analytics-card"><h3>{t('clinical_records.diagnosis_label')}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{r.diagnosis}</p></div>}
        {r.treatment_plan && <div className="analytics-card"><h3>{t('medical_history.treatment_plan')}</h3><p style={{ whiteSpace: 'pre-wrap' }}>{r.treatment_plan}</p></div>}
        {r.prescriptions?.length > 0 && (
          <div className="analytics-card">
            <h3>{t('medical_history.prescriptions')}</h3>
            {r.prescriptions.map((p, i) => (
              <div key={p.id || i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <strong>{p.medication}</strong> — {p.dosage}, {p.frequency}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <h1>{t('doctor_patient_history.title')} — {t('doctor_patient_history.patient')} #{patientId}</h1>
        <button onClick={() => navigate('/doctor/clinical-records')} className="btn btn-ghost">← {t('doctor_patient_history.back')}</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p>{t('doctor_patient_history.loading')}</p>}

      {!loading && (
        <>
          <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border-light)' }}>
            <button
              onClick={() => setTab('records')}
              style={{
                padding: '12px 24px', border: 'none', background: tab === 'records' ? 'var(--primary-50)' : 'transparent',
                color: tab === 'records' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer',
                borderBottom: tab === 'records' ? '2px solid var(--primary-500)' : '2px solid transparent', marginBottom: -2,
              }}
            >{t('doctor_patient_history.clinical_records')} ({records.length})</button>
            <button
              onClick={() => setTab('lab')}
              style={{
                padding: '12px 24px', border: 'none', background: tab === 'lab' ? 'var(--primary-50)' : 'transparent',
                color: tab === 'lab' ? 'var(--primary-600)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer',
                borderBottom: tab === 'lab' ? '2px solid var(--primary-500)' : '2px solid transparent', marginBottom: -2,
              }}
            >{t('doctor_patient_history.lab_results')} ({labRequests.length})</button>
          </div>

          {tab === 'records' && (
            <div className="analytics-card">
              {records.length === 0 ? (
                <div className="empty-state"><p>{t('doctor_patient_history.no_records')}</p></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-primary)' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.date')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.diagnosis')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('medical_history.chief_complaint')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('clinical_records.status')}</th>
                        <th style={{ padding: 10, textAlign: 'right' }}>{t('clinical_records.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: 10 }}>{r.created_at?.split('T')[0] || '-'}</td>
                          <td style={{ padding: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.diagnosis || '-'}
                          </td>
                          <td style={{ padding: 10 }}>{r.chief_complaint}</td>
                          <td style={{ padding: 10 }}>
                            <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span>
                          </td>
                          <td style={{ padding: 10, textAlign: 'right' }}>
                            <button onClick={() => viewRecord(r.id)} className="btn btn-outline btn-sm">{t('medical_history.view')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'lab' && (
            <div className="analytics-card">
              {labRequests.length === 0 ? (
                <div className="empty-state"><p>{t('doctor_patient_history.no_lab_results')}</p></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-primary)' }}>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.request')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.date')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.doctor')}</th>
                        <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.status')}</th>
                        <th style={{ padding: 10, textAlign: 'right' }}>{t('clinical_records.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labRequests.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: 10 }}>{r.test_name || `#${r.id}`}</td>
                          <td style={{ padding: 10 }}>{r.created_at?.split('T')[0] || '-'}</td>
                          <td style={{ padding: 10 }}>{r.doctor_name || '-'}</td>
                          <td style={{ padding: 10 }}>
                            <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span>
                          </td>
                          <td style={{ padding: 10, textAlign: 'right' }}>
                            <button onClick={() => navigate(`/doctor/lab-results/${r.id}`)} className="btn btn-outline btn-sm">{t('medical_history.view')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
