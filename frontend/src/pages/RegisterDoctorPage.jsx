import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Combobox from '../components/Combobox';
import { useI18n } from '../i18n/useI18n';

export default function RegisterDoctorPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ email: '', name: '', specialty: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const payload = { email: form.email, role };
      if (form.name) payload.name = form.name;
      if (role === 'doctor') payload.specialty = form.specialty;
      await api.post('/doctors/invite', payload);
      setSent(form.email);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar invitación');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="page-container" style={{ maxWidth: 520 }}>
        <div className="card card-accent" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h2 style={{ marginBottom: 8, color: 'var(--primary-700)' }}>Invitación enviada</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Se ha enviado un correo a <strong>{sent}</strong> con el enlace para registrarse.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setSent(null); setForm({ email: '', name: '', specialty: '' }); }} className="btn btn-primary">
              Invitar a otra persona
            </button>
            <button onClick={() => navigate('/admin/tenant')} className="btn btn-ghost">Volver al panel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ marginBottom: 8 }}>Invitar Personal</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Envía un enlace de registro por correo electrónico</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          <button
            onClick={() => setRole('patient')}
            style={{
              flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
              background: role === 'patient' ? 'var(--bg-secondary)' : 'transparent',
              color: role === 'patient' ? 'var(--accent-500)' : 'var(--text-secondary)',
              fontWeight: role === 'patient' ? 600 : 400,
              cursor: 'pointer', fontSize: '0.9rem', transition: 'var(--transition)',
              boxShadow: role === 'patient' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            🧑‍⚕️ Paciente
          </button>
          <button
            onClick={() => setRole('doctor')}
            style={{
              flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
              background: role === 'doctor' ? 'var(--bg-secondary)' : 'transparent',
              color: role === 'doctor' ? 'var(--accent-500)' : 'var(--text-secondary)',
              fontWeight: role === 'doctor' ? 600 : 400,
              cursor: 'pointer', fontSize: '0.9rem', transition: 'var(--transition)',
              boxShadow: role === 'doctor' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            🩺 Doctor
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo electrónico <span className="required">*</span></label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="correo@ejemplo.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input
              type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={role === 'doctor' ? 'Dr. Nombre' : 'Nombre del paciente'}
              className="form-input"
            />
            <p className="form-hint">Opcional. Se usará para personalizar el correo.</p>
          </div>

          {role === 'doctor' && (
            <div className="form-group">
              <label className="form-label">Especialidad <span className="required">*</span></label>
              <Combobox
                value={form.specialty}
                onChange={(val) => setForm({ ...form, specialty: val })}
                placeholder="Seleccionar especialidad"
                required
              />
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: role === 'doctor' ? 0 : 8 }}>
            {submitting ? 'Enviando...' : 'Enviar invitación'}
          </button>
        </form>
      </div>

      <div className="card card-subtle" style={{ marginTop: 20, padding: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          El destinatario recibirá un correo con un enlace para crear su cuenta.
          El enlace expira en 7 días.
        </p>
      </div>
    </div>
  );
}