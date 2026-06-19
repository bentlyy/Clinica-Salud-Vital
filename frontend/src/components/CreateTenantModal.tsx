import { useState } from 'react';
import { adminCreateTenant } from '../api/super-admin';
import { useI18n } from '../i18n/useI18n';
import CoreModal from './CoreModal';

export default function CreateTenantModal({ isOpen, onClose, onCreated }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: '',
    domain: '',
    locale: 'es',
    timezone: 'America/Santiago',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState({});

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio';
    if (!form.domain.trim()) errors.domain = 'El dominio es obligatorio';
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      await adminCreateTenant(form);
      setForm({ name: '', domain: '', locale: 'es', timezone: 'America/Santiago', active: true });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear tenant');
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setBool = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  return (
    <CoreModal isOpen={isOpen} onClose={onClose} title={t('superadmin.create_tenant')}>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert--error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="form-group">
          <label>{t('superadmin.name')} *</label>
          <input
            type="text" className={`input ${validation.name ? 'input--error' : ''}`}
            value={form.name} onChange={set('name')} placeholder="Ej: Clínica Salud"
            autoFocus
          />
          {validation.name && <span className="field-error">{validation.name}</span>}
        </div>

        <div className="form-group">
          <label>{t('superadmin.domain')} *</label>
          <input
            type="text" className={`input ${validation.domain ? 'input--error' : ''}`}
            value={form.domain} onChange={set('domain')} placeholder="Ej: clinicasalud"
          />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Se usará como: https://{form.domain || '...'}.misistema.com</span>
          {validation.domain && <span className="field-error">{validation.domain}</span>}
        </div>

        <div className="form-group">
          <label>{t('super_admin.tenant_locale_label')}</label>
          <select className="input" value={form.locale} onChange={set('locale')}>
            <option value="es">{t('super_admin.spanish')}</option>
            <option value="en">{t('super_admin.english')}</option>
            <option value="pt">{t('super_admin.portuguese')}</option>
            <option value="fr">{t('super_admin.french')}</option>
          </select>
        </div>

        <div className="form-group">
          <label>{t('saas.timezone')}</label>
          <input type="text" className="input" value={form.timezone} onChange={set('timezone')} />
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.active} onChange={setBool('active')} />
            {t('superadmin.active_label')}
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn--outline" onClick={onClose}>{t('admin.cancel')}</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? t('superadmin.saving') : t('superadmin.create_tenant')}
          </button>
        </div>
      </form>
    </CoreModal>
  );
}
