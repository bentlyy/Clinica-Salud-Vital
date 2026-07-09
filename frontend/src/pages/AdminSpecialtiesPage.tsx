import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { getSpecialties, createSpecialty, updateSpecialty, deleteSpecialty } from '../api/specialties';
import { logger } from '../utils/logger';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';
import Alert from '../components/ui/Alert';

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
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Specialty>>({});
  const [newName, setNewName] = useState('');
  const [newProcedure, setNewProcedure] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSpecialties();
      setSpecialties(data);
    } catch (err: unknown) {
      logger.error('Failed to load specialties', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError(null);
    try {
      await createSpecialty({ name: newName.trim() });
      setNewName('');
      await load();
    } catch (err: unknown) {
      logger.error('Failed to create specialty', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_create'));
    }
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
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (editData.name !== undefined) payload.name = editData.name;
      if (editData.icon !== undefined) payload.icon = editData.icon;
      if (editData.description !== undefined) payload.description = editData.description;
      if (editData.department !== undefined) payload.department = editData.department;
      if (editData.color !== undefined) payload.color = editData.color;
      if (editData.procedures !== undefined) payload.procedures = editData.procedures;
      await updateSpecialty(editId, payload);
      cancelEdit();
      await load();
    } catch (err: unknown) {
      logger.error('Failed to update specialty', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_update'));
    }
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
    setError(null);
    try {
      await deleteSpecialty(id);
      await load();
    } catch (err: unknown) {
      logger.error('Failed to delete specialty', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_delete'));
    }
  };

  if (loading) return <div className="text-center" style={{ padding: '2rem' }}>{t('admin.loading')}</div>;

  return (
    <PageContainer>
      <PageHeader title={t('admin.specialties_title')} />

      {error && <Alert variant="error">{error}</Alert>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('admin.new_specialty_placeholder')}
          className="ds-input"
          style={{ flex: 1 }}
        />
        <Button variant="primary" onClick={handleCreate}>{t('admin.add')}</Button>
      </div>

      {specialties.length === 0 && !loading ? (
        <div className="ds-table-empty">
          <div className="ds-table-empty-icon">🏥</div>
          <div className="ds-table-empty-title">{t('admin.no_specialties')}</div>
        </div>
      ) : (
        specialties.map((s) => (
          <Card key={s.id} style={{ marginBottom: 16 }}>
            {editId === s.id ? (
              <div className="flex-col" style={{ gap: 12 }}>
                <div className="flex-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <label className="ds-label">{t('admin.name')}</label>
                    <input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="ds-input" />
                  </div>
                  <div style={{ width: 80 }}>
                    <label className="ds-label">{t('admin.icon')}</label>
                    <input value={editData.icon || ''} onChange={(e) => setEditData({ ...editData, icon: e.target.value })} className="ds-input" />
                  </div>
                  <div style={{ width: 110 }}>
                    <label className="ds-label">{t('admin.color')}</label>
                    <input value={editData.color || ''} onChange={(e) => setEditData({ ...editData, color: e.target.value })} className="ds-input" />
                  </div>
                </div>
                <div>
                  <label className="ds-label">{t('admin.description')}</label>
                  <textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="ds-input" style={{ minHeight: 60 }} />
                </div>
                <div>
                  <label className="ds-label">{t('admin.department')}</label>
                  <input value={editData.department || ''} onChange={(e) => setEditData({ ...editData, department: e.target.value })} className="ds-input" />
                </div>
                <div>
                  <label className="ds-label">{t('admin.procedures')}</label>
                  <ul className="ul-sm" style={{ margin: '4px 0 8px' }}>
                    {(editData.procedures || []).map((p, i) => (
                      <li key={i} className="li-sm">
                        {p}
                        <Button variant="ghost" size="sm" onClick={() => removeProcedure(i)} style={{ marginLeft: 8, color: 'var(--ds-danger-500)' }}>&times;</Button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex-row" style={{ gap: 8 }}>
                    <input value={newProcedure} onChange={(e) => setNewProcedure(e.target.value)} placeholder={t('admin.new_procedure_placeholder')} className="ds-input" style={{ flex: 1 }} />
                    <Button variant="primary" size="sm" onClick={addProcedure}>{t('admin.add')}</Button>
                  </div>
                </div>
                <div className="flex-row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                  <Button variant="primary" onClick={handleSave}>{t('admin.save')}</Button>
                  <Button variant="ghost" onClick={cancelEdit}>{t('admin.cancel')}</Button>
                </div>
              </div>
            ) : (
              <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div className="flex-row" style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="icon-lg">{s.icon}</span>
                    <h3 className="m-0">{s.name}</h3>
                    <span className="color-dot" style={{ backgroundColor: s.color }} />
                  </div>
                  {s.description && <p className="text-sm text-secondary">{s.description}</p>}
                  {s.doctors.length > 0 && (
                    <div className="mt-sm">
                      <strong className="ds-label">{t('admin.doctors')}:</strong>
                      <ul className="ul-sm">
                        {s.doctors.map((d) => <li key={d.id} className="li-sm">{d.name} {d.email ? `<${d.email}>` : ''}</li>)}
                      </ul>
                    </div>
                  )}
                  {s.procedures.length > 0 && (
                    <div className="mt-sm">
                      <strong className="ds-label">{t('admin.procedures')}:</strong>
                      <ul className="ul-sm">
                        {s.procedures.map((p, i) => <li key={i} className="li-sm">{p}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex-row" style={{ gap: 8 }}>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(s)}>{t('admin.edit')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--ds-danger-500)' }}>{t('admin.delete')}</Button>
                </div>
              </div>
            )}
          </Card>
        ))
      )}
    </PageContainer>
  );
}
