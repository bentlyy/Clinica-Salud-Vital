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
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

export default function DoctorLabResultsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'new'>('list');
  const [selectedRequest, setSelectedRequest] = useState<Record<string, unknown> | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    notes: '',
    items: [{ lab_test_id: '', notes: '' }],
  });
  const [labTests, setLabTests] = useState<{ id: number; name: string; category?: string }[]>([]);
  const [records, setRecords] = useState<{ id: number; patient_id?: number; patient_name?: string; patient_email?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [resultNotes, setResultNotes] = useState<Record<string, string>>({});

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

  const viewDetail = async (id: number) => {
    try {
      const res = await getLabRequestById(id);
      const req = res.data || res;
      setSelectedRequest(req);
      const values: Record<string, string> = {};
      const notes: Record<string, string> = {};
      (req.items || []).forEach((item: { id: string; result_value?: string; result_notes?: string }) => {
        values[item.id] = item.result_value || '';
        notes[item.id] = item.result_notes || '';
      });
      setResultValues(values);
      setResultNotes(notes);
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
        test_ids: formData.items.map(i => Number(i.lab_test_id)),
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
        const value = resultValues[item.id];
        if (value) {
          await updateLabResultItem(selectedRequest.id, item.id, {
            result_value: value,
            result_notes: resultNotes[item.id] || undefined,
          });
        }
      }
      const res = await getLabRequestById(selectedRequest.id);
      const req = res.data || res;
      setSelectedRequest(req);
      const values: Record<string, string> = {};
      const notes: Record<string, string> = {};
      (req.items || []).forEach((item: { id: string; result_value?: string; result_notes?: string }) => {
        values[item.id] = item.result_value || '';
        notes[item.id] = item.result_notes || '';
      });
      setResultValues(values);
      setResultNotes(notes);
    } catch (err) {
      setError(t('lab_results.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const getRequestTestNames = (r: { id: number; items?: Array<{ test_name?: string }> }) => {
    if (!r.items || r.items.length === 0) return `#${r.id}`;
    return r.items.map(i => i.test_name).filter(Boolean).join(', ');
  };

  const getPatientName = (r: { patient_name?: string; patient_email?: string; patient_id?: number }) => r.patient_name || r.patient_email || `${t('lab_results.patient')} #${r.patient_id}`;

  if (view === 'detail' && selectedRequest) {
    const r = selectedRequest as {
      id: number; items?: Array<{ id: string; lab_test_id?: number; test_name?: string; result_value?: string; result_notes?: string; reference_range?: string }>;
      created_at?: string; notes?: string; patient_name?: string; patient_email?: string; patient_id?: number;
    };
    return (
      <PageContainer maxWidth="xl">
        <PageHeader
          title={getRequestTestNames(r)}
          subtitle={`${t('lab_results.patient')}: ${getPatientName(r)} — ${r.created_at?.split('T')[0]}`}
          actions={<Button variant="ghost" onClick={() => { setView('list'); setSelectedRequest(null); }}>← {t('lab_results.back')}</Button>}
        />

        {error && <Alert variant="error">{error}</Alert>}

        <Card padding="md" style={{ marginBottom: 20 }}>
          <h3>{t('lab_results.items')}</h3>
          {(r.items || []).map((item) => {
            const test = labTests.find((t) => t.id === item.lab_test_id);
            return (
              <div key={item.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--ds-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>{test?.name || item.test_name || `${t('lab_results.test')} #${item.lab_test_id}`}</strong>
          {item.result_value && <Badge variant="success">{t('lab_results.completed')}</Badge>}
                </div>
                {item.reference_range && (
                  <div style={{ fontSize: 13, color: 'var(--ds-text-secondary)', marginBottom: 8 }}>
                    {t('lab_results.reference_range')}: {item.reference_range}
                  </div>)
                }
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group">
                    <label className="form-label">{t('lab_results.result_value')}</label>
                    <input
                      className="ds-input"
                      value={resultValues[item.id] || ''}
                      onChange={e => setResultValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={t('lab_results.result_placeholder')}
                      disabled={!!item.result_value}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('lab_results.result_notes')}</label>
                    <input
                      className="ds-input"
                      value={resultNotes[item.id] || ''}
                      onChange={e => setResultNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
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
            <Button variant="primary" onClick={handleAddResult} disabled={saving}>
              {saving ? t('lab_results.saving') : t('lab_results.save_results')}
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (view === 'new') {
    return (
      <PageContainer maxWidth="xl">
        <PageHeader
          title={t('lab_results.new_request')}
          actions={<Button variant="ghost" onClick={() => setView('list')}>← {t('lab_results.back')}</Button>}
        />

        {error && <Alert variant="error">{error}</Alert>}

        <Card padding="md" style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">{t('lab_results.patient')} *</label>
            <select
              className="ds-input"
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
              className="ds-input"
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
                  className="ds-input"
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
                  className="ds-input"
                  value={item.notes}
                  onChange={e => updateItem(idx, 'notes', e.target.value)}
                  placeholder={t('lab_results.notes_placeholder')}
                />
              </div>
              {formData.items.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} style={{ color: 'var(--ds-danger-500)', marginBottom: idx === 0 ? 20 : 0 }}>✕</Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addItem}>+ {t('lab_results.add_test')}</Button>
        </Card>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '16px 0' }}>
          <Button variant="ghost" onClick={() => setView('list')}>{t('lab_results.cancel')}</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t('lab_results.saving') : t('lab_results.create')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={t('lab_results.manage_title')}
        actions={<Button variant="primary" onClick={handleNewRequest}>{t('lab_results.new_request')}</Button>}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <p>{t('lab_results.loading')}</p>
      ) : (
        <Card padding="md" style={{ marginBottom: 20 }}>
          {requests.length === 0 ? (
            <div className="empty-state"><p>{t('lab_results.empty_doctor')}</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--ds-bg-primary)' }}>
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
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                      <td style={{ padding: 10 }}>{(r.items?.[0]?.test_name) || `#${r.id}`}</td>
                      <td style={{ padding: 10 }}>{r.patient_name || getPatientName(r)}</td>
                      <td style={{ padding: 10 }}>{r.doctor_name || '—'}</td>
                      <td style={{ padding: 10 }}>{r.created_at?.split('T')[0] || '-'}</td>
                      <td style={{ padding: 10 }}>
                        <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{r.status}</Badge>
                      </td>
                      <td style={{ padding: 10, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Button variant="outline" size="sm" onClick={() => viewDetail(r.id)}>{t('lab_results.view')}</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadLabOrderPdf(r.id).then(blob => {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `orden-${r.id}.pdf`; a.click();
                            URL.revokeObjectURL(url);
                          })}
                          style={{ marginLeft: 4 }}
                        >PDF</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/doctor/patient-history?patientId=${r.patient_id}`)}
                          style={{ marginLeft: 4 }}
                        >{t('lab_results.view_history')}</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  );
}
