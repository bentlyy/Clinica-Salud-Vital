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
    <div className="login-page">
      <div className="login-branding">
        <div className="login-brand-orb login-brand-orb--1" />
        <div className="login-brand-orb login-brand-orb--2" />
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="login-brand-title">Salud Vital</h1>
          <p className="login-brand-subtitle">
            {t('auth.login_subtitle') || 'Sistema de gestión clínica y administración de pacientes'}
          </p>
          <div className="login-brand-features">
            {[
              { icon: '🏥', text: 'Gestión de pacientes' },
              { icon: '📅', text: 'Citas y calendario' },
              { icon: '📋', text: 'Historial clínico digital' },
              { icon: '📊', text: 'Reportes y analytics' },
            ].map((item, i) => (
              <div key={i} className="login-brand-feature">
                <span className="login-brand-feature-icon">{item.icon}</span>
                <span className="login-brand-feature-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-form-wrapper">
          <div className="login-mobile-logo">
            <div className="login-mobile-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h1 className="login-mobile-title">Salud Vital</h1>
            <p className="login-mobile-subtitle">{t('auth.login_subtitle')}</p>
          </div>

          <div className="login-card">
            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">{t('auth.email')} <span className="required">*</span></label>
                <input
                  className="ds-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder={t('auth.email_placeholder')}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.password')} <span className="required">*</span></label>
                <div className="login-password-wrapper">
                  <input
                    className="ds-input"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder={t('auth.password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-password-toggle"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {needs2FA && (
                <div className="form-group">
                  <label className="form-label">{t('auth.totp_code')} <span className="required">*</span></label>
                  <input
                    className="ds-input login-totp-input"
                    type="text"
                    value={form.totp_token}
                    onChange={(e) => setForm({ ...form, totp_token: e.target.value })}
                    placeholder={t('auth.totp_placeholder')}
                    maxLength={6}
                    autoFocus
                  />
                </div>
              )}

              {hasCaptcha && ReCAPTCHA && (
                <div className="form-group login-captcha">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                  />
                </div>
              )}

              <button
                className="login-submit-btn"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="login-submit-loading">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="login-spinner">
                      <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" />
                    </svg>
                    {t('auth.logging_in')}
                  </span>
                ) : needs2FA ? t('auth.verify_2fa') : t('auth.login_button')}
              </button>
            </form>

            <div className="login-footer">
              {tenantId && (
                <Link to={`/register?tenant=${tenantId}`} className="login-register-link">
                  {t('auth.no_account')} {t('auth.register_link')}
                </Link>
              )}
              <Link to="/forgot-password" className="login-forgot-link">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <p className="login-copyright">
            &copy; {new Date().getFullYear()} Salud Vital. Todos los derechos reservados.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes login-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-page {
          min-height: 100vh;
          display: flex;
          background-color: var(--bg-primary);
        }

        /* Left branding panel */
        .login-branding {
          flex: 1;
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(160deg, var(--ds-teal-600, #0d9488) 0%, var(--ds-teal-700, #0f766e) 50%, var(--ds-teal-800, #115e59) 100%);
          padding: 40px;
          position: relative;
          overflow: hidden;
        }

        .login-brand-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .login-brand-orb--1 {
          top: -50%;
          right: -30%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%);
        }

        .login-brand-orb--2 {
          bottom: -20%;
          left: -10%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(13,148,136,0.1) 0%, transparent 70%);
        }

        .login-brand-content {
          position: relative;
          z-index: 1;
          max-width: 400px;
          text-align: center;
        }

        .login-brand-logo {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--accent-500), var(--accent-600));
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
          box-shadow: 0 8px 32px rgba(13, 148, 136, 0.3);
        }

        .login-brand-title {
          font-family: var(--font-serif);
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .login-brand-subtitle {
          font-size: 15px;
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
          margin: 0;
        }

        .login-brand-features {
          margin-top: 44px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .login-brand-feature {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.05);
          transition: background 0.2s;
        }

        .login-brand-feature:hover {
          background: rgba(255,255,255,0.1);
        }

        .login-brand-feature-icon {
          font-size: 22px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.08);
          border-radius: var(--radius-sm);
        }

        .login-brand-feature-text {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          font-weight: 500;
        }

        /* Right form panel */
        .login-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          min-width: 0;
        }

        .login-form-wrapper {
          width: 100%;
          max-width: 420px;
        }

        .login-mobile-logo {
          text-align: center;
          margin-bottom: 36px;
        }

        .login-mobile-logo-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--accent-500), var(--accent-600));
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);
        }

        .login-mobile-title {
          font-family: var(--font-serif);
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        .login-mobile-subtitle {
          color: var(--text-muted);
          font-size: 14px;
          margin-top: 6px;
        }

        .login-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl);
          padding: 36px;
          box-shadow: var(--shadow-lg);
        }

        .login-error {
          padding: 12px 16px;
          background: var(--danger-50);
          color: var(--danger-500);
          border-radius: var(--radius-md);
          font-size: 13px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(244, 67, 54, 0.15);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .login-form .form-group {
          margin-bottom: 8px;
        }

        .login-form .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .login-form .required {
          color: var(--danger-500);
        }

        .login-form .ds-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
          border: 1.5px solid var(--border-light);
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }

        .login-form .ds-input:focus {
          border-color: var(--accent-500);
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        }

        .login-form .ds-input::placeholder {
          color: var(--text-muted);
        }

        .login-password-wrapper {
          position: relative;
        }

        .login-password-wrapper .ds-input {
          padding-right: 44px;
        }

        .login-password-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: color 0.2s, background 0.2s;
        }

        .login-password-toggle:hover {
          color: var(--text-secondary);
          background: var(--gray-100);
        }

        .login-totp-input {
          text-align: center;
          font-size: 20px !important;
          letter-spacing: 8px;
          font-family: var(--font-mono);
        }

        .login-captcha {
          display: flex;
          justify-content: center;
        }

        .login-submit-btn {
          width: 100%;
          padding: 12px 24px;
          margin-top: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, var(--accent-500), var(--accent-600));
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
        }

        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(13, 148, 136, 0.35);
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-submit-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .login-spinner {
          animation: login-spin 0.8s linear infinite;
        }

        .login-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          font-size: 13px;
        }

        .login-register-link {
          color: var(--accent-500);
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }

        .login-register-link:hover {
          color: var(--accent-600);
        }

        .login-forgot-link {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }

        .login-forgot-link:hover {
          color: var(--text-secondary);
        }

        .login-copyright {
          text-align: center;
          color: var(--text-muted);
          font-size: 12px;
          margin-top: 28px;
        }

        /* Responsive */
        @media (min-width: 900px) {
          .login-branding { display: flex !important; }
          .login-mobile-logo { display: none; }
        }

        @media (max-width: 899px) {
          .login-card {
            padding: 28px 24px;
          }
        }
      `}</style>
    </div>
  );
}
