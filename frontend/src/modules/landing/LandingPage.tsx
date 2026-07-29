import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRedirectPath } from '@/shared/utils/role.utils';
import './LandingPage.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const hasCaptcha = Boolean(RECAPTCHA_SITE_KEY);

/* ——— Data arrays use translation keys as values ——— */

const FEATURES = [
  { icon: '📅', titleKey: 'feature1Title', descKey: 'feature1Desc' },
  { icon: '👥', titleKey: 'feature2Title', descKey: 'feature2Desc' },
  { icon: '📋', titleKey: 'feature3Title', descKey: 'feature3Desc' },
  { icon: '🔬', titleKey: 'feature4Title', descKey: 'feature4Desc' },
  { icon: '📊', titleKey: 'feature5Title', descKey: 'feature5Desc' },
  { icon: '🔒', titleKey: 'feature6Title', descKey: 'feature6Desc' },
];

const CLIENTS = [
  { nameKey: 'client1', color: '#dbeafe', emoji: '🏥' },
  { nameKey: 'client2', color: '#fce7f3', emoji: '🏨' },
  { nameKey: 'client3', color: '#d1fae5', emoji: '⚕️' },
  { nameKey: 'client4', color: '#fef3c7', emoji: '🔬' },
  { nameKey: 'client5', color: '#ede9fe', emoji: '👨‍⚕️' },
  { nameKey: 'client6', color: '#fce7f3', emoji: '👩‍⚕️' },
  { nameKey: 'client7', color: '#ccfbf1', emoji: '💚' },
  { nameKey: 'client8', color: '#dbeafe', emoji: '🩺' },
];

const PRICING_PLANS = [
  {
    nameKey: 'plan1Name', descKey: 'plan1Desc', price: '299', popular: false,
    features: [
      { textKey: 'plan1Feature1', included: true },
      { textKey: 'plan1Feature2', included: true },
      { textKey: 'plan1Feature3', included: true },
      { textKey: 'plan1Feature4', included: true },
      { textKey: 'plan1Feature5', included: true },
      { textKey: 'plan1Feature6', included: false },
      { textKey: 'plan1Feature7', included: false },
    ],
  },
  {
    nameKey: 'plan2Name', descKey: 'plan2Desc', price: '599', popular: true,
    features: [
      { textKey: 'plan2Feature1', included: true },
      { textKey: 'plan2Feature2', included: true },
      { textKey: 'plan2Feature3', included: true },
      { textKey: 'plan2Feature4', included: true },
      { textKey: 'plan2Feature5', included: true },
      { textKey: 'plan2Feature6', included: true },
      { textKey: 'plan2Feature7', included: true },
    ],
  },
  {
    nameKey: 'plan3Name', descKey: 'plan3Desc', price: '1,299', popular: false,
    features: [
      { textKey: 'plan3Feature1', included: true },
      { textKey: 'plan3Feature2', included: true },
      { textKey: 'plan3Feature3', included: true },
      { textKey: 'plan3Feature4', included: true },
      { textKey: 'plan3Feature5', included: true },
      { textKey: 'plan3Feature6', included: true },
      { textKey: 'plan3Feature7', included: true },
    ],
  },
];

const STEPS = [
  { num: 1, titleKey: 'step1Title', descKey: 'step1Desc' },
  { num: 2, titleKey: 'step2Title', descKey: 'step2Desc' },
  { num: 3, titleKey: 'step3Title', descKey: 'step3Desc' },
];

const TESTIMONIALS = [
  {
    stars: '⭐⭐⭐⭐⭐',
    textKey: 'testimonial1Text',
    nameKey: 'testimonial1Name', roleKey: 'testimonial1Role',
    initialsKey: 'testimonial1Initials', gradient: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    textKey: 'testimonial2Text',
    nameKey: 'testimonial2Name', roleKey: 'testimonial2Role',
    initialsKey: 'testimonial2Initials', gradient: 'linear-gradient(135deg,#60a5fa,#3b82f6)',
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    textKey: 'testimonial3Text',
    nameKey: 'testimonial3Name', roleKey: 'testimonial3Role',
    initialsKey: 'testimonial3Initials', gradient: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
  },
];

const FAQS = [
  { qKey: 'faq1Q', aKey: 'faq1A' },
  { qKey: 'faq2Q', aKey: 'faq2A' },
  { qKey: 'faq3Q', aKey: 'faq3A' },
  { qKey: 'faq4Q', aKey: 'faq4A' },
  { qKey: 'faq5Q', aKey: 'faq5A' },
];

