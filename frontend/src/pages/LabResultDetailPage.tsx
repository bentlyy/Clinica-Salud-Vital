import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLabRequestById } from '../api/laboratory';
import { useI18n } from '../i18n/useI18n';
import { useAuth } from '../context/useAuth';
import { getLabIcon, getLabColor } from '../components/lab-icons/LabIcons';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

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

  if (loading) return <LoadingState message={t('lab_results.loading')} />;
  if (error) return <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); getLabRequestById(id).then((res) => setRequest(res.data || res)).catch(() => setError(t('lab_results.error_loading'))).finally(() => setLoading(false)); }} />;
  if (!request) return <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}><p>{t('lab_results.not_found')}</p></div>;

  const r = request;
  const items = r.items || [];
  const testNames = items.map(i => i.test_name).filter(Boolean).join(', ');
  const mainTestName = testNames || `${t('lab_results.request')} #${r.id}`;
  const Icon = getLabIcon(mainTestName);
  const color = getLabColor(mainTestName);
  const isCompleted = r.status === 'completed';
  const statusLabel = isCompleted ? t('lab_results.completed') : r.status === 'cancelled' ? t('lab_results.cancelled') : t('lab_results.pending');
  const statusBadgeClass = isCompleted ? 'badge-success' : r.status === 'cancelled' ? 'badge-ghost' : 'badge-warning';
  const completedItems = items.filter(i => i.result_value);
  const progressPct = items.length > 0 ? Math.round((completedItems.length / items.length) * 100) : 0;

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
            <span style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${color}15`,
              flexShrink: 0,
            }}>
              <Icon size={30} color={color} />
            </span>
            {mainTestName}
          </span>
        }
        subtitle={
          <>
            <span>📅 {r.created_at?.split('T')[0] || '-'}</span>
            {r.doctor_name && <span style={{ marginLeft: 12 }}>🩺 {r.doctor_name}</span>}
            {r.patient_name && <span style={{ marginLeft: 12 }}>👤 {r.patient_name}</span>}
          </>
        }
        actions={
          <>
            <span className={`badge ${statusBadgeClass}`} style={{ fontSize: 12 }}>{statusLabel}</span>
            <Button variant="ghost" size="sm" onClick={goBack}>← {t('lab_results.back')}</Button>
          </>
        }
      />

      {items.length > 0 && (
        <div style={{
          background: `${color}08`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          border: `1px solid ${color}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: '#e5e7eb',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progressPct}%`,
                height: '100%',
                borderRadius: 4,
                background: isCompleted ? '#22c55e' : '#f59e0b',
                transition: 'width 0.5s',
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: isCompleted ? '#22c55e' : '#f59e0b', flexShrink: 0 }}>
              {completedItems.length}/{items.length}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ds-text-secondary)', margin: 0 }}>
            {isCompleted ? t('lab_results.all_completed') : t('lab_results.x_of_y_completed').replace('{x}', completedItems.length).replace('{y}', items.length)}
          </p>
        </div>
      )}

      <Card padding="md">
        <h3 style={{ marginBottom: 16 }}>{t('lab_results.results')}</h3>

        {items.length === 0 ? (
          <p style={{ color: 'var(--ds-text-tertiary)' }}>{t('lab_results.no_items')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--ds-bg-primary)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--ds-border)' }}>{t('lab_results.test')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--ds-border)' }}>{t('lab_results.result_value')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--ds-border)' }}>{t('lab_results.reference_range')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid var(--ds-border)' }}>{t('lab_results.result_notes')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const hasResult = !!item.result_value;
                  const resultColor = hasResult && item.reference_range
                    ? '#065f46'
                    : hasResult
                      ? '#065f46'
                      : 'var(--ds-text-tertiary)';
                  const bgColor = idx % 2 === 0 ? 'transparent' : 'var(--ds-bg-primary)';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--ds-border)', background: bgColor }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: hasResult ? '#22c55e' : '#f59e0b',
                            flexShrink: 0,
                          }} />
                          <strong>{item.test_name}</strong>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {hasResult ? (
                          <span style={{
                            fontWeight: 600,
                            color: resultColor,
                          }}>
                            {item.result_value}
                            {item.unit && <span style={{ fontWeight: 400, color: 'var(--ds-text-secondary)', marginLeft: 4 }}>{item.unit}</span>}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ds-text-tertiary)', fontStyle: 'italic' }}>
                            {t('lab_results.pending')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--ds-text-secondary)', fontSize: 13 }}>
                        {item.reference_range || '-'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--ds-text-secondary)', fontSize: 13 }}>
                        {item.result_notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {r.notes && (
          <div style={{ marginTop: 20, padding: 16, background: `${color}08`, borderRadius: 10, border: `1px solid ${color}20` }}>
            <strong style={{ fontSize: 13 }}>{t('lab_results.request_notes')}:</strong>
            <p style={{ fontSize: 14, margin: '6px 0 0', color: 'var(--ds-text-secondary)' }}>{r.notes}</p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
