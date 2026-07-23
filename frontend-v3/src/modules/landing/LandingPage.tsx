import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRedirectPath } from '@/shared/utils/role.utils';
import './LandingPage.css';

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

function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
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
          <li><a href="#clients">Clientes</a></li>
          <li><a href="#cta">Precios</a></li>
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
        &copy; {new Date().getFullYear()} Clinica Salud Vital. Todos los derechos reservados.
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
      setLoading(true);
      setError('');
      try {
        const res = await login(pendingEmail, pendingPassword, totp);
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
    setLoading(true);
    setError('');
    try {
      const res = await login(email, password);
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
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, step, totp, pendingEmail, pendingPassword, rememberMe, login, navigate]);

  const handleGuest = useCallback(() => {
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

            {step === 'login' && (
              <div className="lm-options">
                <label className="lm-checkbox">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span className="lm-checkbox-mark" />
                  <span className="lm-checkbox-text">Recordarme</span>
                </label>
                <a href="#" className="lm-forgot" onClick={(e) => e.preventDefault()}>Olvidaste tu contrasena?</a>
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

          <button className="lm-guest" type="button" onClick={handleGuest}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
            Entrar como invitado
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
