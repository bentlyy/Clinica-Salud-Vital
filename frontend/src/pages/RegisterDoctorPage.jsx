import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Combobox from '../components/Combobox';
import { useI18n } from '../i18n/useI18n';

function InviteTab({ t, onSent }) {
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ email: '', name: '', specialty: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const payload = { email: form.email, role };
      if (form.name) payload.name = form.name;
      if (role === 'doctor') payload.specialty = form.specialty;
      await api.post('/doctors/invite', payload);
      onSent(form.email);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar invitación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Tipo de usuario</label>
        <div style={{ display: 'flex', gap: 0, marginBottom: 8, background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          <button type="button" onClick={() => setRole('patient')} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: role === 'patient' ? 'var(--bg-secondary)' : 'transparent',
            color: role === 'patient' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: role === 'patient' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: role === 'patient' ? 'var(--shadow-sm)' : 'none',
          }}>🧑‍⚕️ Paciente</button>
          <button type="button" onClick={() => setRole('doctor')} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: role === 'doctor' ? 'var(--bg-secondary)' : 'transparent',
            color: role === 'doctor' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: role === 'doctor' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: role === 'doctor' ? 'var(--shadow-sm)' : 'none',
          }}>🩺 Doctor</button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Correo electrónico <span className="required">*</span></label>
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">Nombre completo</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={role === 'doctor' ? 'Dr. Nombre' : 'Nombre del paciente'} className="form-input" />
        <p className="form-hint">Opcional. Se usará para personalizar el correo.</p>
      </div>

      {role === 'doctor' && (
        <div className="form-group">
          <label className="form-label">Especialidad <span className="required">*</span></label>
          <Combobox value={form.specialty} onChange={(val) => setForm({ ...form, specialty: val })} placeholder="Seleccionar especialidad" required />
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: role === 'doctor' ? 0 : 8 }}>
        {submitting ? 'Enviando...' : 'Enviar invitación'}
      </button>
    </form>
  );
}

function UsersTab({ t }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [toggling, setToggling] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/doctors/users', { params });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggle = async (userId, currentActive) => {
    setToggling(userId);
    try {
      await api.patch(`/doctors/users/${userId}/active`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !currentActive } : u));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setToggling(null);
    }
  };

  if (loading && users.length === 0) return <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>Cargando usuarios...</p>;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre o email" className="form-input"
          style={{ flex: 1, minWidth: 200 }}
        />
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="form-input" style={{ width: 'auto' }}>
          <option value="">Todos los roles</option>
          <option value="patient">Pacientes</option>
          <option value="doctor">Doctores</option>
          <option value="admin">Administradores</option>
        </select>
      </div>

      {users.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>No hay usuarios registrados</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ opacity: user.active ? 1 : 0.6 }}>
                    <td>{user.name || '—'}</td>
                    <td>{user.email}</td>
                    <td><span className={`badge badge-${user.role}`}>{user.role}</span></td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: user.active ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 500, fontSize: '0.85rem',
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: user.active ? 'var(--success)' : 'var(--danger)', display: 'inline-block' }} />
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggle(user.id, user.active)}
                        disabled={toggling === user.id}
                        className={`btn btn-sm ${user.active ? 'btn-danger' : 'btn-success'}`}
                      >
                        {toggling === user.id ? '...' : user.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn btn-sm">Anterior</button>
              <span style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="btn btn-sm">Siguiente</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RegisterDoctorPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tab, setTab] = useState('invite');
  const [sent, setSent] = useState(null);

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
            <button onClick={() => setSent(null)} className="btn btn-primary">
              Invitar a otra persona
            </button>
            <button onClick={() => navigate('/admin/tenant')} className="btn btn-ghost">Volver al panel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ marginBottom: 8 }}>Gestionar Personal</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Invita nuevos miembros o administra los existentes</p>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
        <button
          onClick={() => setTab('invite')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: tab === 'invite' ? 'var(--bg-secondary)' : 'transparent',
            color: tab === 'invite' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: tab === 'invite' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: tab === 'invite' ? 'var(--shadow-sm)' : 'none',
          }}
        >📨 Invitar</button>
        <button
          onClick={() => setTab('users')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: tab === 'users' ? 'var(--bg-secondary)' : 'transparent',
            color: tab === 'users' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: tab === 'users' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: tab === 'users' ? 'var(--shadow-sm)' : 'none',
          }}
        >👥 Usuarios</button>
      </div>

      <div className="card" style={{ padding: 32 }}>
        {tab === 'invite' ? <InviteTab t={t} onSent={setSent} /> : <UsersTab t={t} />}
      </div>

      <div className="card card-subtle" style={{ marginTop: 20, padding: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          Al desactivar un usuario, este no podrá iniciar sesión ni realizar acciones en el sistema.
          Los datos del usuario se conservan.
        </p>
      </div>
    </div>
  );
}
