import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, getMySubscription, createCheckout } from '../api/saas';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';

export default function SaasPlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [plansData, subData] = await Promise.all([
          getPlans(),
          user ? getMySubscription() : Promise.resolve(null),
        ]);
        setPlans(Array.isArray(plansData.data) ? plansData.data : []);
        setSubscription(subData?.subscription || null);
      } catch {
        // show empty
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSubscribe = async (planCode) => {
    if (!user) {
      navigate('/login?redirect=/saas/plans');
      return;
    }

    setSelectedPlan(planCode);
    setProcessing(true);
    setError('');

    try {
      const checkout = await createCheckout(planCode);
      if (checkout.url) {
        window.location.href = checkout.url;
      } else {
        navigate(`/saas/success?plan=${planCode}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Checkout failed');
      setProcessing(false);
    }
  };

  const featureList = (features) => {
    if (!features || typeof features !== 'object') return [];
    return Object.entries(features)
      .filter(([, v]) => v === true)
      .map(([key]) => {
        const labels = {
          bookings: t('saas.feature_bookings'),
          clinical_records: t('saas.feature_clinical_records'),
          laboratory: t('saas.feature_laboratory'),
          analytics: t('saas.feature_analytics'),
          ml: t('saas.feature_ml'),
          api_access: t('saas.feature_api_access'),
          white_label: t('saas.feature_white_label'),
          custom_domain: t('saas.feature_custom_domain'),
          sms: t('saas.feature_sms'),
          advanced_reports: t('saas.feature_advanced_reports'),
        };
        return labels[key] || key;
      });
  };

  const currentPlanCode = subscription?.plan_code || null;

  if (loading) {
    return <div className="page-container" style={{ textAlign: 'center', padding: 80 }}>{t('saas.plans_title')}...</div>;
  }

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1>{t('saas.plans_title')}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18, marginTop: 8 }}>
          {t('saas.plans_subtitle')}
        </p>
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
        {plans.map((plan) => {
          const isCurrent = currentPlanCode === plan.code;
          return (
            <div key={plan.code} className="card" style={{
              padding: 32, textAlign: 'center', position: 'relative',
              border: isCurrent ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
              transform: isCurrent ? 'scale(1.02)' : 'none',
              transition: 'transform 0.2s',
            }}>
              {isCurrent && (
                <span style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--primary-500)', color: 'white', padding: '4px 16px', borderRadius: 12,
                  fontSize: 12, fontWeight: 600,
                }}>{t('saas.current_plan')}</span>
              )}
              <h2 style={{ marginBottom: 8 }}>{plan.name}</h2>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary-500)', marginBottom: 8 }}>
                {plan.price_monthly === 0 ? t('saas.free') : `$${plan.price_monthly}`}
                {plan.price_monthly > 0 && <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>{t('saas.monthly')}</span>}
              </div>
              {plan.price_yearly > 0 && (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  ${plan.price_yearly}{t('saas.yearly')} {t('saas.year_discount', { pct: Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100) })}
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {plan.max_doctors === -1 ? `${t('saas.unlimited')} ${t('saas.doctors')}` : `${t('saas.up_to')} ${plan.max_doctors} ${t('saas.doctors')}`}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {plan.max_patients === -1 ? `${t('saas.unlimited')} ${t('saas.patients')}` : `${t('saas.up_to')} ${plan.max_patients} ${t('saas.patients')}`}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {plan.storage_gb} GB {t('saas.storage')}
                </div>
              </div>
              <div style={{ textAlign: 'left', marginBottom: 24 }}>
                <strong style={{ fontSize: 14 }}>{t('saas.includes')}</strong>
                {featureList(plan.features).map((f) => (
                  <div key={f} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '2px 0' }}>✓ {f}</div>
                ))}
              </div>
              <button
                className={`btn ${isCurrent ? 'btn--outline' : 'btn--primary'}`}
                style={{ width: '100%' }}
                disabled={processing || isCurrent}
                onClick={() => handleSubscribe(plan.code)}
              >
                {isCurrent ? t('saas.current_plan') : processing && selectedPlan === plan.code ? t('saas.processing') : plan.price_monthly === 0 ? t('saas.start_free') : t('saas.subscribe')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
