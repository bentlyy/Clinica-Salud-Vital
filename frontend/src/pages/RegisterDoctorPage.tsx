import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { extractList } from '../utils/extract-list';
import Combobox from '../components/Combobox';
import { useI18n } from '../i18n/useI18n';

const ROLE_CONFIG = {
  admin: { icon: '🛡️', color: '#6c5ce7' },
  doctor: { icon: '🩺', color: '#0984e3' },
  lab_technician: { icon: '🔬', color: '#e17055' },
  patient: { icon: '🧑‍⚕️', color: '#00b894' },
};

function InviteTab({ t, onSent }) {
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ email: '', name: '', specialty: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.email.trim()) {
      setError(t('manage_staff.email_required'));
      return;
    }
    if (role === 'doctor' && !form.specialty.trim()) {
      setError(t('manage_staff.specialty_required'));
      return;
    }

    try {
      setSubmitting(true);
      const payload = { email: form.email, role };
      if (form.name) payload.name = form.name;
      if (role === 'doctor') payload.specialty = form.specialty;
      await api.post('/doctors/invite', payload);
      onSent(form.email);
    } catch (err) {
      setError(err.response?.data?.error || t('manage_staff.invite_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">{t('manage_staff.user_type')}</label>
        <div style={{ display: 'flex', gap: 0, marginBottom: 8, background: 'var(--gray-100)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          <button type="button" onClick={() => setRole('patient')} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: role === 'patient' ? 'var(--bg-secondary)' : 'transparent',
            color: role === 'patient' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: role === 'patient' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: role === 'patient' ? 'var(--shadow-sm)' : 'none',
          }}>🧑‍⚕️ {t('manage_staff.patient_option')}</button>
          <button type="button" onClick={() => setRole('doctor')} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: role === 'doctor' ? 'var(--bg-secondary)' : 'transparent',
            color: role === 'doctor' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: role === 'doctor' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: role === 'doctor' ? 'var(--shadow-sm)' : 'none',
          }}>🩺 {t('manage_staff.doctor_option')}</button>
          <button type="button" onClick={() => setRole('lab_technician')} style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: role === 'lab_technician' ? 'var(--bg-secondary)' : 'transparent',
            color: role === 'lab_technician' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: role === 'lab_technician' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: role === 'lab_technician' ? 'var(--shadow-sm)' : 'none',
          }}>🔬 {t('manage_staff.lab_technician_option')}</button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{t('manage_staff.email_label')} <span className="required">*</span></label>
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('manage_staff.email_placeholder')} className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">{t('manage_staff.full_name')}</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={role === 'doctor' ? t('manage_staff.doctor_name_placeholder') : t('manage_staff.patient_name_placeholder')} className="form-input" />
        <p className="form-hint">{t('manage_staff.name_hint')}</p>
      </div>

      {role === 'doctor' && (
        <div className="form-group">
          <label className="form-label">{t('manage_staff.specialty_label')} <span className="required">*</span></label>
          <Combobox value={form.specialty} onChange={(val) => setForm({ ...form, specialty: val })} placeholder={t('manage_staff.specialty_placeholder')} required />
        </div>
      )}

      {role === 'lab_technician' && (
        <p className="form-hint" style={{ marginTop: 4, marginBottom: 12 }}>
          {t('manage_staff.lab_technician_description')}
        </p>
      )}
      <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg" style={{ marginTop: role === 'doctor' || role === 'lab_technician' ? 0 : 8 }}>
        {submitting ? t('manage_staff.sending') : t('manage_staff.send_invite')}
      </button>
    </form>
  );
}

function ToggleSwitch({ active, onToggle, disabled, t }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      title={active ? t('manage_staff.deactivate') : t('manage_staff.activate')}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: active ? '#00b894' : '#dfe6e9',
        transition: 'background 0.25s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: active ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.25s',
      }} />
    </button>
  );
}

function UserRow({ user, onToggle, toggling, t }) {
  const displayName = user.name || user.email || '—';
  const secondary = [user.rut, user.email].filter(Boolean).join(' · ');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 8,
      background: user.active ? '#fff' : '#f8f9fa',
      opacity: user.active ? 1 : 0.5,
      transition: 'all 0.2s',
      border: '1px solid #eee',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: ROLE_CONFIG[user.role === 'user' ? 'patient' : user.role]?.color || '#ccc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: '0.9rem',
      }}>
        {user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2d3436', lineHeight: 1.3 }}>
          {user.name || '—'}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#636e72', lineHeight: 1.4 }}>
          {secondary}
        </div>
      </div>
      <ToggleSwitch active={user.active} onToggle={() => onToggle(user.id, user.active)} disabled={toggling === user.id} t={t} />
    </div>
  );
}

