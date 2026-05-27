import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useI18n } from '../i18n/useI18n';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';

export default function RegisterPage() {
  const { t } = useI18n();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', rut: '', phone: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) { setError(t('register.password_mismatch')); return; }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(form.password)) { setError(t('register.password_requirements')); return; }
    if (form.rut && !validateRut(cleanRut(form.rut))) { setError(t('register.rut_invalid')); return; }

    try {
      setSubmitting(true);
      await register({ email: form.email, password: form.password, rut: form.rut || undefined, phone: form.phone || undefined });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || t('register.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 480 }}>
      <div className="card" style={{ padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
          <h2>{t('register.title')}</h2>
          <p>{t('register.subtitle')}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('register.email')} <span className="required">*</span></label>
            <input name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('register.email_placeholder')} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('register.rut')}</label>
            <input name="rut" value={form.rut} onChange={(e) => setForm({ ...form, rut: formatRut(e.target.value) })} placeholder={t('register.rut_placeholder')} className="form-input" />
            <p className="form-hint">{t('register.rut_hint')}</p>
          </div>

          <div className="form-group">
            <label className="form-label">{t('register.phone')}</label>
            <input name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('register.phone_placeholder')} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('register.password')} <span className="required">*</span></label>
            <input name="password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t('register.password_placeholder')} className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('register.confirm_password')} <span className="required">*</span></label>
            <input name="confirmPassword" type="password" required minLength={8} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder={t('register.confirm_placeholder')} className="form-input" />
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}>
            {submitting ? t('register.button_loading') : t('register.button')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20 }}>
          {t('register.have_account')} <Link to="/login">{t('register.login_link_text')}</Link>
        </p>
      </div>
    </div>
  );
}
