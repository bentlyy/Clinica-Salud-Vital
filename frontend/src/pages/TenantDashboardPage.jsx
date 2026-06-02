import { useState, useEffect } from 'react';
import { getMySubscription, cancelSubscription, getLimits, getUsageSummary, updateTenant } from '../api/saas';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import { register } from '../api/auth';

export default function TenantDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [subscription, setSubscription] = useState(null);
  const [plan, setPlan] = useState(null);
  const [limits, setLimits] = useState(null);
  const [usage, setUsage] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newPatient, setNewPatient] = useState({ email: '', password: '', name: '' });
  const [patientCreating, setPatientCreating] = useState(false);
  const [patientCreated, setPatientCreated] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configEmail, setConfigEmail] = useState('');
  const [configTimezone, setConfigTimezone] = useState('America/Santiago');

  useEffect(() => {
    if (user) {
      setConfigName(user?.tenant_id === 'default' ? 'Mi Clínica' : user?.tenant_id);
      setConfigEmail(user?.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [subData, limitsData, usageData] = await Promise.all([
          getMySubscription(),
          getLimits(),
          getUsageSummary(),
        ]);
        setSubscription(subData.subscription);
        setPlan(subData.plan);
        setLimits(limitsData);
        setUsage(usageData);
      } catch {
        setError('Error loading dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleCancel = async () => {
    try {
      await cancelSubscription();
      setSubscription((prev) => ({ ...prev, status: 'canceled' }));
      setShowCancel(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Cancelation failed');
    }
  };

  const registrationLink = user?.tenant_id && user.tenant_id !== 'default'
    ? `${window.location.origin}/register?tenant=${user.tenant_id}`
    : null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setPatientCreating(true);
      await register({ email: newPatient.email, password: newPatient.password, name: newPatient.name || undefined });
      setPatientCreated(true);
      setNewPatient({ email: '', password: '', name: '' });
      setTimeout(() => setPatientCreated(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear paciente');
    } finally {
      setPatientCreating(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setError('');
      await updateTenant({ name: configName, locale: configTimezone ? configTimezone.slice(0, 2) : undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save configuration');
    }
  };

  if (loading) return <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>{t('tenant.panel_title')}...</div>;
  if (!user) return <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>{t('auth.login_success')}</div>;

  const planName = plan?.name || 'Sin plan';
  const planStatus = subscription?.status || 'inactive';
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A';

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: 8 }}>{t('tenant.panel_title')}</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
        {t('tenant.welcome', { name: user?.name || user?.email })}
      </p>

      {error && <div className="alert alert--error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('superadmin.subscription')}</h3>
          <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('tenant.plan')}</span>
            <strong>{planName}</strong>
          </div>
          <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('tenant.status')}</span>
            <span className={`badge badge--${planStatus === 'active' ? 'success' : 'warning'}`}>{planStatus}</span>
          </div>
          <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('tenant.period_end')}</span>
            <span>{periodEnd}</span>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn--outline" style={{ flex: 1 }} onClick={() => navigate('/saas/plans')}>
              {t('saas.change_plan')}
            </button>
            {subscription?.status === 'active' && !showCancel && (
              <button className="btn btn--outline" style={{ color: 'var(--danger)' }} onClick={() => setShowCancel(true)}>
                {t('saas.cancel')}
              </button>
            )}
          </div>
          {showCancel && (
            <div className="card" style={{ marginTop: 12, padding: 16, background: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>{t('saas.confirm_cancel')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn--danger" style={{ flex: 1 }} onClick={handleCancel}>{t('saas.confirm')}</button>
                <button className="btn btn--outline" style={{ flex: 1 }} onClick={() => setShowCancel(false)}>{t('saas.go_back')}</button>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('tenant.limits_title')}</h3>
          {limits && (
            <>
              {['doctors', 'patients', 'storage'].map((key) => {
                const limit = limits[key];
                if (!limit) return null;
                const pct = limit.limit > 0 ? Math.min(100, Math.round((limit.current / limit.limit) * 100)) : limit.current > 0 ? 50 : 0;
                const label = key === 'doctors' ? t('saas.doctors') : key === 'patients' ? t('saas.patients') : t('saas.storage');
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                      <span>{label}</span>
                      <span>{limit.current} / {limit.limit < 0 ? '∞' : limit.limit}</span>
                    </div>
                    {limit.limit > 0 && (
                      <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--danger)' : 'var(--primary-500)', borderRadius: 3 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('saas.usage_30d')}</h3>
          {Object.keys(usage).length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('saas.no_usage')}</p>
          ) : (
            Object.entries(usage).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</span>
                <strong>{String(value)}</strong>
              </div>
            ))
          )}
        </div>
      </div>

      {registrationLink && (
        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Enlace de Registro</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Comparte este enlace con tus pacientes para que se registren en tu clínica:
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" className="input" value={registrationLink} readOnly style={{ flex: 1 }} />
            <button className="btn btn--primary" onClick={handleCopyLink}>
              {linkCopied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24, marginTop: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Crear Paciente</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Registra un paciente manualmente en tu clínica:
        </p>
        <form onSubmit={handleCreatePatient}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nombre</label>
              <input type="text" className="input" placeholder="Nombre del paciente" value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Email <span className="required">*</span></label>
              <input type="email" className="input" required placeholder="paciente@email.com" value={newPatient.email}
                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Contraseña temporal <span className="required">*</span></label>
            <input type="text" className="input" required placeholder="Clave temporal" value={newPatient.password}
              onChange={(e) => setNewPatient({ ...newPatient, password: e.target.value })} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Mín. 8 caracteres, mayúscula, minúscula, número y especial</p>
          </div>
          <button type="submit" className="btn btn--primary" disabled={patientCreating}>
            {patientCreating ? 'Creando...' : patientCreated ? '✓ Paciente creado' : 'Crear Paciente'}
          </button>
        </form>
      </div>

        <div className="card" style={{ padding: 24, marginTop: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{t('tenant.config_title')}</h3>
          <div className="form-group">
            <label>{t('saas.clinic_name')}</label>
            <input type="text" className="input" value={configName} onChange={(e) => setConfigName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('saas.contact_email')}</label>
            <input type="email" className="input" value={configEmail} onChange={(e) => setConfigEmail(e.target.value)} disabled />
          </div>
          <div className="form-group">
            <label>{t('saas.timezone')}</label>
            <select className="input" value={configTimezone} onChange={(e) => setConfigTimezone(e.target.value)}>
              <option value="America/Santiago">America/Santiago (UTC-3)</option>
              <option value="America/Buenos_Aires">America/Buenos_Aires (UTC-3)</option>
              <option value="America/Mexico_City">America/Mexico_City (UTC-6)</option>
              <option value="America/Bogota">America/Bogota (UTC-5)</option>
            </select>
          </div>
          <button className="btn btn--primary" onClick={handleSaveConfig}>
            {saved ? t('saas.saved') : t('saas.save_changes')}
          </button>
        </div>
    </div>
  );
}