/* ==========================================================================
   LandingPage
   ========================================================================== */

function LandingPage() {
  const { t } = useTranslation('landing');
  const [loginOpen, setLoginOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  return (
    <div>
      {/* ---------- NAVBAR ---------- */}
      <nav className="lp-nav">
        <a href="/" className="lp-nav-brand">
          <span className="lp-nav-brand-icon">+</span>
          <span className="lp-nav-brand-name">{t('brandName')}</span>
        </a>
        <ul className="lp-nav-links">
          <li><a href="#features">{t('navFeatures')}</a></li>
          <li><a href="#how">{t('navHowItWorks')}</a></li>
          <li><a href="#pricing">{t('navPricing')}</a></li>
          <li><a href="#testimonials">{t('navTestimonials')}</a></li>
          <li><a href="#faq">{t('navFaq')}</a></li>
        </ul>
        <div className="lp-nav-actions">
          <LanguageSwitcher />
          <button className="lp-nav-btn lp-nav-btn-ghost" onClick={openLogin}>{t('navLogin')}</button>
          <button className="lp-nav-btn lp-nav-btn-primary" onClick={openLogin}>{t('navCta')}</button>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-inner">
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              {t('tagline')}
            </div>
            <h1 className="lp-hero-title">
              <Trans
                i18nKey="heroTitle"
                ns="landing"
                components={{ 1: <span /> }}
              />
            </h1>
            <p className="lp-hero-subtitle">
              {t('heroSubtitle')}
            </p>
            <div className="lp-hero-actions">
              <button className="lp-hero-btn lp-hero-btn-primary" onClick={openLogin}>
                {t('heroCtaPrimary')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <a href="#features" className="lp-hero-btn lp-hero-btn-secondary">
                {t('heroCtaSecondary')}
              </a>
            </div>
            <div className="lp-hero-stats">
              <div>
                <div className="lp-hero-stat-value">{t('heroStat1Value')}</div>
                <div className="lp-hero-stat-label">{t('heroStat1Label')}</div>
              </div>
              <div>
                <div className="lp-hero-stat-value">{t('heroStat2Value')}</div>
                <div className="lp-hero-stat-label">{t('heroStat2Label')}</div>
              </div>
              <div>
                <div className="lp-hero-stat-value">{t('heroStat3Value')}</div>
                <div className="lp-hero-stat-label">{t('heroStat3Label')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('featuresLabel')}</div>
          <h2 className="lp-section-title">{t('featuresTitle')}</h2>
          <p className="lp-section-desc">
            {t('featuresDesc')}
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="lp-feature-card">
              <div className="lp-feature-icon">{f.icon}</div>
              <h3 className="lp-feature-title">{t(f.titleKey)}</h3>
              <p className="lp-feature-desc">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CLIENTS ---------- */}
      <section id="clients" className="lp-section lp-section-alt">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('clientsLabel')}</div>
          <h2 className="lp-section-title">{t('clientsTitle')}</h2>
          <p className="lp-section-desc">
            {t('clientsDesc')}
          </p>
        </div>
        <div className="lp-clients-grid">
          {CLIENTS.map((c) => (
            <div key={c.nameKey} className="lp-client-card">
              <div className="lp-client-logo" style={{ background: c.color }}>{c.emoji}</div>
              <div className="lp-client-name">{t(c.nameKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('howLabel')}</div>
          <h2 className="lp-section-title">{t('howTitle')}</h2>
          <p className="lp-section-desc">{t('howDesc')}</p>
        </div>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <div key={s.num} className="lp-step">
              <div className="lp-step-num">{s.num}</div>
              <div className="lp-step-title">{t(s.titleKey)}</div>
              <div className="lp-step-desc">{t(s.descKey)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="lp-section lp-section-alt">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('pricingLabel')}</div>
          <h2 className="lp-section-title">{t('pricingTitle')}</h2>
          <p className="lp-section-desc">{t('pricingDesc')}</p>
        </div>
        <div className="lp-pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <div key={plan.nameKey} className={`lp-pricing-card ${plan.popular ? 'lp-pricing-popular' : ''}`}>
              {plan.popular && <div className="lp-pricing-badge">{t('pricingMostPopular')}</div>}
              <div className="lp-pricing-name">{t(plan.nameKey)}</div>
              <div className="lp-pricing-desc">{t(plan.descKey)}</div>
              <div className="lp-pricing-price">
                <span className="lp-pricing-currency">$</span>
                <span className="lp-pricing-amount">{plan.price}</span>
                <span className="lp-pricing-period">{t('pricingPeriod')}</span>
              </div>
              <ul className="lp-pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j} className={f.included ? '' : 'lp-pricing-feature-disabled'}>
                    <span className={f.included ? 'lp-pricing-check' : 'lp-pricing-x'}>
                      {f.included ? '✓' : '✗'}
                    </span>
                    {t(f.textKey)}
                  </li>
                ))}
              </ul>
              <button
                className={`lp-hero-btn ${plan.popular ? 'lp-hero-btn-primary' : 'lp-hero-btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={openLogin}
              >
                {t('pricingCta')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------- */}
      <section id="testimonials" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('testimonialsLabel')}</div>
          <h2 className="lp-section-title">{t('testimonialsTitle')}</h2>
          <p className="lp-section-desc">{t('testimonialsDesc')}</p>
        </div>
        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map((item, i) => (
            <div key={i} className="lp-testimonial-card">
              <div className="lp-testimonial-stars">{item.stars}</div>
              <div className="lp-testimonial-text">&ldquo;{t(item.textKey)}&rdquo;</div>
              <div className="lp-testimonial-author">
                <div className="lp-testimonial-avatar" style={{ background: item.gradient }}>{t(item.initialsKey)}</div>
                <div>
                  <div className="lp-testimonial-name">{t(item.nameKey)}</div>
                  <div className="lp-testimonial-role">{t(item.roleKey)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="lp-section lp-section-alt">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('faqLabel')}</div>
          <h2 className="lp-section-title">{t('faqTitle')}</h2>
        </div>
        <div className="lp-faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className={`lp-faq-item ${openFaq === i ? 'lp-faq-open' : ''}`}>
              <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {t(faq.qKey)}
                <span className="lp-faq-arrow">▾</span>
              </button>
              <div className="lp-faq-a">
                <p>{t(faq.aKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section id="cta" className="lp-cta-section">
        <h2 className="lp-cta-title">{t('ctaTitle')}</h2>
        <p className="lp-cta-desc">
          {t('ctaDesc')}
        </p>
        <button className="lp-hero-btn lp-hero-btn-primary" onClick={openLogin}>
          {t('ctaButton')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-footer-brand">💚 {t('brandName')}</div>
            <p className="lp-footer-brand-desc">{t('footerDesc')}</p>
          </div>
          <div>
            <div className="lp-footer-col-title">{t('footerProduct')}</div>
            <ul className="lp-footer-links">
              <li><a href="#features">{t('footerProductFeatures')}</a></li>
              <li><a href="#pricing">{t('footerProductPricing')}</a></li>
              <li><a href="#">{t('footerProductApi')}</a></li>
              <li><a href="#">{t('footerProductChangelog')}</a></li>
            </ul>
          </div>
          <div>
            <div className="lp-footer-col-title">{t('footerCompany')}</div>
            <ul className="lp-footer-links">
              <li><a href="#">{t('footerCompanyAbout')}</a></li>
              <li><a href="#">{t('footerCompanyBlog')}</a></li>
              <li><a href="#">{t('footerCompanyCareers')}</a></li>
              <li><a href="#">{t('footerCompanyContact')}</a></li>
            </ul>
          </div>
          <div>
            <div className="lp-footer-col-title">{t('footerLegal')}</div>
            <ul className="lp-footer-links">
              <li><a href="#">{t('footerLegalPrivacy')}</a></li>
              <li><a href="#">{t('footerLegalTerms')}</a></li>
              <li><a href="#">{t('footerLegalHipaa')}</a></li>
              <li><a href="#">{t('footerLegalCookies')}</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} {t('brandName')}. {t('footerCopyright')}</span>
        </div>
      </footer>

      {/* ---------- LOGIN MODAL ---------- */}
      {loginOpen && <LoginModal onClose={closeLogin} />}
    </div>
  );
}

/* ==========================================================================
   Login Modal — Option 7 Teal Aqua
   ========================================================================== */

function LoginModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('landing');
  const { login } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [totp, setTotp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (step === '2fa') {
      if (totp.length < 6) { setError(t('loginError2faCode')); return; }
      const captcha_token = hasCaptcha ? recaptchaRef.current?.getValue() ?? undefined : undefined;
      if (hasCaptcha && !captcha_token) { setError(t('loginErrorCaptcha')); return; }
      setLoading(true);
      setError('');
      try {
        const res = await login(pendingEmail, pendingPassword, totp, captcha_token);
        if (res.requires_2fa) { setError(t('loginError2faIncorrect')); setLoading(false); return; }
        if (rememberMe) localStorage.setItem('rememberedEmail', pendingEmail);
        navigate(getRedirectPath(res.user.role), { replace: true });
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        const msg = axiosErr?.response?.data?.error || t('loginErrorInvalid');
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) { setError(t('loginErrorCredentials')); return; }
    const captcha_token = hasCaptcha ? recaptchaRef.current?.getValue() ?? undefined : undefined;
    if (hasCaptcha && !captcha_token) { setError(t('loginErrorCaptcha')); return; }
    setLoading(true);
    setError('');
    try {
      const res = await login(email, password, undefined, captcha_token);
      if (res.requires_2fa) {
        setPendingEmail(email);
        setPendingPassword(password);
        setStep('2fa');
        setLoading(false);
        return;
      }
      if (rememberMe) localStorage.setItem('rememberedEmail', email);
      navigate(getRedirectPath(res.user.role), { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg = axiosErr?.response?.data?.error || t('loginErrorDefault');
      setError(msg);
      recaptchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, step, totp, pendingEmail, pendingPassword, rememberMe, login, navigate, t]);

  const handleGuest = useCallback(() => {
    navigate('/booking');
  }, [navigate]);

  const handleGuestDashboard = useCallback(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-card" onClick={(e) => e.stopPropagation()}>
        {/* Left visual panel */}
        <div className="lm-visual">
          <div className="lm-visual-icon">🩺</div>
          <h2 className="lm-visual-title">{t('loginVisualTitle')}</h2>
          <p className="lm-visual-sub">
            {t('loginVisualSub')}
          </p>
        </div>

        {/* Right form panel */}
        <div className="lm-form-panel">
          <button className="lm-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <div className="lm-brand">
            <span className="lm-brand-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </span>
            <span className="lm-brand-text">{t('loginBrandText')}</span>
          </div>

          {step === '2fa' ? (
            <>
              <h1 className="lm-title">{t('login2faTitle')}</h1>
              <p className="lm-subtitle">{t('login2faSubtitle')}</p>
              <button className="lm-back" onClick={() => { setStep('login'); setTotp(''); setError(''); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                {t('loginBackToLogin')}
              </button>
            </>
          ) : (
            <>
              <h1 className="lm-title">{t('loginTitle')}</h1>
              <p className="lm-subtitle">{t('loginSubtitle')}</p>
            </>
          )}

          {error && (
            <div className="lm-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <span>{error}</span>
            </div>
          )}

          <form className="lm-form" onSubmit={handleSubmit}>
            {step === '2fa' ? (
              <div className="lm-field lm-field-2fa">
                <input
                  className="lm-input lm-input-2fa"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
                <p className="lm-2fa-hint">{t('login2faHint')}</p>
              </div>
            ) : (
              <>
                <div className="lm-field">
                  <label className="lm-label" htmlFor="lm-email">{t('loginEmailLabel')}</label>
                  <div className="lm-input-wrapper">
                    <svg className="lm-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <input
                      id="lm-email"
                      className="lm-input"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="lm-field">
                  <label className="lm-label" htmlFor="lm-password">{t('loginPasswordLabel')}</label>
                  <div className="lm-input-wrapper">
                    <svg className="lm-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input
                      id="lm-password"
                      className="lm-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('loginPasswordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="lm-toggle-pw"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 'login' && hasCaptcha && (
              <div className="lm-field lm-field-recaptcha">
                <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY!} />
              </div>
            )}

            {step === 'login' && (
              <div className="lm-options">
                <label className="lm-checkbox">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="lm-checkbox-mark" />
                  <span className="lm-checkbox-text">{t('loginRememberMe')}</span>
                </label>
                <a href="/forgot-password" className="lm-forgot">{t('loginForgotPassword')}</a>
              </div>
            )}

            <button className="lm-submit" type="submit" disabled={loading}>
              {loading && <span className="lm-spinner" />}
              {step === '2fa' ? t('loginVerify') : t('loginSubmit')}
            </button>
          </form>

          <div className="lm-divider">
            <span className="lm-divider-line" />
            <span className="lm-divider-text">{t('loginOr')}</span>
            <span className="lm-divider-line" />
          </div>

          <button className="lm-guest" type="button" onClick={handleGuestDashboard}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
            {t('loginGuestDashboard')}
          </button>

          <button className="lm-guest" type="button" onClick={handleGuest} style={{ marginTop: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {t('loginGuestBooking')}
          </button>

          <p className="lm-signup">
            {t('loginNoAccount')} <a onClick={onClose}>{t('loginContactAdmin')}</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
