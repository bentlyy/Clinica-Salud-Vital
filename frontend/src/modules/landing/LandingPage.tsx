import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRedirectPath } from '@/shared/utils/role.utils';
import './LandingPage.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const hasCaptcha = Boolean(RECAPTCHA_SITE_KEY);

const FEATURES = [
  { icon: '📅', title: 'Gestión de Citas', desc: 'Agenda y administra citas con recordatorios automáticos y calendario inteligente.' },
  { icon: '👥', title: 'Multi-tenancy', desc: 'Múltiples clínicas en una sola plataforma con datos completamente aislados.' },
  { icon: '📋', title: 'Historial Clínico', desc: 'Registros médicos digitales con prescripciones, historial completo y laboratorio.' },
  { icon: '🔬', title: 'Laboratorio', desc: 'Gestión de estudios de laboratorio con resultados y descarga de reportes.' },
  { icon: '📊', title: 'Reportes y Análisis', desc: 'Dashboards con métricas en tiempo real, reportes de ingresos y pacientes.' },
  { icon: '🔒', title: 'Seguridad RBAC', desc: 'Autenticación JWT con 2FA, roles y permisos granulares por módulo.' },
];

const CLIENTS = [
  { name: 'Clínica Norte', color: '#dbeafe', emoji: '🏥' },
  { name: 'Hospital Sur', color: '#fce7f3', emoji: '🏨' },
  { name: 'Centro Médico', color: '#d1fae5', emoji: '⚕️' },
  { name: 'Laboratorio Labs', color: '#fef3c7', emoji: '🔬' },
  { name: 'Dr. García', color: '#ede9fe', emoji: '👨‍⚕️' },
  { name: 'Dra. López', color: '#fce7f3', emoji: '👩‍⚕️' },
  { name: 'Salud Integral', color: '#ccfbf1', emoji: '💚' },
  { name: 'MediCenter', color: '#dbeafe', emoji: '🩺' },
];

const PRICING_PLANS = [
  {
    name: 'Básico', desc: 'Para clínicas pequeñas', price: '299', popular: false,
    features: [
      { text: 'Hasta 5 doctores', included: true },
      { text: '200 pacientes', included: true },
      { text: 'Gestión de citas', included: true },
      { text: 'Historial clínico digital', included: true },
      { text: 'Soporte por email', included: true },
      { text: 'Laboratorio', included: false },
      { text: 'Analytics IA', included: false },
    ],
  },
  {
    name: 'Profesional', desc: 'Para clínicas en crecimiento', price: '599', popular: true,
    features: [
      { text: 'Hasta 20 doctores', included: true },
      { text: '1,000 pacientes', included: true },
      { text: 'Todo lo del plan Básico', included: true },
      { text: 'Laboratorio integrado', included: true },
      { text: 'Analytics con IA', included: true },
      { text: 'Multi-idioma (ES/EN/PT/FR)', included: true },
      { text: 'Soporte prioritario', included: true },
    ],
  },
  {
    name: 'Enterprise', desc: 'Para redes de clínicas', price: '1,299', popular: false,
    features: [
      { text: 'Doctores ilimitados', included: true },
      { text: 'Pacientes ilimitados', included: true },
      { text: 'Todo lo del plan Pro', included: true },
      { text: 'Multi-tenant', included: true },
      { text: 'API REST completa', included: true },
      { text: 'SLA 99.97% uptime', included: true },
      { text: 'Soporte dedicado 24/7', included: true },
    ],
  },
];

const STEPS = [
  { num: 1, title: 'Crea tu cuenta', desc: 'Regístrate gratis en 30 segundos. Sin tarjeta de crédito. Configura tu clínica básica.' },
  { num: 2, title: 'Configura tu equipo', desc: 'Invita doctores, personal de laboratorio y admin. Asigna especialidades y horarios.' },
  { num: 3, title: '¡Listo!', desc: 'Comienza a agendar citas, gestionar pacientes y monitorear todo desde el dashboard.' },
];