function RoleCard({ role, users, onToggle, toggling, t }) {
  const cfg = ROLE_CONFIG[role] || { icon: '👤', color: '#636e72' };
  const roleLabel = t(`manage_staff.role_${role}`);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: 0,
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${cfg.color}20`,
      background: `linear-gradient(180deg, ${cfg.color}08, transparent)`,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        borderBottom: `1px solid ${cfg.color}15`,
        background: cfg.color + '08',
      }}>
        <span style={{ fontSize: '1.2rem' }}>{cfg.icon}</span>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: cfg.color }}>{roleLabel}</span>
        <span style={{
          marginLeft: 'auto', background: cfg.color + '20',
          color: cfg.color, padding: '2px 10px', borderRadius: 12,
          fontSize: '0.8rem', fontWeight: 600,
        }}>{users.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', minHeight: 0 }}>
        {users.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 8px' }}>
            {t('manage_staff.no_users_registered', { role: roleLabel.toLowerCase() })}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.map(user => (
              <UserRow key={user.id} user={user} onToggle={onToggle} toggling={toggling} t={t} />
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
      setUsers(extractList(res.data));
    } catch (err) {
      setError(err.response?.data?.error || t('manage_staff.load_users_error'));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const grouped = useMemo(() => {
    const groups = { admin: [], doctor: [], lab_technician: [], patient: [] };
    for (const u of users) {
      const key = u.role === 'user' ? 'patient' : u.role;
      if (groups[key]) groups[key].push(u);
    }
    return groups;
  }, [users]);

  const handleToggle = async (userId, currentActive) => {
    setToggling(userId);
    try {
      await api.patch(`/doctors/users/${userId}/active`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !currentActive } : u));
    } catch (err) {
      setError(err.response?.data?.error || t('manage_staff.toggle_error'));
    } finally {
      setToggling(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
      {error && <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div>}

      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('manage_staff.search')}
          className="form-input"
          style={{ paddingLeft: 34, fontSize: '0.9rem' }}
        />
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>⏳</div>
            <div>{t('manage_staff.loading')}</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {grouped.admin.length > 0 && (
            <div style={{ flexShrink: 0 }}>
              <RoleCard role="admin" users={grouped.admin} onToggle={handleToggle} toggling={toggling} t={t} />
            </div>
          )}
          {grouped.lab_technician.length > 0 && (
            <div style={{ flexShrink: 0 }}>
              <RoleCard role="lab_technician" users={grouped.lab_technician} onToggle={handleToggle} toggling={toggling} t={t} />
            </div>
          )}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>
            <RoleCard role="doctor" users={grouped.doctor} onToggle={handleToggle} toggling={toggling} t={t} />
            <RoleCard role="patient" users={grouped.patient} onToggle={handleToggle} toggling={toggling} t={t} />
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
          <h2 style={{ marginBottom: 8, color: 'var(--primary-700)' }}>{t('manage_staff.invitation_sent')}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            {t('manage_staff.invitation_sent_before')} <strong>{sent}</strong> {t('manage_staff.invitation_sent_after')}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setSent(null)} className="btn btn-primary">
              {t('manage_staff.invite_another')}
            </button>
            <button onClick={() => navigate('/admin/tenant')} className="btn btn-ghost">{t('manage_staff.back_to_panel')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ marginBottom: 8 }}>{t('manage_staff.title')}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('manage_staff.subtitle')}</p>
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
        >👥 {t('manage_staff.users_tab')}</button>
        <button
          onClick={() => setTab('invite')}
          style={{
            flex: 1, padding: '10px 16px', border: 'none', borderRadius: 6,
            background: tab === 'invite' ? 'var(--bg-secondary)' : 'transparent',
            color: tab === 'invite' ? 'var(--accent-500)' : 'var(--text-secondary)',
            fontWeight: tab === 'invite' ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem',
            transition: 'var(--transition)', boxShadow: tab === 'invite' ? 'var(--shadow-sm)' : 'none',
          }}
        >📨 {t('manage_staff.invite_tab')}</button>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {tab === 'invite' ? <InviteTab t={t} onSent={setSent} /> : <UsersTab t={t} />}
      </div>

      <div className="card card-subtle" style={{ marginTop: 20, padding: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          {t('manage_staff.deactivate_warning')}
        </p>
      </div>
    </div>
  );
}
