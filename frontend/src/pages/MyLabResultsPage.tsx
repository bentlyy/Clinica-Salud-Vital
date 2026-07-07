import { useEffect, useState } from 'react';
import { getLabRequests } from '../api/laboratory';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import { getLabIcon, getLabColor } from '../components/lab-icons/LabIcons';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';

const STATUS_BADGE: Record<string, string> = {
  completed: 'badge-success',
  pending: 'badge-warning',
  cancelled: 'badge-ghost',
};

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

  if (loading) return <LoadingState message={t('lab_results.loading')} />;
  if (error) return <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); getLabRequests({ limit: 50 }).then((res) => setRequests(Array.isArray(res) ? res : (res.data || []))).catch(() => setError(t('lab_results.error_loading'))).finally(() => setLoading(false)); }} />;
  if (requests.length === 0) return <EmptyState icon="🔬" title={t('lab_results.empty_title')} message={t('lab_results.empty_desc')} />;

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 24 }}>{t('lab_results.title')}</h1>

      <div className="grid" style={{ gap: 16 }}>
        {requests.map((r) => {
          const Icon = getLabIcon(r.test_name || '');
          const color = getLabColor(r.test_name || '');
          const isCompleted = r.status === 'completed';
          const statusLabel = isCompleted ? t('lab_results.completed') : r.status === 'cancelled' ? t('lab_results.cancelled') : t('lab_results.pending');
          const badgeClass = STATUS_BADGE[r.status] || 'badge-warning';

          return (
            <div
              key={r.id}
              className="card"
              style={{
                padding: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                border: '1px solid var(--border-light)',
                borderLeft: `4px solid ${color}`,
              }}
              onClick={() => navigate(`/my-lab-results/${r.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 20 }}>
                <div style={{
                  flexShrink: 0,
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${color}12`,
                }}>
                  <Icon size={28} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <strong style={{ fontSize: 15, lineHeight: 1.3 }}>
                      {r.test_name || `${t('lab_results.request')} #${r.id}`}
                    </strong>
                    <span className={`badge ${badgeClass}`} style={{ flexShrink: 0, fontSize: 11 }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <span>📅 {r.created_at?.split('T')[0] || '-'}</span>
                    {r.doctor_name && <span>🩺 {r.doctor_name}</span>}
                    {r.items && r.items.length > 0 && <span>🧪 {r.items.length} {t('lab_results.tests')}</span>}
                  </div>
                  {isCompleted && r.items && r.items.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {r.items.slice(0, 3).map((item) => (
                        <span key={item.id} style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: item.result_value ? '#d1fae5' : '#fef3c7',
                          color: item.result_value ? '#065f46' : '#92400e',
                        }}>
                          {item.test_name || item.test_id}
                        </span>
                      ))}
                      {r.items.length > 3 && (
                        <span style={{ fontSize: 11, padding: '2px 8px', color: 'var(--text-muted)' }}>
                          +{r.items.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
