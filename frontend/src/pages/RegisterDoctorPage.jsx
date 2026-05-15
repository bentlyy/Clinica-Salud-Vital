import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { formatRut, validateRut, cleanRut } from '../utils/rut.js';
import Combobox from '../components/Combobox';

export default function RegisterDoctorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', specialty: '', email: '', rut: '', phone: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.rut && !validateRut(cleanRut(form.rut))) { setError('RUT inválido'); return; }

    try {
      setSubmitting(true);
      const res = await api.post('/doctors/register', { ...form, rut: form.rut ? cleanRut(form.rut) : undefined });
      setCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error registrando doctor');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="page-container">
        <h1 style={{ color: 'var(--primary-700)', marginBottom: 8 }}>✅ Doctor Registrado</h1>
        <div className="card card-subtle" style={{ marginBottom: 20 }}>
          <p><strong>Nombre:</strong> {created.doctor.name}</p>
          <p><strong>Especialidad:</strong> {created.doctor.specialty}</p>
          <p><strong>Email:</strong> {created.email}</p>
        </div>

        <div className="alert alert-warning" style={{ borderLeft: '4px solid var(--warning-500)' }}>
          <h3 style={{ marginBottom: 8 }}>🔑 Credenciales Generadas</h3>
          <p><strong>Email:</strong> <code>{created.email}</code></p>
          <p><strong>Contraseña temporal:</strong> <code style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4, fontSize: 16 }}>{created.tempPassword}</code></p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Copia estas credenciales y envíalas al doctor. También fueron enviadas por email.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={() => { setCreated(null); setForm({ name: '', specialty: '', email: '', rut: '', phone: '' }); }} className="btn btn-primary">
            Registrar otro doctor
          </button>
          <button onClick={() => navigate('/')} className="btn btn-ghost">Volver al Inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 600 }}>
      <h1 style={{ marginBottom: 8 }}>Registrar Doctor</h1>
      <p style={{ marginBottom: 24 }}>Completa los datos. Se generará automáticamente su cuenta y credenciales por email.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>
        <div className="form-group">
          <label className="form-label">Nombre completo <span className="required">*</span></label>
          <input name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Juan Pérez" className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">Especialidad <span className="required">*</span></label>
          <Combobox
            value={form.specialty}
            onChange={(val) => setForm({ ...form, specialty: val })}
            placeholder="Cardiología"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email <span className="required">*</span></label>
          <input name="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="doctor@clinic.com" className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">RUT</label>
          <input name="rut" value={form.rut} onChange={(e) => setForm({ ...form, rut: formatRut(e.target.value) })} placeholder="12.345.678-5" className="form-input" />
        </div>

        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 1234 5678" className="form-input" />
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}>
          {submitting ? 'Registrando...' : 'Registrar Doctor'}
        </button>
      </form>
    </div>
  );
}
