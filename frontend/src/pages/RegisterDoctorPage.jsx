import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Combobox from '../components/Combobox';
import { useI18n } from '../i18n/useI18n';

const ROLE_CONFIG = {
  admin: { icon: '🛡️', label: 'Administradores', color: '#6c5ce7' },
  doctor: { icon: '🩺', label: 'Doctores', color: '#0984e3' },
  patient: { icon: '🧑‍⚕️', label: 'Pacientes', color: '#00b894' },
};

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

function UserRow({ user, onToggle, toggling }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: user.active ? 'var(--bg-secondary)' : 'var(--gray-100)',
      opacity: user.active ? 1 : 0.55,
      transition: 'all 0.2s',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: ROLE_CONFIG[user.role]?.color || '#ccc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 600, fontSize: '0.75rem',
      }}>
        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{user.name || '—'}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
      </div>
      <button
        onClick={() => onToggle(user.id, user.active)}
        disabled={toggling === user.id}
        style={{
          padding: '4px 10px', borderRadius: 6, border: 'none', flexShrink: 0,
          fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
          background: user.active ? '#fee2e2' : '#d1fae5',
          color: user.active ? '#dc2626' : '#059669',
          transition: 'all 0.15s',
        }}
      >
        {toggling === user.id ? '...' : user.active ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  );
}

function RoleCard({ role, users, onToggle, toggling }) {
  const cfg = ROLE_CONFIG[role] || { icon: '👤', label: role, color: '#636e72' };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: 0,
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${cfg.color}20`,
      background: `linear-gradient(180deg, ${cfg.color}08, transparent)`,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: `1px solid ${cfg.color}15`,
        background: cfg.color + '08',
      }}>
        <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: cfg.color }}>{cfg.label}</span>
        <span style={{
          marginLeft: 'auto', background: cfg.color + '20',
          color: cfg.color, padding: '1px 8px', borderRadius: 10,
          fontSize: '0.75rem', fontWeight: 600,
        }}>{users.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px', minHeight: 0 }}>
        {users.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 8px' }}>
            No hay {cfg.label.toLowerCase()} registrados
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {users.map(user => (
              <UserRow key={user.id} user={user} onToggle={onToggle} toggling={toggling} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab({ t }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, limit: 200 };
      if (search) params.search = search;
      const res = await api.get('/doctors/users', { params });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const grouped = useMemo(() => {
    const groups = { admin: [], doctor: [], patient: [] };
    for (const u of users) {
      if (groups[u.role]) groups[u.role].push(u);
    }
    return groups;
  }, [users]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
      {error && <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div>}

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="form-input"
          style={{ paddingLeft: 34, fontSize: '0.85rem' }}
        />
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
            <div>Cargando usuarios...</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {grouped.admin.length > 0 && (
            <div style={{ flexShrink: 0 }}>
              <RoleCard role="admin" users={grouped.admin} onToggle={handleToggle} toggling={toggling} />
            </div>
          )}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>
            <RoleCard role="doctor" users={grouped.doctor} onToggle={handleToggle} toggling={toggling} />
            <RoleCard role="patient" users={grouped.patient} onToggle={handleToggle} toggling={toggling} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterDoctorPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [tab, setTab] = useState('users');
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
          onClick={() => setTab('users')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: tab === 'users' ? 'var(--bg-secondary)' : 'transparent',
            color: tab === 'users' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: tab === 'users' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: tab === 'users' ? 'var(--shadow-sm)' : 'none',
          }}
        >👥 Usuarios</button>
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
      </div>

      <div className="card" style={{ padding: 24 }}>
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
