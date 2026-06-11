import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { confirmBooking } from '../api/bookings';
import { useI18n } from '../i18n/useI18n';

type PageStatus = 'loading' | 'success' | 'error' | 'info';

export default function ConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage(t('confirm.error_desc')); return; }
    confirmBooking(token)
      .then((r: { alreadyConfirmed?: boolean }) => {
        if (r.alreadyConfirmed) { setStatus('info'); setMessage(t('confirm.success_desc')); return; }
        setStatus('success'); setMessage(t('confirm.success_desc'));
      })
      .catch(() => { setStatus('error'); setMessage(t('confirm.error_desc')); });
  }, [token]);

  const icons: Record<PageStatus, string> = { loading: '⏳', success: '✅', error: '❌', info: 'ℹ️' };
  const titles: Record<PageStatus, string> = { loading: t('confirm.confirming'), success: t('confirm.success_title'), error: t('confirm.error_title'), info: t('confirm.title') };
  const colors: Record<PageStatus, string> = { success: 'var(--primary-700)', error: 'var(--danger-600)', info: 'var(--chart-warning)', loading: 'var(--gray-300)' };

  return (
    <div className="page-container" style={{ maxWidth: 500 }}>
      <div className="card" style={{ textAlign: 'center', padding: 48, borderLeft: `4px solid ${colors[status] || 'var(--gray-300)'}` }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{icons[status]}</div>
        <h2 style={{ color: colors[status], marginBottom: 8 }}>{titles[status]}</h2>
        <p style={{ fontSize: 16, marginBottom: 24 }}>{message}</p>
        {status !== 'loading' && (
          <button onClick={() => navigate('/')} className="btn btn-primary">
            {t('confirm.back_home')}
          </button>
        )}
      </div>
    </div>
  );
}
