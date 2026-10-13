import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRedirectPath } from '@/shared/utils/role.utils';
import { useSelectedCountry, useExchangeRates } from '@/shared/hooks/usePricing';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import {
  SUPPORTED_COUNTRIES,
  getCountryByCode,
  convertUsd,
  formatPricingAmount,
  getCurrencySymbol,
} from '@/shared/utils/pricing';
import './LandingPage.css';

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
    nameKey: 'plan1Name', descKey: 'plan1Desc', usdPrice: 29, popular: false,
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
    nameKey: 'plan2Name', descKey: 'plan2Desc', usdPrice: 79, popular: true,
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
    nameKey: 'plan3Name', descKey: 'plan3Desc', usdPrice: 199, popular: false,
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

const TECH_STACK = [
  {
    icon: '🧑‍💻', titleKey: 'techCatBackend',
    items: [
      { name: 'TypeScript', version: '5.8' },
      { name: 'Node.js', version: '20.x' },
      { name: 'Express', version: '4.21' },
      { name: 'PostgreSQL', version: '15' },
      { name: 'pg', version: '8.18' },
    ],
  },
  {
    icon: '🎨', titleKey: 'techCatFrontend',
    items: [
      { name: 'React', version: '19' },
      { name: 'Vite', version: '6.0' },
      { name: 'MUI', version: '6.4' },
      { name: 'React Router', version: '7.1' },
      { name: 'Framer Motion', version: '11.15' },
    ],
  },
  {
    icon: '🔐', titleKey: 'techCatSecurity',
    items: [
      { name: 'JWT (HS256)' },
      { name: 'bcrypt', version: '6.0' },
      { name: 'Helmet', version: '8.1' },
      { name: 'Rate Limiting' },
      { name: 'reCAPTCHA' },
      { name: 'AES-256-GCM' },
    ],
  },
  {
    icon: '🧪', titleKey: 'techCatTesting',
    items: [
      { name: 'Vitest', version: '4.1' },
      { name: 'Testing Library' },
      { name: 'Supertest', version: '7.2' },
      { name: 'Coverage V8' },
    ],
  },
  {
    icon: '📧', titleKey: 'techCatComms',
    items: [
      { name: 'SendGrid' },
      { name: 'Nodemailer', version: '8.0' },
      { name: 'Twilio' },
      { name: 'node-cron', version: '4.2' },
    ],
  },
  {
    icon: '🐳', titleKey: 'techCatDevops',
    items: [
      { name: 'Docker' },
      { name: 'Docker Compose' },
      { name: 'GitHub Actions' },
      { name: 'Render' },
      { name: 'Sentry', version: '10.56' },
      { name: 'Winston', version: '3.19' },
    ],
  },
];

const PROBLEMS = [
  { icon: '📞', titleKey: 'problema1Title', painKey: 'problema1Pain', solKey: 'problema1Sol' },
  { icon: '📁', titleKey: 'problema2Title', painKey: 'problema2Pain', solKey: 'problema2Sol' },
  { icon: '🔬', titleKey: 'problema3Title', painKey: 'problema3Pain', solKey: 'problema3Sol' },
  { icon: '📊', titleKey: 'problema4Title', painKey: 'problema4Pain', solKey: 'problema4Sol' },
];

const AUDIENCES = [
  { icon: '🩺', titleKey: 'audiencia1Title', descKey: 'audiencia1Desc', tagKey: 'audiencia1Tag' },
  { icon: '🏥', titleKey: 'audiencia2Title', descKey: 'audiencia2Desc', tagKey: 'audiencia2Tag' },
  { icon: '🏨', titleKey: 'audiencia3Title', descKey: 'audiencia3Desc', tagKey: 'audiencia3Tag' },
  { icon: '🧪', titleKey: 'audiencia4Title', descKey: 'audiencia4Desc', tagKey: 'audiencia4Tag' },
];

const SHOTS = [
  { src: '/screenshots/dashboard.png', captionKey: 'shotDashboard' },
  { src: '/screenshots/pacientes.png', captionKey: 'shotPatients' },
  { src: '/screenshots/citas.png', captionKey: 'shotBookings' },
  { src: '/screenshots/laboratorio.png', captionKey: 'shotLab' },
];

/* ==========================================================================
   DemoRequestSection
   ========================================================================== */