const TESTIMONIALS = [
  {
    stars: '⭐⭐⭐⭐⭐',
    text: '"Reducimos los no-shows en un 40% con los recordatorios automáticos. La gestión de laboratorio integrada nos ahorró 3 horas diarias."',
    name: 'Dr. Manuel García', role: 'Director, Clínica Norte',
    initials: 'MG', gradient: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    text: '"El panel de analytics predictivo nos ayudó a optimizar horarios y aumentar la capacidad un 25%. Increíble."',
    name: 'Dra. Sofía Rodríguez', role: 'Admin, Hospital Central',
    initials: 'SR', gradient: 'linear-gradient(135deg,#60a5fa,#3b82f6)',
  },
  {
    stars: '⭐⭐⭐⭐⭐',
    text: '"Migramos de un sistema legacy en 2 semanas. El soporte fue excepcional. Ahora todo funciona desde el celular."',
    name: 'Dr. Andrés López', role: 'Socio Fundador, Médica Sur',
    initials: 'AL', gradient: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
  },
];

const FAQS = [
  { q: '¿Necesito tarjeta de crédito para empezar?', a: 'No. El plan de prueba de 14 días es completamente gratuito y no requiere tarjeta de crédito. Si decides quedarte, elegís el plan que mejor se adapte a tu clínica.' },
  { q: '¿Puedo migrar datos de otro sistema?', a: 'Sí. Ofrecemos migración gratuita de datos para planes Profesional y Enterprise. Nuestro equipo se encarga del proceso completo sin interrumpir tus operaciones.' },
  { q: '¿Cumple con HIPAA y regulaciones de salud?', a: 'Sí. Cumple con HIPAA, ISO 27001 y todas las regulaciones de protección de datos de salud. Ofrecemos encriptación end-to-end y auditoría completa.' },
  { q: '¿Cuántos usuarios puedo tener?', a: 'Depende del plan. El plan Básico permite hasta 5 doctores, Profesional hasta 20, y Enterprise es ilimitado. Todos los planes incluyen usuarios de laboratorio y admin.' },
  { q: '¿Ofrecen soporte en español?', a: 'Sí. Todo nuestro soporte está en español. Los planes Profesional y Enterprise incluyen soporte prioritario con tiempo de respuesta garantizado.' },
];

