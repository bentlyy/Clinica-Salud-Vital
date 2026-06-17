import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLabRequestById } from '../api/laboratory';
import { useI18n } from '../i18n/useI18n';
import { useAuth } from '../context/useAuth';

export default function LabResultDetailPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLabRequestById(id)
      .then((res) => setRequest(res.data || res))
      .catch(() => setError(t('lab_results.error_loading')))
      .finally(() => setLoading(false));
  }, [id]);

  const goBack = () => {
    if (user?.role === 'doctor') {
      navigate('/doctor/lab-results');
    } else {
      navigate('/my-lab-results');
    }
  };

  if (loading) return <div className="page-container"><p>{t('lab_results.loading')}</p></div>;
  if (error) return <div className="page-container"><div className="alert alert-error">{error}</div></div>;
  if (!request) return <div className="page-container"><p>{t('lab_results.not_found')}</p></div>;

  const r = request;

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: 4 }}>{r.test_name || `${t('lab_results.request')} #${r.id}`}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {r.created_at?.split('T')[0]} — {r.doctor_name || t('lab_results.doctor_unknown')}
          </p>
        </div>
        <button onClick={goBack} className="btn btn-ghost">← {t('lab_results.back')}</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="analytics-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{t('lab_results.results')}</h3>
          <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
            {r.status === 'completed' ? t('lab_results.completed') : t('lab_results.pending')}
          </span>
        </div>

        {(r.items || []).length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>{t('lab_results.no_items')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)' }}>
                  <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.test')}</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.result_value')}</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.reference_range')}</th>
                  <th style={{ padding: 10, textAlign: 'left' }}>{t('lab_results.result_notes')}</th>
                </tr>
              </thead>
              <tbody>
                {(r.items || []).map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: 10 }}><strong>{item.test_name}</strong></td>
                    <td style={{ padding: 10 }}>
                      {item.result_value || <span style={{ color: 'var(--text-muted)' }}>{t('lab_results.pending')}</span>}
                    </td>
                    <td style={{ padding: 10, color: 'var(--text-secondary)' }}>{item.reference_range || '-'}</td>
                    <td style={{ padding: 10, color: 'var(--text-secondary)' }}>{item.result_notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {r.notes && (
          <div style={{ marginTop: 16 }}>
            <strong>{t('lab_results.request_notes')}:</strong>
            <p style={{ fontSize: 14, margin: '4px 0 0' }}>{r.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
