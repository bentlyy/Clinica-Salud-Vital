import { useEffect, useState } from 'react';
import { getLabRequests } from '../api/laboratory';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

export default function MyLabResultsPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getLabRequests({ limit: 50 })
      .then((res) => setRequests(Array.isArray(res) ? res : (res.data || [])))
      .catch(() => setError(t('lab_results.error_loading')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 24 }}>{t('lab_results.title')}</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <p style={{ color: 'var(--text-muted)' }}>{t('lab_results.loading')}</p>}

      {!loading && requests.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          <h3>{t('lab_results.empty_title')}</h3>
          <p>{t('lab_results.empty_desc')}</p>
        </div>
      )}

      <div className="grid" style={{ gap: 12 }}>
        {requests.map((r) => (
          <div
            key={r.id}
            className="card"
            style={{ padding: 20, cursor: 'pointer' }}
            onClick={() => navigate(`/my-lab-results/${r.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <strong style={{ fontSize: 16 }}>{r.test_name || `${t('lab_results.request')} #${r.id}`}</strong>
              <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                {r.status === 'completed' ? t('lab_results.completed') : t('lab_results.pending')}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              <span>{t('lab_results.date')}: {r.created_at?.split('T')[0] || '-'}</span>
              {r.doctor_name && <span style={{ marginLeft: 16 }}>{t('lab_results.doctor')}: {r.doctor_name}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
