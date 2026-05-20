import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', totp_token: '' });
   const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const user = await login(form.email, form.password, needs2FA ? form.totp_token : undefined);
      if (user.role === 'admin') {
        navigate('/admin/analytics');
      } else if (user.role === 'doctor') {
        navigate('/doctor/panel');
      } else {
        navigate('/booking');
      }
    } catch (err) {
      if (err.response?.data?.error === '2FA token required') {
        setNeeds2FA(true);
      } else {
        setError(err.response?.data?.error || 'Credenciales inválidas');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 440 }}>
      <div className="card" style={{ padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <h2>Iniciar Sesión</h2>
          <p>Ingresa a tu cuenta de Clínica Salud Vital</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email <span className="required">*</span></label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tu@email.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña <span className="required">*</span></label>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Tu contraseña"
              className="form-input"
            />
          </div>

          {needs2FA && (
            <div className="form-group">
              <label className="form-label">Código 2FA <span className="required">*</span></label>
              <input
                name="totp_token"
                type="text"
                required
                value={form.totp_token}
                onChange={(e) => setForm({ ...form, totp_token: e.target.value })}
                placeholder="Código de 6 dígitos"
                className="form-input"
                maxLength={6}
                autoFocus
              />
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}>
            {submitting ? 'Ingresando...' : needs2FA ? 'Verificar 2FA' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
          <p style={{ marginBottom: 8 }}>
            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          </p>
          <p>
            o <Link to="/booking">reserva como invitado</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
