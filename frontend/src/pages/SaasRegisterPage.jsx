import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onboardTenant } from '../api/saas';
import { useI18n } from '../i18n/useI18n';

export default function SaasRegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({
    tenant_name: '',
    domain: '',
    admin_email: '',
    admin_password: '',
    admin_name: '',
    plan_code: 'free',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validateStep1 = () => {
    if (!form.tenant_name || !form.domain) {
      setError('Please fill in all required fields');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(form.domain)) {
      setError('Domain must be lowercase alphanumeric with hyphens');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await onboardTenant(form);
      navigate(`/saas/success?tenant=${result.tenantId}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <div className="card" style={{ padding: '40px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8 }}>{t('saas.create_clinic')}</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 32 }}>
          {t('saas.trial_description')}
        </p>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div className="step-indicator" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step >= 1 ? 'var(--primary-500)' : 'var(--bg-secondary)', color: step >= 1 ? 'white' : 'var(--text-secondary)',
            fontWeight: 600, fontSize: 14,
          }}>1</span>
          <div style={{ width: 40, height: 2, alignSelf: 'center', background: step >= 2 ? 'var(--primary-500)' : 'var(--bg-secondary)' }} />
          <span style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step >= 2 ? 'var(--primary-500)' : 'var(--bg-secondary)', color: step >= 2 ? 'white' : 'var(--text-secondary)',
            fontWeight: 600, fontSize: 14,
          }}>2</span>
          <div style={{ width: 40, height: 2, alignSelf: 'center', background: step >= 3 ? 'var(--primary-500)' : 'var(--bg-secondary)' }} />
          <span style={{
            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: step >= 3 ? 'var(--primary-500)' : 'var(--bg-secondary)', color: step >= 3 ? 'white' : 'var(--text-secondary)',
            fontWeight: 600, fontSize: 14,
          }}>3</span>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <h3 style={{ marginBottom: 16 }}>{t('saas.clinic_info')}</h3>
              <div className="form-group">
                <label>{t('saas.clinic_name')} *</label>
                <input
                  type="text" className="input" placeholder="Mi Clínica"
                  value={form.tenant_name} onChange={(e) => updateField('tenant_name', e.target.value)} required
                />
              </div>
              <div className="form-group">
                <label>{t('saas.subdomain')} *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text" className="input" placeholder="miclinica"
                    value={form.domain} onChange={(e) => updateField('domain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required
                    style={{ flex: 1 }}
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>.{t('saas.subdomain_hint')}</span>
                </div>
              </div>
              <div className="form-group">
                <label>{t('saas.admin_name')}</label>
                <input
                  type="text" className="input" placeholder="Tu nombre"
                  value={form.admin_name} onChange={(e) => updateField('admin_name', e.target.value)}
                />
              </div>
              <button type="button" className="btn btn--primary" style={{ width: '100%', marginTop: 16 }}
                onClick={() => { if (validateStep1()) setStep(2); }}>
                {t('saas.continue')}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h3 style={{ marginBottom: 16 }}>{t('saas.admin_credentials')}</h3>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email" className="input" placeholder="admin@miclinica.com"
                  value={form.admin_email} onChange={(e) => updateField('admin_email', e.target.value)} required
                />
              </div>
              <div className="form-group">
                <label>{t('saas.create_clinic')} *</label>
                <input
                  type="password" className="input" placeholder="Mínimo 8 caracteres"
                  value={form.admin_password} onChange={(e) => updateField('admin_password', e.target.value)} required
                />
                <small style={{ color: 'var(--text-secondary)' }}>{t('saas.password_hint')}</small>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn--outline" style={{ flex: 1 }} onClick={() => setStep(1)}>{t('saas.back')}</button>
                <button type="button" className="btn btn--primary" style={{ flex: 1 }}
                  onClick={() => { if (form.admin_email && form.admin_password) setStep(3); }}>
                  {t('saas.continue')}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 style={{ marginBottom: 16 }}>{t('saas.choose_plan')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {[
                  { code: 'free', name: t('saas.plan_free'), price: t('saas.free'), desc: `${t('saas.up_to')} 1 ${t('saas.doctors')}, 50 ${t('saas.patients')}` },
                  { code: 'basic', name: t('saas.plan_basic'), price: `$29${t('saas.monthly')}`, desc: `${t('saas.up_to')} 3 ${t('saas.doctors')}, 200 ${t('saas.patients')}` },
                  { code: 'pro', name: t('saas.plan_pro'), price: `$79${t('saas.monthly')}`, desc: `${t('saas.up_to')} 10 ${t('saas.doctors')}, ${t('saas.unlimited')} ${t('saas.patients')}` },
                ].map((plan) => (
                  <label key={plan.code} className={`card ${form.plan_code === plan.code ? 'card--active' : ''}`}
                    style={{
                      padding: 16, cursor: 'pointer', border: form.plan_code === plan.code ? '2px solid var(--primary-500)' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                    <input type="radio" name="plan" value={plan.code} checked={form.plan_code === plan.code}
                      onChange={(e) => updateField('plan_code', e.target.value)} />
                    <div style={{ flex: 1 }}>
                      <strong>{plan.name}</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{plan.desc}</div>
                    </div>
                    <strong style={{ color: 'var(--primary-500)' }}>{plan.price}</strong>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn btn--outline" style={{ flex: 1 }} onClick={() => setStep(2)}>{t('saas.back')}</button>
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? t('saas.creating') : t('saas.create_clinic')}
                </button>
              </div>
            </>
          )}
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 14 }}>
          {t('saas.already_account')} <Link to="/login" style={{ color: 'var(--primary-500)' }}>{t('saas.login_here')}</Link>
        </p>
      </div>
    </div>
  );
}