function DemoRequestSection() {
  const { t } = useTranslation('landing');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [clinic, setClinic] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subject = encodeURIComponent(t('demoRequestSubject'));
    const body = encodeURIComponent(
      `${t('formNameLabel')}: ${name}\n${t('formEmailLabel')}: ${email}\n${t('formClinicLabel')}: ${clinic}\n\n${message}`,
    );
    window.location.href = `mailto:${t('footerContactEmail')}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <section id="solicitar-demo" className="lp-section lp-section-alt">
      <div className="lp-section-header">
        <div className="lp-section-label">{t('demoRequestLabel')}</div>
        <h2 className="lp-section-title">{t('demoRequestTitle')}</h2>
        <p className="lp-section-desc">{t('demoRequestDesc')}</p>
      </div>
      <div className="lp-contact-grid">
        <div className="lp-contact-copy">
          <ul className="lp-contact-bullets">
            <li>
              <span className="lp-contact-bullet-icon">✓</span>
              {t('demoRequestBullet1')}
            </li>
            <li>
              <span className="lp-contact-bullet-icon">✓</span>
              {t('demoRequestBullet2')}
            </li>
            <li>
              <span className="lp-contact-bullet-icon">✓</span>
              {t('demoRequestBullet3')}
            </li>
          </ul>
          <p className="lp-contact-direct">
            {t('contactDirectLabel')}{' '}
            <a href={`mailto:${t('footerContactEmail')}`}>{t('footerContactEmail')}</a>
          </p>
        </div>
        <div className="lp-contact-card">
          <form className="lp-contact-form" onSubmit={handleSubmit}>
            <div className="lp-contact-field">
              <label className="lp-contact-label" htmlFor="demo-name">{t('formNameLabel')}</label>
              <input
                id="demo-name"
                className="lp-contact-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('formNamePlaceholder')}
                required
              />
            </div>
            <div className="lp-contact-field">
              <label className="lp-contact-label" htmlFor="demo-email">{t('formEmailLabel')}</label>
              <input
                id="demo-email"
                className="lp-contact-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('formEmailPlaceholder')}
                required
              />
            </div>
            <div className="lp-contact-field">
              <label className="lp-contact-label" htmlFor="demo-clinic">{t('formClinicLabel')}</label>
              <input
                id="demo-clinic"
                className="lp-contact-input"
                type="text"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                placeholder={t('formClinicPlaceholder')}
              />
            </div>
            <div className="lp-contact-field">
              <label className="lp-contact-label" htmlFor="demo-msg">{t('formMsgLabel')}</label>
              <textarea
                id="demo-msg"
                className="lp-contact-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('formMsgPlaceholder')}
              />
            </div>
            <button type="submit" className="lp-hero-btn lp-hero-btn-primary">
              {t('formSubmit')}
            </button>
            {sent && (
              <div className="lp-contact-success">
                <span>✓</span>
                {t('formSuccess')}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   LandingPage
   ========================================================================== */

function LandingPage() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [countryCode, setCountryCode] = useSelectedCountry();
  const { rates } = useExchangeRates();
  const pricingCountry = getCountryByCode(countryCode);
  const pricingCurrency = pricingCountry.currency;

  const openLogin = useCallback(() => login(), [login]);

  if (isLoading) return <LoadingState />;
  if (isAuthenticated && user) return <Navigate to={getRedirectPath(user.role)} replace />;

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
          <li><a href="#tech">{t('navTech')}</a></li>
          <li><a href="#how">{t('navHowItWorks')}</a></li>
          <li><a href="#pricing">{t('navPricing')}</a></li>
          <li><a href="#testimonials">{t('navTestimonials')}</a></li>
          <li><a href="#faq">{t('navFaq')}</a></li>
        </ul>
        <div className="lp-nav-actions">
          <LanguageSwitcher />
          <button className="lp-nav-btn lp-nav-btn-ghost" onClick={openLogin}>{t('navLogin')}</button>
          <button className="lp-nav-btn lp-nav-btn-primary" onClick={() => navigate('/contratar')}>{t('navCta')}</button>
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

      {/* ---------- PROBLEMA ---------- */}
      <section id="problema" className="lp-section lp-section-alt">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('problemaLabel')}</div>
          <h2 className="lp-section-title">{t('problemaTitle')}</h2>
          <p className="lp-section-desc">
            {t('problemaDesc')}
          </p>
        </div>
        <div className="lp-problem-grid">
          {PROBLEMS.map((p) => (
            <div key={p.titleKey} className="lp-problem-card">
              <div className="lp-problem-head">
                <div className="lp-problem-icon">{p.icon}</div>
                <h3 className="lp-problem-title">{t(p.titleKey)}</h3>
              </div>
              <p className="lp-problem-pain">{t(p.painKey)}</p>
              <div className="lp-problem-sol">
                <span className="lp-problem-sol-check">✓</span>
                <span>
                  <span className="lp-problem-sol-label">{t('problemaSolLabel')}</span>
                  <span>{t(p.solKey)}</span>
                </span>
              </div>
            </div>
          ))}
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

      {/* ---------- PARA QUIÉN ---------- */}
      <section id="audiencia" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('audienciaLabel')}</div>
          <h2 className="lp-section-title">{t('audienciaTitle')}</h2>
          <p className="lp-section-desc">
            {t('audienciaDesc')}
          </p>
        </div>
        <div className="lp-audience-grid">
          {AUDIENCES.map((a) => (
            <div key={a.titleKey} className="lp-audience-card">
              <div className="lp-audience-icon">{a.icon}</div>
              <h3 className="lp-audience-title">{t(a.titleKey)}</h3>
              <p className="lp-audience-desc">{t(a.descKey)}</p>
              <div className="lp-audience-tag">{t(a.tagKey)}</div>
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

      {/* ---------- TECH STACK ---------- */}
      <section id="tech" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('techLabel')}</div>
          <h2 className="lp-section-title">{t('techTitle')}</h2>
          <p className="lp-section-desc">{t('techDesc')}</p>
        </div>
        <div className="lp-tech-grid">
          {TECH_STACK.map((cat) => (
            <div key={cat.titleKey} className="lp-tech-category">
              <div className="lp-tech-cat-icon">{cat.icon}</div>
              <h3 className="lp-tech-cat-title">{t(cat.titleKey)}</h3>
              <div className="lp-tech-items">
                {cat.items.map((item) => (
                  <div key={item.name} className="lp-tech-item">
                    <span className="lp-tech-name">{item.name}</span>
                    {item.version && <span className="lp-tech-version">{item.version}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- SCREENSHOTS ---------- */}
      <section id="screenshots" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">{t('shotsLabel')}</div>
          <h2 className="lp-section-title">{t('shotsTitle')}</h2>
          <p className="lp-section-desc">
            {t('shotsDesc')}
          </p>
        </div>
        <div className="lp-shots-grid">
          {SHOTS.map((s) => (
            <figure key={s.src} className="lp-shot">
              <img
                className="lp-shot-img"
                src={s.src}
                alt={t(s.captionKey)}
                loading="lazy"
              />
              <figcaption className="lp-shot-caption">{t(s.captionKey)}</figcaption>
            </figure>
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
        <div className="lp-pricing-toolbar">
          <span className="lp-pricing-country-label">{t('pricingCountryLabel')}</span>
          <select
            className="lp-pricing-country-select"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            aria-label={t('pricingCountryLabel')}
          >
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.flag} {t(c.countryKey)}
              </option>
            ))}
          </select>
          <span className="lp-pricing-rate-note">{t('pricingRateNote')}</span>
        </div>
        <div className="lp-pricing-grid">
          {PRICING_PLANS.map((plan) => {
            const localAmount = convertUsd(plan.usdPrice, pricingCurrency, rates);
            return (
              <div key={plan.nameKey} className={`lp-pricing-card ${plan.popular ? 'lp-pricing-popular' : ''}`}>
                {plan.popular && <div className="lp-pricing-badge">{t('pricingMostPopular')}</div>}
                <div className="lp-pricing-name">{t(plan.nameKey)}</div>
                <div className="lp-pricing-desc">{t(plan.descKey)}</div>
                <div className="lp-pricing-price">
                  <span className="lp-pricing-currency">{getCurrencySymbol(pricingCurrency)}</span>
                  <span className="lp-pricing-amount">{formatPricingAmount(localAmount, pricingCurrency)}</span>
                  <span className="lp-pricing-period">{t('pricingPeriod')}</span>
                </div>
                <div className="lp-pricing-base">
                  {t('pricingBase')}: {formatPricingAmount(plan.usdPrice, 'USD')} USD
                  <span className="lp-pricing-base-country"> · {pricingCountry.flag} {t(pricingCountry.countryKey)}</span>
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
                  className={`lp-hero-btn lp-hero-btn-block ${plan.popular ? 'lp-hero-btn-primary' : 'lp-hero-btn-secondary'}`}
                  onClick={() => navigate('/contratar')}
                >
                  {t('pricingCta')}
                </button>
              </div>
            );
          })}
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

      {/* ---------- SOLICITAR DEMO ---------- */}
      <DemoRequestSection />

      {/* ---------- CTA ---------- */}
      <section id="cta" className="lp-cta-section">
        <h2 className="lp-cta-title">{t('ctaTitle')}</h2>
        <p className="lp-cta-desc">
          {t('ctaDesc')}
        </p>
        <button className="lp-hero-btn lp-hero-btn-primary" onClick={() => navigate('/contratar')}>
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
              <li><a href="/privacidad">{t('footerLegalPrivacy')}</a></li>
              <li><a href="/terminos">{t('footerLegalTerms')}</a></li>
              <li><a href="#">{t('footerLegalHipaa')}</a></li>
              <li><a href="/privacidad">{t('footerLegalCookies')}</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} {t('brandName')}. {t('footerCopyright')}</span>
          <span className="lp-footer-contact">{t('footerContactAddress')} · <a href={`mailto:${t('footerContactEmail')}`} className="lp-footer-mail">{t('footerContactEmail')}</a></span>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
