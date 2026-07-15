import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import ReCAPTCHA from 'react-google-recaptcha';
import { isAxiosError } from 'axios';
import { sanitizeError } from '../utils/error-sanitizer';
import './LandingSaaS.css';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const hasCaptcha = Boolean(RECAPTCHA_SITE_KEY);

const LandingSaaS = React.memo(function LandingSaaS() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', totp_token: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchParams.get('openLogin') === '1') {
      setLoginModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (user) {
      navigate('/booking');
    }
  }, [user, navigate]);

  const openLogin = useCallback(() => {
    setError(null);
    setNeeds2FA(false);
    setForm({ email: '', password: '', totp_token: '' });
    setLoginModalOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginModalOpen(false);
    setError(null);
    setNeeds2FA(false);
    setForm({ email: '', password: '', totp_token: '' });
    recaptchaRef.current?.reset();
  }, []);

  const getCaptchaToken = () => {
    if (!hasCaptcha) return undefined;
    return recaptchaRef.current?.getValue();
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.email.trim()) {
      setError(t('auth.email_required') || 'El correo es requerido');
      return;
    }
    if (!form.password.trim()) {
      setError(t('auth.password_required') || 'La contraseña es requerida');
      return;
    }

    const captcha_token = getCaptchaToken();
    if (hasCaptcha && !captcha_token) {
      setError(t('auth.captcha_required') || 'Completa el captcha');
      return;
    }

    try {
      setSubmitting(true);
      const user = await login(form.email, form.password, needs2FA ? form.totp_token : undefined, captcha_token);
      closeLogin();
      const redirect = searchParams.get('redirect');
      if (redirect) { navigate(redirect); return; }
      if (user.role === 'superadmin') {
        navigate('/super-admin/demo-data');
      } else if (user.role === 'admin') {
        navigate('/');
      } else if (user.role === 'doctor') {
        navigate('/doctor');
      } else if (user.role === 'lab_technician') {
        navigate('/lab');
      } else {
        navigate('/booking');
      }
    } catch (err) {
      if (isAxiosError(err) && (err.response?.data?.code === '2FA_REQUIRED' || err.response?.data?.error === '2FA token required')) {
        setNeeds2FA(true);
      } else {
        setError(sanitizeError(err) || t('auth.invalid_credentials'));
      }
      recaptchaRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const features = [
    { icon: '📅', title: 'Gestión de Citas', desc: 'Agenda inteligente con confirmación automática, recordatorios por WhatsApp y calendario sync.', color: 'teal' },
    { icon: '👨‍⚕️', title: 'Panel del Doctor', desc: 'Historial clínico digital, disponibilidad, calendarización y gestión de pacientes en un solo lugar.', color: 'blue' },
    { icon: '🧪', title: 'Laboratorio Integrado', desc: 'Catálogo de pruebas, resultados digitales, control de calidad y áreas de laboratorio.', color: 'amber' },
    { icon: '📊', title: 'Analytics Predictivo', desc: 'Dashboards en tiempo real, predicción de demanda, no-shows y optimización de horarios con IA.', color: 'rose' },
    { icon: '🔒', title: 'Seguridad HIPAA', desc: 'Encriptación end-to-end, cumplimiento HIPAA/ISO 27001, 2FA y auditoría completa.', color: 'purple' },
    { icon: '🏢', title: 'Multi-Tenant', desc: 'Una plataforma, múltiples clínicas. Cada tenant con su configuración, usuarios y datos aislados.', color: 'green' },
  ];

  const steps = [
    { num: 1, title: 'Crea tu cuenta', desc: 'Regístrate gratis en 30 segundos. Sin tarjeta de crédito. Configura tu clínica básica.' },
    { num: 2, title: 'Configura tu equipo', desc: 'Invita doctores, personal de laboratorio y admin. Asigna especialidades y horarios.' },
    { num: 3, title: '¡Listo!', desc: 'Comienza a agendar citas, gestionar pacientes y monitorear todo desde el dashboard.' },
  ];

  const pricingPlans = [
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

  const testimonials = [
    {
      stars: '⭐⭐⭐⭐⭐',
      text: '"Reducimos los no-shows en un 40% con los recordatorios automáticos. La gestión de laboratorio integrada nos ahorró 3 horas diarias."',
      name: 'Dr. Manuel García', role: 'Director, Clínica Norte',
      avatar: { initials: 'MG', gradient: 'linear-gradient(135deg,#2dd4bf,#0d9488)' },
    },
    {
      stars: '⭐⭐⭐⭐⭐',
      text: '"El panel de analytics predictivo nos ayudó a optimizar horarios y aumentar la capacidad un 25%. Increíble."',
      name: 'Dra. Sofía Rodríguez', role: 'Admin, Hospital Central',
      avatar: { initials: 'SR', gradient: 'linear-gradient(135deg,#60a5fa,#3b82f6)' },
    },
    {
      stars: '⭐⭐⭐⭐⭐',
      text: '"Migramos de un sistema legacy en 2 semanas. El soporte fue excepcional. Ahora todo funciona desde el celular."',
      name: 'Dr. Andrés López', role: 'Socio Fundador, Médica Sur',
      avatar: { initials: 'AL', gradient: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
    },
  ];

  const faqs = [
    { q: '¿Necesito tarjeta de crédito para empezar?', a: 'No. El plan de prueba de 14 días es completamente gratuito y no requiere tarjeta de crédito. Si decides quedarte, elegís el plan que mejor se adapte a tu clínica.' },
    { q: '¿Puedo migrar datos de otro sistema?', a: 'Sí. Ofrecemos migración gratuita de datos para planes Profesional y Enterprise. Nuestro equipo se encarga del proceso completo sin interrumpir tus operaciones.' },
    { q: '¿Cumple con HIPAA y regulaciones de salud?', a: 'Sí. Salud Vital cumple con HIPAA, ISO 27001 y todas las regulaciones de protección de datos de salud. Ofrecemos encriptación end-to-end y auditoría completa.' },
    { q: '¿Cuántos usuarios puedo tener?', a: 'Depende del plan. El plan Básico permite hasta 5 doctores, Profesional hasta 20, y Enterprise es ilimitado. Todos los planes incluyen usuarios de laboratorio y admin.' },
    { q: '¿Ofrecen soporte en español?', a: 'Sí. Todo nuestro soporte está en español. Los planes Profesional y Enterprise incluyen soporte prioritario con tiempo de respuesta garantizado.' },
  ];

  const getIconColorClass = (color: string) => `ls-fi-${color}`;

  return (
    <div className="landing-saas">
      {/* NAVBAR */}
      <nav className={`ls-navbar ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="ls-nav-brand">
          <div className="ls-nav-brand-icon">💚</div>
          <span className="ls-nav-brand-text">Salud Vital</span>
        </Link>
        <div className="ls-nav-links">
          <a href="#features">Funcionalidades</a>
          <a href="#how">Cómo funciona</a>
          <a href="#pricing">Precios</a>
          <a href="#testimonials">Testimonios</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="ls-nav-actions">
          <button className="ls-btn ls-btn-ghost" onClick={openLogin}>Iniciar Sesión</button>
          <a href="#pricing" className="ls-btn ls-btn-primary">Empezar Gratis</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="ls-hero">
        <div className="ls-hero-content">
          <div className="ls-hero-badge">
            <span className="ls-hero-badge-dot"></span> Plataforma #1 en Gestión Médica
          </div>
          <h1>La plataforma <span>SaaS</span> que tu clínica necesita</h1>
          <p className="ls-hero-desc">
            Gestiona pacientes, doctores, citas, laboratorio y analytics desde una sola plataforma. Potenciada por inteligencia artificial.
          </p>
          <div className="ls-hero-actions">
            <a href="#pricing" className="ls-btn ls-btn-primary ls-btn-xl">🚀 Empezar Gratis — 14 días</a>
            <button className="ls-btn ls-btn-outline ls-btn-xl" onClick={openLogin}>▶ Ver Demo en Vivo</button>
          </div>
          <div className="ls-hero-proof">
            <div className="ls-hero-avatars">
              <div className="ls-hero-av" style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)' }}>MG</div>
              <div className="ls-hero-av" style={{ background: 'linear-gradient(135deg,#60a5fa,#3b82f6)' }}>CR</div>
              <div className="ls-hero-av" style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)' }}>PS</div>
              <div className="ls-hero-av" style={{ background: 'linear-gradient(135deg,#fb7185,#e11d48)' }}>ET</div>
              <div className="ls-hero-av" style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}>LM</div>
            </div>
            <span><strong style={{ color: '#374151' }}>2,400+</strong> profesionales confían en nosotros</span>
          </div>
        </div>
      </section>

      {/* LOGOS */}
      <div className="ls-logos-section">
        <div className="ls-logos-label">Utilizada por centros líderes en Latinoamérica</div>
        <div className="ls-logos-row">
          <div className="ls-logo-item"><span>🏥</span> Clínica Norte</div>
          <div className="ls-logo-item"><span>🏥</span> Hospital Central</div>
          <div className="ls-logo-item"><span>🏥</span> Médica Sur</div>
          <div className="ls-logo-item"><span>🏥</span> Salud Integral</div>
          <div className="ls-logo-item"><span>🏥</span> VidaPlena</div>
          <div className="ls-logo-item"><span>🏥</span> MedGroup</div>
        </div>
      </div>

      {/* FEATURES */}
      <section className="ls-section" id="features">
        <div className="ls-section-center">
          <div className="ls-section-label">Funcionalidades</div>
          <h2 className="ls-section-title">Todo lo que tu clínica necesita</h2>
          <p className="ls-section-desc">Una plataforma completa que centraliza todas las operaciones de tu centro médico.</p>
        </div>
        <div className="ls-features-grid">
          {features.map((f, i) => (
            <div key={i} className="ls-feature-card">
              <div className={`ls-feature-icon ${getIconColorClass(f.color)}`}>{f.icon}</div>
              <div className="ls-feature-title">{f.title}</div>
              <div className="ls-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="ls-section ls-pricing-bg" id="how">
        <div className="ls-section-center">
          <div className="ls-section-label">Cómo funciona</div>
          <h2 className="ls-section-title">En 3 pasos estás operando</h2>
          <p className="ls-section-desc">Configura tu clínica en minutos, no en semanas.</p>
        </div>
        <div className="ls-steps">
          {steps.map((s, i) => (
            <div key={i} className="ls-step">
              <div className="ls-step-num">{s.num}</div>
              <div className="ls-step-title">{s.title}</div>
              <div className="ls-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="ls-section ls-pricing-bg" id="pricing">
        <div className="ls-section-center">
          <div className="ls-section-label">Precios</div>
          <h2 className="ls-section-title">Planes para cada clínica</h2>
          <p className="ls-section-desc">Precios transparentes. Sin costos ocultos. Cancela cuando quieras.</p>
        </div>
        <div className="ls-pricing-grid">
          {pricingPlans.map((plan, i) => (
            <div key={i} className={`ls-pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <div className="ls-pricing-popular-badge">Más Popular</div>}
              <div className="ls-pricing-name">{plan.name}</div>
              <div className="ls-pricing-desc">{plan.desc}</div>
              <div className="ls-pricing-price">
                <span className="ls-pricing-currency">S/</span>
                <span className="ls-pricing-amount">{plan.price}</span>
                <span className="ls-pricing-period">/mes</span>
              </div>
              <ul className="ls-pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j}>
                    <span className={f.included ? 'ls-pf-check' : 'ls-pf-x'}>{f.included ? '✓' : '✗'}</span>
                    <span style={f.included ? {} : { color: '#d1d5db' }}>{f.text}</span>
                  </li>
                ))}
              </ul>
              <button className={`ls-btn ls-btn-lg ls-pricing-btn ${plan.popular ? 'ls-btn-primary' : 'ls-btn-outline'}`}>
                Empezar Gratis
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="ls-section" id="testimonials">
        <div className="ls-section-center">
          <div className="ls-section-label">Testimonios</div>
          <h2 className="ls-section-title">Lo que dicen nuestros clientes</h2>
          <p className="ls-section-desc">Más de 2,400 profesionales médicos ya confían en Salud Vital.</p>
        </div>
        <div className="ls-testimonials-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="ls-testimonial-card">
              <div className="ls-testimonial-stars">{t.stars}</div>
              <div className="ls-testimonial-text">{t.text}</div>
              <div className="ls-testimonial-author">
                <div className="ls-testimonial-avatar" style={{ background: t.avatar.gradient }}>{t.avatar.initials}</div>
                <div>
                  <div className="ls-testimonial-name">{t.name}</div>
                  <div className="ls-testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="ls-section ls-pricing-bg" id="faq">
        <div className="ls-section-center">
          <div className="ls-section-label">Preguntas Frecuentes</div>
          <h2 className="ls-section-title">¿Tenés dudas?</h2>
        </div>
        <div className="ls-faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className={`ls-faq-item ${openFaq === i ? 'open' : ''}`}>
              <button className="ls-faq-q" onClick={() => toggleFaq(i)}>
                {faq.q}
                <span className="ls-faq-arrow">▾</span>
              </button>
              <div className="ls-faq-a">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ls-cta-section">
        <div className="ls-cta-content">
          <h2>¿Listo para transformar tu clínica?</h2>
          <p>Uníte a más de 2,400 profesionales que ya confían en Salud Vital. Empezá gratis hoy.</p>
          <div className="ls-cta-actions">
            <a href="#pricing" className="ls-btn ls-btn-white ls-btn-xl">🚀 Empezar Gratis</a>
            <button className="ls-btn ls-btn-ghost-white ls-btn-xl" onClick={openLogin}>Iniciar Sesión</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ls-footer">
        <div className="ls-footer-grid">
          <div>
            <div className="ls-footer-brand-text">💚 Salud Vital</div>
            <div className="ls-footer-brand-desc">La plataforma SaaS líder en gestión médica para centros de salud en Latinoamérica.</div>
          </div>
          <div>
            <div className="ls-footer-col-title">Producto</div>
            <ul className="ls-footer-links">
              <li><a href="#features">Funcionalidades</a></li>
              <li><a href="#pricing">Precios</a></li>
              <li><a href="#">API Docs</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>
          <div>
            <div className="ls-footer-col-title">Empresa</div>
            <ul className="ls-footer-links">
              <li><a href="#">Sobre Nosotros</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Contacto</a></li>
            </ul>
          </div>
          <div>
            <div className="ls-footer-col-title">Legal</div>
            <ul className="ls-footer-links">
              <li><a href="#">Privacidad</a></li>
              <li><a href="#">Términos</a></li>
              <li><a href="#">HIPAA</a></li>
              <li><a href="#">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="ls-footer-bottom">
          <span>© 2026 Salud Vital. Todos los derechos reservados.</span>
          <div className="ls-footer-social">
            <a href="#">𝕏</a>
            <a href="#">in</a>
            <a href="#">▶</a>
            <a href="#">📘</a>
          </div>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      <div className={`ls-modal-overlay ${loginModalOpen ? 'show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeLogin(); }}>
        <div className="ls-login-modal">
          <button className="ls-modal-close" onClick={closeLogin}>✕</button>
          <div className="ls-modal-brand">
            <div className="ls-nav-brand-icon" style={{ width: 32, height: 32, fontSize: 16 }}>💚</div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#134e4a' }}>Salud Vital</span>
          </div>
          <h2>{t('auth.login_title') || 'Bienvenido de nuevo'}</h2>
          <p className="ls-modal-subtitle">{t('auth.login_subtitle') || 'Ingresa para acceder a tu panel de control'}</p>

          {error && (
            <div className="ls-lm-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="ls-lm-field">
              <label>{t('auth.email') || 'Correo electrónico'}</label>
              <input
                className="ls-lm-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t('auth.email_placeholder') || 'doctor@clinica.com'}
                autoFocus
              />
            </div>

            <div className="ls-lm-field">
              <label>{t('auth.password') || 'Contraseña'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="ls-lm-input"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={t('auth.password_placeholder') || 'Ingresa tu contraseña'}
                  style={{ paddingRight: 60 }}
                />
                <button
                  type="button"
                  className="ls-lm-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {needs2FA && (
              <div className="ls-lm-field">
                <label>{t('auth.totp_code') || 'Código 2FA'}</label>
                <input
                  className="ls-lm-input ls-lm-totp"
                  type="text"
                  value={form.totp_token}
                  onChange={(e) => setForm({ ...form, totp_token: e.target.value })}
                  placeholder={t('auth.totp_placeholder') || '000000'}
                  maxLength={6}
                  autoFocus
                />
              </div>
            )}

            {hasCaptcha && ReCAPTCHA && (
              <div className="ls-lm-field" style={{ display: 'flex', justifyContent: 'center' }}>
                <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
              </div>
            )}

            <div className="ls-lm-row">
              <label className="ls-lm-chk">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Recordarme
              </label>
              <Link to="/forgot-password" className="ls-lm-forgot" onClick={closeLogin}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button type="submit" className="ls-lm-btn" disabled={submitting}>
              {submitting ? (
                <span className="ls-lm-submit-loading">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ls-lm-spinner">
                    <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" />
                  </svg>
                  {t('auth.logging_in') || 'Ingresando...'}
                </span>
              ) : needs2FA ? (t('auth.verify_2fa') || 'Verificar 2FA') : (t('auth.login_button') || 'Iniciar Sesión')}
            </button>
          </form>

          <div className="ls-lm-divider"><span>o</span></div>

          <Link to="/booking" className="ls-lm-guest" onClick={closeLogin}>
            🎫 {t('auth.guest_booking') || 'Reservar como invitado'}
          </Link>

          <p className="ls-lm-signup">
            {t('auth.no_account') || '¿No tienes cuenta?'}{' '}
            <Link to="/register" onClick={closeLogin}>{t('auth.register_link') || 'Regístrate gratis'}</Link>
          </p>
        </div>
      </div>
    </div>
  );
});

export default LandingSaaS;
