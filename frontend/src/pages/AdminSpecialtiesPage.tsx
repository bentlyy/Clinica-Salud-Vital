import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { getSpecialties, createSpecialty, updateSpecialty, deleteSpecialty } from '../api/specialties';

interface DoctorInfo {
  id: number;
  name: string;
  email: string;
}

interface Specialty {
  id: number;
  name: string;
  icon: string;
  description: string;
  department: string;
  procedures: string[];
  color: string;
  doctors: DoctorInfo[];
}

export default function AdminSpecialtiesPage() {
  const { t } = useI18n();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Specialty>>({});
  const [newName, setNewName] = useState('');
  const [newProcedure, setNewProcedure] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await getSpecialties();
    setSpecialties(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createSpecialty({ name: newName.trim() });
    setNewName('');
    await load();
  };

  const startEdit = (s: Specialty) => {
    setEditId(s.id);
    setEditData({ ...s, procedures: [...s.procedures] });
    setNewProcedure('');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditData({});
    setNewProcedure('');
  };

  const handleSave = async () => {
    if (!editId) return;
    const payload: any = {};
    if (editData.name !== undefined) payload.name = editData.name;
    if (editData.icon !== undefined) payload.icon = editData.icon;
    if (editData.description !== undefined) payload.description = editData.description;
    if (editData.department !== undefined) payload.department = editData.department;
    if (editData.color !== undefined) payload.color = editData.color;
    if (editData.procedures !== undefined) payload.procedures = editData.procedures;
    await updateSpecialty(editId, payload);
    cancelEdit();
    await load();
  };

  const addProcedure = () => {
    if (!newProcedure.trim() || !editData.procedures) return;
    setEditData({ ...editData, procedures: [...editData.procedures, newProcedure.trim()] });
    setNewProcedure('');
  };

  const removeProcedure = (idx: number) => {
    if (!editData.procedures) return;
    const updated = editData.procedures.filter((_, i) => i !== idx);
    setEditData({ ...editData, procedures: updated });
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.confirm_delete_specialty'))) return;
    await deleteSpecialty(id);
    await load();
  };

  if (loading) return <div className="page-container" style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1>{t('admin.specialties_title')}</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('admin.new_specialty_placeholder')}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button className="btn btn-primary" onClick={handleCreate}>{t('admin.add')}</button>
      </div>

      {specialties.map((s) => (
        <div key={s.id} className="card" style={{ marginBottom: 16, padding: 16 }}>
          {editId === s.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.name')}</label>
                  <input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                </div>
                <div style={{ width: 80 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.icon')}</label>
                  <input value={editData.icon || ''} onChange={(e) => setEditData({ ...editData, icon: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                </div>
                <div style={{ width: 110 }}>
                  <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.color')}</label>
                  <input value={editData.color || ''} onChange={(e) => setEditData({ ...editData, color: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.description')}</label>
                <textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', minHeight: 60 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.department')}</label>
                <input value={editData.department || ''} onChange={(e) => setEditData({ ...editData, department: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.procedures')}</label>
                <ul style={{ margin: '4px 0 8px', paddingLeft: 20 }}>
                  {(editData.procedures || []).map((p, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {p}
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, color: '#e74c3c' }} onClick={() => removeProcedure(i)}>&times;</button>
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newProcedure} onChange={(e) => setNewProcedure(e.target.value)} placeholder={t('admin.new_procedure_placeholder')} style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                  <button className="btn btn-primary btn-sm" onClick={addProcedure}>{t('admin.add')}</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSave}>{t('admin.save')}</button>
                <button className="btn btn-ghost" onClick={cancelEdit}>{t('admin.cancel')}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <h3 style={{ margin: 0 }}>{s.name}</h3>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: s.color, display: 'inline-block' }} />
                </div>
                {s.description && <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{s.description}</p>}
                {s.doctors.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong style={{ fontSize: 12 }}>Doctores:</strong>
                    <ul style={{ margin: '2px 0 0', paddingLeft: 20 }}>
                      {s.doctors.map((d) => <li key={d.id} style={{ fontSize: 13 }}>{d.name} {d.email ? `<${d.email}>` : ''}</li>)}
                    </ul>
                  </div>
                )}
                {s.procedures.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong style={{ fontSize: 12 }}>{t('admin.procedures')}:</strong>
                    <ul style={{ margin: '2px 0 0', paddingLeft: 20 }}>
                      {s.procedures.map((p, i) => <li key={i} style={{ fontSize: 13 }}>{p}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>{t('admin.edit')}</button>
                <button className="btn btn-ghost btn-sm" style={{ color: '#e74c3c' }} onClick={() => handleDelete(s.id)}>{t('admin.delete')}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
