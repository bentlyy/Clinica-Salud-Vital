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

const STATUS_LABEL: Record<string, string> = {
  completed: 'Completado',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
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
  if (error) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔬</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>{t('lab_results.title')}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Laboratorio y Exámenes</p>
          </div>
        </div>
        <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); getLabRequests({ limit: 50 }).then((res) => setRequests(Array.isArray(res) ? res : (res.data || []))).catch(() => setError(t('lab_results.error_loading'))).finally(() => setLoading(false)); }} />
      </div>
    );
  }
  if (requests.length === 0) {
    return (
      <div className="page-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔬</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>{t('lab_results.title')}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Laboratorio y Exámenes</p>
          </div>
        </div>
        <EmptyState icon="🔬" title={t('lab_results.empty_title')} message={t('lab_results.empty_desc')} />
      </div>
    );
  }

  const completed = requests.filter(r => r.status === 'completed');
  const pending = requests.filter(r => r.status === 'pending' || r.status === 'in_progress');
  const totalItems = requests.reduce((s, r) => s + (r.items?.length || 0), 0);
  const completedItems = requests.reduce((s, r) => s + ((r.items || []).filter(i => i.result_value).length), 0);

  return (
    <div className="page-container-wide">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="10" y="6" width="28" height="36" rx="4" />
            <line x1="16" y1="16" x2="32" y2="16" />
            <line x1="16" y1="24" x2="32" y2="24" />
            <line x1="16" y1="32" x2="26" y2="32" />
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t('lab_results.title')}</h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>Laboratorio y Exámenes</p>
        </div>
      </div>

      <div className="grid grid-3" style={{ gap: 14, marginBottom: 32 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total Solicitudes</p>
              <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700 }}>{requests.length}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📋</div>
          </div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Completados</p>
              <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{completed.length}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✅</div>
          </div>
        </div>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pendientes</p>
              <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{pending.length}</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⏳</div>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            Pendientes ({pending.length})
          </h2>
          <div className="grid" style={{ gap: 14 }}>
            {pending.map((r) => {
              const Icon = getLabIcon(r.test_name || '');
              const color = getLabColor(r.test_name || '');
              return (
                <LabCard key={r.id} request={r} icon={<Icon size={26} color={color} />} color={color} statusLabel={STATUS_LABEL[r.status] || 'Pendiente'} badgeClass={STATUS_BADGE[r.status] || 'badge-warning'} onClick={() => navigate(`/my-lab-results/${r.id}`)} t={t} section="pending" />
              );
            })}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Completados ({completed.length})
          </h2>
          <div className="grid" style={{ gap: 14 }}>
            {completed.map((r) => {
              const Icon = getLabIcon(r.test_name || '');
              const color = getLabColor(r.test_name || '');
              return (
                <LabCard key={r.id} request={r} icon={<Icon size={26} color={color} />} color={color} statusLabel={STATUS_LABEL[r.status] || 'Completado'} badgeClass={STATUS_BADGE[r.status] || 'badge-success'} onClick={() => navigate(`/my-lab-results/${r.id}`)} t={t} section="completed" />
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, padding: '14px 18px', background: '#f8fafc', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
        <span>{totalItems} exámenes en total — {completedItems} con resultados</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {completedItems}/{totalItems} completados
        </span>
      </div>
    </div>
  );
}

function LabCard({ request: r, icon, color, statusLabel, badgeClass, onClick, t, section }) {
  const isPending = section === 'pending';
  const items = r.items || [];
  const resultItems = items.filter(i => i.result_value);
  const showItems = items.length > 0;

  return (
    <div
      className="card"
      style={{
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        border: 'none',
        boxShadow: isPending ? '0 1px 3px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.15s',
      }}
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isPending ? '0 1px 3px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ display: 'flex' }}>
        <div style={{
          width: 80,
          minHeight: '100%',
          background: `linear-gradient(180deg, ${color}18, ${color}08)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {icon}
          </div>
        </div>
        <div style={{ flex: 1, padding: '16px 18px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <strong style={{ fontSize: 15, lineHeight: 1.3 }}>{r.test_name || `Solicitud #${r.id}`}</strong>
            <span className={`badge ${badgeClass}`} style={{ flexShrink: 0, fontSize: 11 }}>{statusLabel}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: showItems ? 10 : 0 }}>
            <span>📅 {r.created_at?.split('T')[0] || '-'}</span>
            {r.doctor_name && <span>🩺 {r.doctor_name}</span>}
            {items.length > 0 && <span>🧪 {resultItems.length}/{items.length} resultados</span>}
          </div>
          {showItems && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {items.slice(0, 4).map((item) => (
                <span key={item.id} style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 12,
                  background: item.result_value ? '#d1fae5' : '#fef3c7',
                  color: item.result_value ? '#065f46' : '#92400e',
                  fontWeight: 500,
                }}>
                  {item.test_name || `Test #${item.test_id}`}
                  {item.result_value && <span style={{ marginLeft: 4, fontWeight: 700 }}>{item.result_value}</span>}
                </span>
              ))}
              {items.length > 4 && (
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: '#f1f5f9', color: 'var(--text-muted)' }}>
                  +{items.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
