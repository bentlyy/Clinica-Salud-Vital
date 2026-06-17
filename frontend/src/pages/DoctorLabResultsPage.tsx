import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/useI18n';
import {
  getLabRequests,
  getLabRequestById,
  createLabRequest,
  updateLabResultItem,
  getLabTests,
  downloadLabOrderPdf,
} from '../api/laboratory';
import {
  getClinicalRecords,
} from '../api/clinicalRecords';
import { useNavigate } from 'react-router-dom';

export default function DoctorLabResultsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    notes: '',
    items: [{ lab_test_id: '', notes: '' }],
  });
  const [labTests, setLabTests] = useState([]);
  const [records, setRecords] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, testsRes, recRes] = await Promise.all([
        getLabRequests({ limit: 50 }),
        getLabTests({ limit: 200 }),
        getClinicalRecords({ limit: 200 }),
      ]);
      setRequests(Array.isArray(reqRes) ? reqRes : (reqRes.data || []));
      setLabTests(Array.isArray(testsRes) ? testsRes : (testsRes.data || []));
      setRecords(Array.isArray(recRes) ? recRes : (recRes.data || []));
    } catch (err) {
      setError(t('lab_results.error_loading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const viewDetail = async (id) => {
    try {
      const res = await getLabRequestById(id);
      setSelectedRequest(res.data || res);
      setView('detail');
    } catch {
      setError(t('lab_results.error_loading'));
    }
  };

  const handleNewRequest = () => {
    setFormData({ patient_id: '', notes: '', items: [{ lab_test_id: '', notes: '' }] });
    setView('new');
  };

  const addItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { lab_test_id: '', notes: '' }] }));
  };

  const removeItem = (idx) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const handleSave = async () => {
    if (!formData.patient_id || formData.items.some(i => !i.lab_test_id)) {
      setError(t('lab_results.fill_required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createLabRequest({
        patient_id: Number(formData.patient_id),
        notes: formData.notes || undefined,
        items: formData.items.map(i => ({ lab_test_id: Number(i.lab_test_id), notes: i.notes || undefined })),
      });
      await fetchData();
      setView('list');
    } catch (err) {
      setError(err.response?.data?.error || t('lab_results.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddResult = async () => {
    setSaving(true);
    setError(null);
    try {
      const items = selectedRequest.items || [];
      for (const item of items) {
        const input = document.getElementById(`result-${item.id}`);
        const notesInput = document.getElementById(`result-notes-${item.id}`);
        if (input && input.value) {
          await updateLabResultItem(selectedRequest.id, item.id, {
            result_value: input.value,
            result_notes: notesInput?.value || undefined,
          });
        }
      }
      const res = await getLabRequestById(selectedRequest.id);
      setSelectedRequest(res.data || res);
    } catch (err) {
      setError(t('lab_results.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const getPatientName = (r) => r.patient_email || `${t('lab_results.patient')} #${r.patient_id}`;

  if (view === 'detail' && selectedRequest) {
    const r = selectedRequest;
    return (
      <div className="page-container-wide">
        <div className="page-header">
          <div>
            <h1 style={{ marginBottom: 4 }}>{r.test_name || `${t('lab_results.request')} #${r.id}`}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {t('lab_results.patient')}: {getPatientName(r)} — {r.created_at?.split('T')[0]}
            </p>
          </div>
          <button onClick={() => { setView('list'); setSelectedRequest(null); }} className="btn btn-ghost">← {t('lab_results.back')}</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="analytics-card">
          <h3>{t('lab_results.items')}</h3>
          {(r.items || []).map((item) => {
            const test = labTests.find((t) => t.id === item.lab_test_id);
            return (
              <div key={item.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>{test?.name || item.test_name || `${t('lab_results.test')} #${item.lab_test_id}`}</strong>
                  {item.result_value && <span className="badge badge-success">{t('lab_results.completed')}</span>}
                </div>
                {item.reference_range && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {t('lab_results.reference_range')}: {item.reference_range}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group">
                    <label className="form-label">{t('lab_results.result_value')}</label>
                    <input
                      id={`result-${item.id}`}
                      className="form-input"
                      defaultValue={item.result_value || ''}
                      placeholder={t('lab_results.result_placeholder')}
                      disabled={!!item.result_value}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('lab_results.result_notes')}</label>
                    <input
                      id={`result-notes-${item.id}`}
                      className="form-input"
                      defaultValue={item.result_notes || ''}
                      placeholder={t('lab_results.notes_placeholder')}
                      disabled={!!item.result_value}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {r.notes && (
            <div style={{ marginTop: 12 }}>
              <strong>{t('lab_results.request_notes')}:</strong>
              <p style={{ fontSize: 14, margin: '4px 0 0' }}>{r.notes}</p>
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button onClick={handleAddResult} className="btn btn-primary" disabled={saving}>
              {saving ? t('lab_results.saving') : t('lab_results.save_results')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'new') {
    return (
      <div className="page-container-wide">
        <div className="page-header">
          <h1>{t('lab_results.new_request')}</h1>
          <button onClick={() => setView('list')} className="btn btn-ghost">← {t('lab_results.back')}</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="analytics-card">
          <div className="form-group">
            <label className="form-label">{t('lab_results.patient')} *</label>
            <select
              className="form-input"
              value={formData.patient_id}
              onChange={e => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
            >
              <option value="">{t('lab_results.select_patient')}</option>
              {records.map((r) => (
                <option key={r.id} value={r.patient_id}>{getPatientName(r)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('lab_results.request_notes')}</label>
            <textarea
              className="form-input"
              rows={2}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('lab_results.notes_placeholder')}
            />
          </div>

          <h3 style={{ marginBottom: 12 }}>{t('lab_results.tests')}</h3>
          {formData.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
              <div className="form-group" style={{ flex: 1 }}>
                {idx === 0 && <label className="form-label">{t('lab_results.test')} *</label>}
                <select
                  className="form-input"
                  value={item.lab_test_id}
                  onChange={e => updateItem(idx, 'lab_test_id', e.target.value)}
                >
                  <option value="">{t('lab_results.select_test')}</option>
                  {labTests.map((test) => (
                    <option key={test.id} value={test.id}>{test.name} {test.category ? `(${test.category})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                {idx === 0 && <label className="form-label">{t('lab_results.result_notes')}</label>}
                <input
                  className="form-input"
                  value={item.notes}
                  onChange={e => updateItem(idx, 'notes', e.target.value)}
                  placeholder={t('lab_results.notes_placeholder')}
                />
              </div>
              {formData.items.length > 1 && (
                <button onClick={() => removeItem(idx)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger-500)', marginBottom: idx === 0 ? 20 : 0 }}>✕</button>
              )}
            </div>
          ))}
          <button onClick={addItem} className="btn btn-outline btn-sm">+ {t('lab_results.add_test')}</button>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 0' }}>
          <button onClick={() => setView('list')} className="btn btn-ghost">{t('lab_results.cancel')}</button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? t('lab_results.saving') : t('lab_results.create')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <h1>{t('lab_results.manage_title')}</h1>
        <button onClick={handleNewRequest} className="btn btn-primary">{t('lab_results.new_request')}</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>{t('lab_results.loading')}</p>
      ) : (
        <div className="analytics-card">
          {requests.length === 0 ? (
            <div className="empty-state"><p>{t('lab_results.empty_doctor')}</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)' }}>
                    <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.request')}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.patient')}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>Doctor</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.date')}</th>
                    <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.status')}</th>
                    <th style={{ padding: 10, textAlign: 'right' }}>{t('clinical_records.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: 10 }}>{r.test_name || `#${r.id}`}</td>
                      <td style={{ padding: 10 }}>{r.patient_name || getPatientName(r)}</td>
                      <td style={{ padding: 10 }}>{r.doctor_name || '—'}</td>
                      <td style={{ padding: 10 }}>{r.created_at?.split('T')[0] || '-'}</td>
                      <td style={{ padding: 10 }}>
                        <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span>
                      </td>
                      <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => viewDetail(r.id)} className="btn btn-outline btn-sm">{t('lab_results.view')}</button>
                        <button
                          onClick={() => downloadLabOrderPdf(r.id).then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `orden-${r.id}.pdf`; a.click();
                            URL.revokeObjectURL(url);
                          })}
                          className="btn btn-ghost btn-sm"
                          style={{ marginLeft: 4 }}
                        >PDF</button>
                        <button
                          onClick={() => navigate(`/doctor/patient-history?patientId=${r.patient_id}`)}
                          className="btn btn-ghost btn-sm"
                          style={{ marginLeft: 4 }}
                        >{t('lab_results.view_history')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
