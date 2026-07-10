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
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--background)' }}>
      {/* Left panel - branding */}
      <div style={{
        flex: 1,
        display: 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)',
        padding: 40,
        position: 'relative',
        overflow: 'hidden',
      }} className="login-branding">
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-30%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 400, textAlign: 'center' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Clinic</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            {t('auth.login_subtitle') || 'Sistema de gestión clínica y administración de pacientes'}
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              { icon: '🏥', text: 'Gestión de pacientes' },
              { icon: '📅', text: 'Citas y calendario' },
              { icon: '📋', text: 'Historial clínico digital' },
              { icon: '📊', text: 'Reportes y analytics' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minWidth: 0,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }} className="login-mobile-logo">
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Clinic</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{t('auth.login_subtitle')}</p>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            boxShadow: 'var(--shadow-lg)',
          }}>
            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius)',
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.email')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder={t('auth.email_placeholder')}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.password')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder={t('auth.password_placeholder')}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      padding: 4,
                    }}
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
                  <label className="form-label">{t('auth.totp_code')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    className="input"
                    type="text"
                    value={form.totp_token}
                    onChange={(e) => setForm({ ...form, totp_token: e.target.value })}
                    placeholder={t('auth.totp_placeholder')}
                    maxLength={6}
                    autoFocus
                    style={{ textAlign: 'center', fontSize: 20, letterSpacing: 8 }}
                  />
                </div>
              )}
              {hasCaptcha && ReCAPTCHA && (
                <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                  />
                </div>
              )}
              <button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={submitting}
                style={{ width: '100%', marginTop: 8 }}
              >
                {submitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" />
                    </svg>
                    {t('auth.logging_in')}
                  </span>
                ) : needs2FA ? t('auth.verify_2fa') : t('auth.login_button')}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, fontSize: 13 }}>
              {tenantId && (
                <Link to={`/register?tenant=${tenantId}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>
                  {t('auth.register_link')}
                </Link>
              )}
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 24 }}>
            &copy; {new Date().getFullYear()} Clinic. Todos los derechos reservados.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (min-width: 900px) {
          .login-branding { display: flex !important; }
          .login-mobile-logo { display: none; }
        }
      `}</style>
    </div>
  );
}
