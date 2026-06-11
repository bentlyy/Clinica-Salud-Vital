import { useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';

export default function SaasSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const tenant = searchParams.get('tenant') || searchParams.get('session_id');
  const plan = searchParams.get('plan');

  useEffect(() => {
    if (tenant && !searchParams.get('session_id')?.startsWith('cs_')) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tenant, navigate, searchParams]);

  return (
    <div className="page-container" style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
      <div className="card" style={{ padding: 48 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', background: 'var(--success)', margin: '0 auto 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 40, color: 'white' }}>✓</span>
        </div>

        <h1 style={{ marginBottom: 8 }}>{t('saas.registration_successful')}</h1>

        {plan && (
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            {t('saas.plan_activated', { plan })}
          </p>
        )}

        {tenant && (
          <div className="card" style={{ background: 'var(--bg-secondary)', padding: 16, marginBottom: 24 }}>
            <strong>{t('saas.clinic_ready')}</strong>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {t('saas.tenant_id_label')} <code>{tenant}</code>
            </p>
          </div>
        )}

        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          {user
            ? t('saas.registration_successful')
            : t('saas.you_will_receive_email')}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {user ? (
            <Link to="/admin/tenant" className="btn btn--primary">{t('saas.go_to_panel')}</Link>
          ) : (
            <Link to="/login" className="btn btn--primary">{t('saas.login_here')}</Link>
          )}
          <Link to="/" className="btn btn--outline">{t('saas.go_home')}</Link>
        </div>
      </div>
    </div>
  );
}
