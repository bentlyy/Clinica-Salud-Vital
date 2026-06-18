import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import ReCAPTCHA from 'react-google-recaptcha';
import { sanitizeError } from '../utils/error-sanitizer.js';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const hasCaptcha = Boolean(RECAPTCHA_SITE_KEY);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant');
  const { t } = useI18n();
  const recaptchaRef = useRef(null);
  const [form, setForm] = useState({ email: '', password: '', totp_token: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);

  const getCaptchaToken = () => {
    if (!hasCaptcha) return undefined;
    return recaptchaRef.current?.getValue();
  };

  const handleSubmit = async (e) => {
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
        navigate('/super-admin');
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
      if (err.response?.data?.code === '2FA_REQUIRED' || err.response?.data?.error === '2FA token required') {
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
    <div className="page-container" style={{ maxWidth: 440 }}>
      <div className="card" style={{ padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2>{t('auth.login_title')}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{t('auth.login_subtitle')}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.email')} <span className="required">*</span></label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t('auth.email_placeholder')}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password')} <span className="required">*</span></label>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t('auth.password_placeholder')}
              className="form-input"
            />
          </div>

          {needs2FA && (
            <div className="form-group">
              <label className="form-label">{t('auth.totp_code')} <span className="required">*</span></label>
              <input
                name="totp_token"
                type="text"
                required
                value={form.totp_token}
                onChange={(e) => setForm({ ...form, totp_token: e.target.value })}
                placeholder={t('auth.totp_placeholder')}
                className="form-input"
                maxLength={6}
                autoFocus
              />
            </div>
          )}

          {hasCaptcha && ReCAPTCHA && (
            <div className="form-group" style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
              />
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}>
            {submitting ? t('auth.logging_in') : needs2FA ? t('auth.verify_2fa') : t('auth.login_button')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
          {tenantId && (
            <p style={{ marginBottom: 8 }}>
              {t('auth.no_account')} <Link to={`/register?tenant=${tenantId}`}>{t('auth.register_link')}</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
