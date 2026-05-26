import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';
import Combobox from '../components/Combobox';
import { useI18n } from '../i18n/useI18n';

export default function RegisterDoctorPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', specialty: '', email: '', rut: '', phone: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.rut && !validateRut(cleanRut(form.rut))) { setError(t('register.rut_invalid')); return; }

    try {
      setSubmitting(true);
      const res = await api.post('/doctors/register', { ...form, rut: form.rut ? cleanRut(form.rut) : undefined });
      setCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('register_doctor.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="page-container">
        <h1 style={{ color: 'var(--primary-700)', marginBottom: 8 }}>{t('register_doctor.title')}</h1>
        <div className="card card-subtle" style={{ marginBottom: 20 }}>
          <p><strong>{t('register_doctor.name_label')}:</strong> {created.doctor.name}</p>
          <p><strong>{t('register_doctor.specialty_label')}:</strong> {created.doctor.specialty}</p>
          <p><strong>{t('register_doctor.email_label')}:</strong> {created.email}</p>
        </div>

        <div className="alert alert-warning" style={{ borderLeft: '4px solid var(--warning-500)' }}>
          <h3 style={{ marginBottom: 8 }}>{t('register_doctor.success')}</h3>
          <p><strong>{t('register_doctor.temp_password_label', { password: created.tempPassword })}:</strong> <code style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4, fontSize: 16 }}>{created.tempPassword}</code></p>
          <p style={{ fontSize: 13, marginTop: 8 }}>{t('register_doctor.copy_credentials')} {t('register_doctor.email_sent')}</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={() => { setCreated(null); setForm({ name: '', specialty: '', email: '', rut: '', phone: '' }); }} className="btn btn-primary">
            {t('register_doctor.submit')}
          </button>
          <button onClick={() => navigate('/')} className="btn btn-ghost">{t('booking.back_home')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 600 }}>
      <h1 style={{ marginBottom: 8 }}>{t('register_doctor.title')}</h1>
      <p style={{ marginBottom: 24 }}>{t('register_doctor.subtitle')}</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>
        <div className="form-group">
          <label className="form-label">{t('register_doctor.name_label')} <span className="required">*</span></label>
          <input name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('register_doctor.name_placeholder')} className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">{t('register_doctor.specialty_label')} <span className="required">*</span></label>
          <Combobox
            value={form.specialty}
            onChange={(val) => setForm({ ...form, specialty: val })}
            placeholder={t('register_doctor.specialty_placeholder')}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('register_doctor.email_label')} <span className="required">*</span></label>
          <input name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('register_doctor.email_placeholder')} className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">{t('register_doctor.rut_label')}</label>
          <input name="rut" value={form.rut} onChange={(e) => setForm({ ...form, rut: formatRut(e.target.value) })} placeholder={t('register_doctor.rut_placeholder')} className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">{t('register_doctor.phone_label')}</label>
          <input name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('register_doctor.phone_placeholder')} className="form-input" />
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}>
          {submitting ? t('register_doctor.submitting') : t('register_doctor.submit')}
        </button>
      </form>
    </div>
  );
}