function LandingPage() {
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
          <span className="lp-nav-brand-name">Clinica Salud Vital</span>
        </a>
        <ul className="lp-nav-links">
          <li><a href="#features">Funcionalidades</a></li>
          <li><a href="#how">Cómo funciona</a></li>
          <li><a href="#pricing">Precios</a></li>
          <li><a href="#testimonials">Testimonios</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className="lp-nav-actions">
          <button className="lp-nav-btn lp-nav-btn-ghost" onClick={openLogin}>Iniciar sesion</button>
          <button className="lp-nav-btn lp-nav-btn-primary" onClick={openLogin}>Comenzar ahora</button>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-inner">
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot" />
              Plataforma SaaS para Gestion de Centros Medicos
            </div>
            <h1 className="lp-hero-title">
              Gestiona tu clinica de manera <span>inteligente y moderna</span>
            </h1>
            <p className="lp-hero-subtitle">
              La plataforma todo-en-uno para la gestion de citas, historial clinico,
              laboratorio, reportes y mas. Multi-tenancy con seguridad de nivel empresarial.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-hero-btn lp-hero-btn-primary" onClick={openLogin}>
                Empezar gratis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <a href="#features" className="lp-hero-btn lp-hero-btn-secondary">
                Ver funcionalidades
              </a>
            </div>
            <div className="lp-hero-stats">
              <div>
                <div className="lp-hero-stat-value">500+</div>
                <div className="lp-hero-stat-label">Clinicas activas</div>
              </div>
              <div>
                <div className="lp-hero-stat-value">50k+</div>
                <div className="lp-hero-stat-label">Citas gestionadas</div>
              </div>
              <div>
                <div className="lp-hero-stat-value">99.9%</div>
                <div className="lp-hero-stat-label">Uptime garantizado</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section id="features" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">Funcionalidades</div>
          <h2 className="lp-section-title">Todo lo que necesitas en una sola plataforma</h2>
          <p className="lp-section-desc">
            Herramientas modernas disenadas para optimizar la operacion de tu centro medico.
          </p>
        </div>
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon">{f.icon}</div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CLIENTS ---------- */}
      <section id="clients" className="lp-section lp-section-alt">
        <div className="lp-section-header">
          <div className="lp-section-label">Nuestros clientes</div>
          <h2 className="lp-section-title">Clinicas que confian en nosotros</h2>
          <p className="lp-section-desc">
            Miles de profesionales de la salud ya usan nuestra plataforma a diario.
          </p>
        </div>
        <div className="lp-clients-grid">
          {CLIENTS.map((c) => (
            <div key={c.name} className="lp-client-card">
              <div className="lp-client-logo" style={{ background: c.color }}>{c.emoji}</div>
              <div className="lp-client-name">{c.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">Cómo funciona</div>
          <h2 className="lp-section-title">En 3 pasos estás operando</h2>
          <p className="lp-section-desc">Configura tu clínica en minutos, no en semanas.</p>
        </div>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <div key={s.num} className="lp-step">
              <div className="lp-step-num">{s.num}</div>
              <div className="lp-step-title">{s.title}</div>
              <div className="lp-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section id="pricing" className="lp-section lp-section-alt">
        <div className="lp-section-header">
          <div className="lp-section-label">Precios</div>
          <h2 className="lp-section-title">Planes para cada clínica</h2>
          <p className="lp-section-desc">Precios transparentes. Sin costos ocultos. Cancela cuando quieras.</p>
        </div>
        <div className="lp-pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <div key={plan.name} className={`lp-pricing-card ${plan.popular ? 'lp-pricing-popular' : ''}`}>
              {plan.popular && <div className="lp-pricing-badge">Más Popular</div>}
              <div className="lp-pricing-name">{plan.name}</div>
              <div className="lp-pricing-desc">{plan.desc}</div>
              <div className="lp-pricing-price">
                <span className="lp-pricing-currency">$</span>
                <span className="lp-pricing-amount">{plan.price}</span>
                <span className="lp-pricing-period">/mes</span>
              </div>
              <ul className="lp-pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j} className={f.included ? '' : 'lp-pricing-feature-disabled'}>
                    <span className={f.included ? 'lp-pricing-check' : 'lp-pricing-x'}>
                      {f.included ? '✓' : '✗'}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <button
                className={`lp-hero-btn ${plan.popular ? 'lp-hero-btn-primary' : 'lp-hero-btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={openLogin}
              >
                Empezar Gratis
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------- */}
      <section id="testimonials" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-label">Testimonios</div>
          <h2 className="lp-section-title">Lo que dicen nuestros clientes</h2>
          <p className="lp-section-desc">Más de 2,400 profesionales médicos ya confían en nosotros.</p>
        </div>
        <div className="lp-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="lp-testimonial-card">
              <div className="lp-testimonial-stars">{t.stars}</div>
              <div className="lp-testimonial-text">{t.text}</div>
              <div className="lp-testimonial-author">
                <div className="lp-testimonial-avatar" style={{ background: t.gradient }}>{t.initials}</div>
                <div>
                  <div className="lp-testimonial-name">{t.name}</div>
                  <div className="lp-testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="lp-section lp-section-alt">
        <div className="lp-section-header">
          <div className="lp-section-label">Preguntas Frecuentes</div>
          <h2 className="lp-section-title">¿Tenés dudas?</h2>
        </div>
        <div className="lp-faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className={`lp-faq-item ${openFaq === i ? 'lp-faq-open' : ''}`}>
              <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                {faq.q}
                <span className="lp-faq-arrow">▾</span>
              </button>
              <div className="lp-faq-a">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section id="cta" className="lp-cta-section">
        <h2 className="lp-cta-title">Empieza a gestionar tu clinica hoy</h2>
        <p className="lp-cta-desc">
          Unete a cientos de clinicas que ya transformaron su operacion con nuestra plataforma.
        </p>
        <button className="lp-hero-btn lp-hero-btn-primary" onClick={openLogin}>
          Crear cuenta gratis
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div>
            <div className="lp-footer-brand">💚 Clinica Salud Vital</div>
            <p className="lp-footer-brand-desc">La plataforma SaaS líder en gestión médica para centros de salud en Latinoamérica.</p>
          </div>
          <div>
            <div className="lp-footer-col-title">Producto</div>
            <ul className="lp-footer-links">
              <li><a href="#features">Funcionalidades</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><a href="#">API Docs</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>
          <div>
            <div className="lp-footer-col-title">Empresa</div>
            <ul className="lp-footer-links">
              <li><a href="#">Sobre Nosotros</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contacto</a></li>
            </ul>
          </div>
          <div>
            <div className="lp-footer-col-title">Legal</div>
            <ul className="lp-footer-links">
              <li><a href="#">Privacidad</a></li>
              <li><a href="#">Términos</a></li>
              <li><a href="#">HIPAA</a></li>
              <li><a href="#">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} Clinica Salud Vital. Todos los derechos reservados.</span>
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
      if (totp.length < 6) { setError('Ingresa el codigo de 6 digitos'); return; }
      const captcha_token = hasCaptcha ? recaptchaRef.current?.getValue() ?? undefined : undefined;
      if (hasCaptcha && !captcha_token) { setError('Completa el captcha'); return; }
      setLoading(true);
      setError('');
      try {
        const res = await login(pendingEmail, pendingPassword, totp, captcha_token);
        if (res.requires_2fa) { setError('Codigo incorrecto. Intenta de nuevo.'); setLoading(false); return; }
        if (rememberMe) localStorage.setItem('rememberedEmail', pendingEmail);
        navigate(getRedirectPath(res.user.role), { replace: true });
      } catch (err: any) {
        const msg = err?.response?.data?.error || 'Codigo invalido';
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) { setError('Ingresa tu email y contrasena'); return; }
    const captcha_token = hasCaptcha ? recaptchaRef.current?.getValue() ?? undefined : undefined;
    if (hasCaptcha && !captcha_token) { setError('Completa el captcha'); return; }
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
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Credenciales incorrectas';
      setError(msg);
      recaptchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, step, totp, pendingEmail, pendingPassword, rememberMe, login, navigate]);

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
          <h2 className="lm-visual-title">Clinica Salud Vital</h2>
          <p className="lm-visual-sub">
            Plataforma moderna para la gestion integral de tu centro medico
          </p>
        </div>

        {/* Right form panel */}
        <div className="lm-form-panel">
          <button className="lm-close" onClick={onClose} aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <div className="lm-brand">
            <span className="lm-brand-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            </span>
            <span className="lm-brand-text">Clinica Salud Vital</span>
          </div>

          {step === '2fa' ? (
            <>
              <h1 className="lm-title">Verificacion en dos pasos</h1>
              <p className="lm-subtitle">Ingresa el codigo de 6 digitos desde tu aplicacion de autenticacion.</p>
              <button className="lm-back" onClick={() => { setStep('login'); setTotp(''); setError(''); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Volver al login
              </button>
            </>
          ) : (
            <>
              <h1 className="lm-title">Iniciar sesion</h1>
              <p className="lm-subtitle">Ingresa tus credenciales para acceder al panel.</p>
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
                <p className="lm-2fa-hint">Codigo de 6 digitos</p>
              </div>
            ) : (
              <>
                <div className="lm-field">
                  <label className="lm-label" htmlFor="lm-email">Email</label>
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
                  <label className="lm-label" htmlFor="lm-password">Contrasena</label>
                  <div className="lm-input-wrapper">
                    <svg className="lm-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input
                      id="lm-password"
                      className="lm-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tu contrasena"
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
              <div className="lm-field" style={{ display: 'flex', justifyContent: 'center' }}>
                <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY!} />
              </div>
            )}

            {step === 'login' && (
              <div className="lm-options">
                <label className="lm-checkbox">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="lm-checkbox-mark" />
                  <span className="lm-checkbox-text">Recordarme</span>
                </label>
                <a href="/forgot-password" className="lm-forgot">Olvidaste tu contrasena?</a>
              </div>
            )}

            <button className="lm-submit" type="submit" disabled={loading}>
              {loading && <span className="lm-spinner" />}
              {step === '2fa' ? 'Verificar' : 'Iniciar sesion'}
            </button>
          </form>

          <div className="lm-divider">
            <span className="lm-divider-line" />
            <span className="lm-divider-text">o</span>
            <span className="lm-divider-line" />
          </div>

          <button className="lm-guest" type="button" onClick={handleGuestDashboard}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
            Entrar como invitado
          </button>

          <button className="lm-guest" type="button" onClick={handleGuest} style={{ marginTop: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Reservar como invitado
          </button>

          <p className="lm-signup">
            No tienes cuenta? <a onClick={onClose}>Contacta al administrador</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
