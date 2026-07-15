import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import ReCAPTCHA from 'react-google-recaptcha';
import { isAxiosError } from 'axios';
import { sanitizeError } from '../utils/error-sanitizer';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const hasCaptcha = Boolean(RECAPTCHA_SITE_KEY);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const { t } = useI18n();
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [form, setForm] = useState({ email: '', password: '', totp_token: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const getCaptchaToken = () => {
    if (!hasCaptcha) return undefined;
    return recaptchaRef.current?.getValue();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      setError(t('auth.captcha_required'));
      return;
    }

    try {
      setSubmitting(true);
      const user = await login(form.email, form.password, needs2FA ? form.totp_token : undefined, captcha_token, tenantId);
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

  return (
    <div className="login7-page">
      <div className="login7-deco login7-deco-1" />
      <div className="login7-deco login7-deco-2" />
      <div className="login7-deco login7-deco-3" />

      <div className="login7-card">
        <div className="login7-visual">
          <div className="login7-visual-top">
            <div className="login7-status-badge">
              <span className="login7-pulse-dot" />
              Sistema activo
            </div>
          </div>
          <div className="login7-visual-main">
            <div className="login7-medical-icon">🩺</div>
            <h2 className="login7-visual-title">Tu salud, nuestra prioridad</h2>
            <p className="login7-visual-desc">
              Plataforma integral con historiales clínicos, laboratorio, analytics predictivos y más.
            </p>
          </div>
          <div className="login7-visual-bottom">
            <div className="login7-info-card">
              <div className="login7-info-val">12k+</div>
              <div className="login7-info-label">Pacientes atendidos</div>
            </div>
            <div className="login7-info-card">
              <div className="login7-info-val">98%</div>
              <div className="login7-info-label">Satisfacción</div>
            </div>
            <div className="login7-info-card">
              <div className="login7-info-val">24/7</div>
              <div className="login7-info-label">Disponible</div>
            </div>
          </div>
        </div>

        <div className="login7-form-side">
          <div className="login7-mobile-logo">
            <div className="login7-brand-icon">💚</div>
            <span className="login7-brand-name">Salud Vital</span>
          </div>

          <div className="login7-form-brand">
            <div className="login7-brand-icon">💚</div>
            <span className="login7-brand-name">Salud Vital</span>
          </div>

          <h2 className="login7-form-title">{t('auth.login_title') || 'Bienvenido de nuevo'}</h2>
          <p className="login7-form-subtitle">{t('auth.login_subtitle') || 'Ingresa para acceder a tu panel de control'}</p>

          {error && (
            <div className="login7-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login7-field">
              <label className="login7-label">{t('auth.email')}</label>
              <div className="login7-input-wrap">
                <span className="login7-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  className="login7-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder={t('auth.email_placeholder')}
                  autoFocus
                />
              </div>
            </div>

            <div className="login7-field">
              <label className="login7-label">{t('auth.password')}</label>
              <div className="login7-input-wrap">
                <span className="login7-input-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  className="login7-input"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder={t('auth.password_placeholder')}
                />
                <button
                  type="button"
                  className="login7-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {needs2FA && (
              <div className="login7-field login7-totp-box">
                <label className="login7-label">{t('auth.totp_code')}</label>
                <div className="login7-input-wrap">
                  <input
                    className="login7-input login7-totp-input"
                    type="text"
                    value={form.totp_token}
                    onChange={(e) => setForm({ ...form, totp_token: e.target.value })}
                    placeholder={t('auth.totp_placeholder')}
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {hasCaptcha && ReCAPTCHA && (
              <div className="login7-field login7-captcha">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                />
              </div>
            )}

            <div className="login7-opts">
              <label className="login7-chk">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Recordarme
              </label>
              <Link to="/forgot-password" className="login7-forgot-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button type="submit" className="login7-btn-submit" disabled={submitting}>
              {submitting ? (
                <span className="login7-submit-loading">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="login7-spinner">
                    <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" />
                  </svg>
                  {t('auth.logging_in')}
                </span>
              ) : needs2FA ? t('auth.verify_2fa') : t('auth.login_button')}
            </button>
          </form>

          <div className="login7-sep">{t('auth.or') || 'o'}</div>

          <Link to="/booking" className="login7-btn-guest">
            🎫 {t('auth.guest_booking') || 'Reservar como invitado'}
          </Link>

          <p className="login7-signup">
            {t('auth.no_account')}{' '}
            {tenantId ? (
              <Link to={`/register?tenant=${tenantId}`}>{t('auth.register_link')}</Link>
            ) : (
              <Link to="/register">{t('auth.register_link')}</Link>
            )}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes login7-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes login7-pulse-ring {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.8); }
        }
        @keyframes login7-ring-expand {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(2); }
        }

        .login7-page {
          min-height: 100vh;
          background: #f0fdfa;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .login7-deco {
          position: fixed;
          border-radius: 50%;
          opacity: 0.5;
          z-index: 0;
          pointer-events: none;
        }
        .login7-deco-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #99f6e4 0%, transparent 70%);
          top: -150px; right: -100px;
        }
        .login7-deco-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #ccfbf1 0%, transparent 70%);
          bottom: -120px; left: -80px;
        }
        .login7-deco-3 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, #5eead4 0%, transparent 70%);
          top: 50%; left: 30%; opacity: 0.2;
        }

        .login7-card {
          position: relative;
          z-index: 1;
          display: flex;
          width: 920px;
          min-height: 540px;
          background: white;
          border-radius: 28px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        /* Left visual panel */
        .login7-visual {
          flex: 1.15;
          background: linear-gradient(160deg, #0d9488 0%, #0f766e 50%, #115e59 100%);
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .login7-visual::before {
          content: '';
          position: absolute;
          width: 300px; height: 300px;
          border: 2px solid rgba(255,255,255,0.08);
          border-radius: 50%;
          top: -80px; right: -80px;
        }
        .login7-visual::after {
          content: '';
          position: absolute;
          width: 200px; height: 200px;
          border: 2px solid rgba(255,255,255,0.06);
          border-radius: 50%;
          bottom: 20px; left: -60px;
        }

        .login7-visual-top { position: relative; z-index: 1; }

        .login7-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 24px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
        }
        .login7-pulse-dot {
          width: 8px; height: 8px;
          background: #34d399;
          border-radius: 50%;
          animation: login7-pulse-ring 2s infinite;
          position: relative;
        }
        .login7-pulse-dot::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid #34d399;
          animation: login7-ring-expand 2s infinite;
        }

        .login7-visual-main {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .login7-medical-icon {
          width: 80px; height: 80px;
          background: rgba(255,255,255,0.15);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          margin-bottom: 24px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .login7-visual-title {
          color: white;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .login7-visual-desc {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          line-height: 1.5;
          max-width: 280px;
        }

        .login7-visual-bottom {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 12px;
        }
        .login7-info-card {
          flex: 1;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 14px;
          backdrop-filter: blur(8px);
        }
        .login7-info-val {
          font-size: 20px;
          font-weight: 700;
          color: white;
        }
        .login7-info-label {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          margin-top: 2px;
        }

        /* Right form panel */
        .login7-form-side {
          flex: 1;
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .login7-form-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
        }
        .login7-mobile-logo {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 32px;
        }
        .login7-brand-icon {
          width: 34px; height: 34px;
          background: #0d9488;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .login7-brand-name {
          font-size: 17px;
          font-weight: 700;
          color: #134e4a;
        }

        .login7-form-title {
          font-size: 24px;
          font-weight: 700;
          color: #134e4a;
          margin-bottom: 4px;
        }
        .login7-form-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 30px;
        }

        .login7-error {
          padding: 12px 16px;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(244, 67, 54, 0.15);
        }

        .login7-field {
          margin-bottom: 18px;
        }
        .login7-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 6px;
        }
        .login7-input-wrap {
          position: relative;
        }
        .login7-input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          width: 16px; height: 16px;
          color: #9ca3af;
          display: flex;
          align-items: center;
        }
        .login7-input-icon svg {
          width: 100%; height: 100%;
        }
        .login7-input {
          width: 100%;
          padding: 12px 14px 12px 40px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          color: #1f2937;
          background: #f9fafb;
          outline: none;
          transition: all 0.2s;
        }
        .login7-input::placeholder { color: #9ca3af; }
        .login7-input:focus {
          border-color: #0d9488;
          background: white;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        }

        .login7-pw-toggle {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 12px;
          font-family: inherit;
          font-weight: 500;
        }
        .login7-pw-toggle:hover { color: #0d9488; }

        .login7-totp-box .login7-input {
          text-align: center;
          font-size: 26px;
          letter-spacing: 10px;
          font-weight: 700;
          font-family: 'SF Mono', 'Fira Code', monospace;
          color: #0d9488;
        }

        .login7-captcha {
          display: flex;
          justify-content: center;
        }

        .login7-opts {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
          font-size: 12px;
        }
        .login7-chk {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          cursor: pointer;
        }
        .login7-chk input { accent-color: #0d9488; }
        .login7-forgot-link {
          color: #0d9488;
          text-decoration: none;
          font-weight: 500;
        }
        .login7-forgot-link:hover { text-decoration: underline; }

        .login7-btn-submit {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #0d9488, #0f766e);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.3s;
        }
        .login7-btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.35);
        }
        .login7-btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .login7-submit-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .login7-spinner {
          animation: login7-spin 0.8s linear infinite;
        }

        .login7-sep {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 22px 0;
          font-size: 11px;
          color: #d1d5db;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .login7-sep::before, .login7-sep::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .login7-btn-guest {
          width: 100%;
          padding: 12px;
          background: white;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          color: #6b7280;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          text-decoration: none;
          display: block;
          box-sizing: border-box;
        }
        .login7-btn-guest:hover {
          border-color: #0d9488;
          color: #0d9488;
          background: #f0fdfa;
        }

        .login7-signup {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #9ca3af;
        }
        .login7-signup a {
          color: #0d9488;
          font-weight: 600;
          text-decoration: none;
        }
        .login7-signup a:hover { text-decoration: underline; }

        /* Responsive */
        @media (max-width: 900px) {
          .login7-visual { display: none; }
          .login7-card {
            width: 92%;
            max-width: 420px;
            min-height: auto;
            border-radius: 20px;
          }
          .login7-form-side { padding: 36px 28px; }
          .login7-form-brand { display: none; }
          .login7-mobile-logo { display: flex; }
        }
      `}</style>
    </div>
  );
}
