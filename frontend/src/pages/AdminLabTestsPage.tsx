import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { getLabTests, createLabTest, updateLabTest, deleteLabTest } from '../api/laboratory';
import { logger } from '../utils/logger';

interface LabTest {
  id: number;
  name: string;
  description: string | null;
  code: string | null;
  category: string | null;
  unit: string | null;
  reference_min: number | null;
  reference_max: number | null;
  price: number;
  active: boolean;
}

export default function AdminLabTestsPage() {
  const { t } = useI18n();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<LabTest>>({});
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLabTests({ active: 'all' });
      setTests(data);
    } catch (err: unknown) {
      logger.error('Failed to load lab tests', err);
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
      await createLabTest({ name: newName.trim(), category: newCategory.trim() || undefined });
      setNewName('');
      setNewCategory('');
      await load();
    } catch (err: unknown) {
      logger.error('Failed to create lab test', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_create'));
    }
  };

  const startEdit = (test: LabTest) => {
    setEditId(test.id);
    setEditData({ ...test });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!editId) return;
    setError(null);
    try {
      await updateLabTest(editId, editData);
      cancelEdit();
      await load();
    } catch (err: unknown) {
      logger.error('Failed to update lab test', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_update'));
    }
  };

  const toggleActive = async (test: LabTest) => {
    setError(null);
    try {
      await updateLabTest(test.id, { active: !test.active });
      await load();
    } catch (err: unknown) {
      logger.error('Failed to toggle lab test status', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_update'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.confirm_delete_test'))) return;
    setError(null);
    try {
      await deleteLabTest(id);
      await load();
    } catch (err: unknown) {
      logger.error('Failed to delete lab test', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg || t('admin.error_delete'));
    }
  };

  if (loading) return <div className="page-container text-center" style={{ padding: '2rem' }}>{t('admin.loading')}</div>;

  return (
    <div className="page-container" style={{ maxWidth: 960, margin: '0 auto' }}>
      <h1>{t('admin.lab_tests_title')}</h1>

      {error && <div className="alert alert-error mb-sm">{error}</div>}

      <div className="flex-row gap-sm mb-sm" style={{ marginBottom: 24 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('admin.new_test_placeholder')}
          className="form-input"
          style={{ flex: 1 }}
        />
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder={t('admin.category')}
          className="form-input"
          style={{ width: 150 }}
        />
        <button className="btn btn-primary" onClick={handleCreate}>{t('admin.add')}</button>
      </div>

      {tests.length === 0 && !loading ? (
        <p className="text-center text-muted-lg" style={{ padding: 40 }}>{t('admin.no_tests')}</p>
      ) : (
        <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.name')}</th>
              <th>{t('admin.category')}</th>
              <th>{t('admin.unit')}</th>
              <th>{t('admin.price')}</th>
              <th>{t('admin.active')}</th>
              <th>{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => (
              <tr key={test.id}>
                {editId === test.id ? (
                  <td colSpan={6} style={{ padding: 12 }}>
                    <div className="flex-col gap-md">
                      <div className="flex-row gap-md flex-wrap">
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <label className="label-sm">{t('admin.name')}</label>
                          <input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="form-input" />
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <label className="label-sm">{t('admin.code')}</label>
                          <input value={editData.code || ''} onChange={(e) => setEditData({ ...editData, code: e.target.value })} className="form-input" />
                        </div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <label className="label-sm">{t('admin.category')}</label>
                          <input value={editData.category || ''} onChange={(e) => setEditData({ ...editData, category: e.target.value })} className="form-input" />
                        </div>
                      </div>
                      <div>
                        <label className="label-sm">{t('admin.description')}</label>
                        <textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="form-input" style={{ minHeight: 60 }} />
                      </div>
                      <div className="flex-row gap-md">
                        <div style={{ width: 100 }}>
                          <label className="label-sm">{t('admin.unit')}</label>
                          <input value={editData.unit || ''} onChange={(e) => setEditData({ ...editData, unit: e.target.value })} className="form-input" />
                        </div>
                        <div style={{ width: 100 }}>
                          <label className="label-sm">{t('admin.price')}</label>
                          <input type="number" value={editData.price ?? 0} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} className="form-input" />
                        </div>
                        <div style={{ width: 100 }}>
                          <label className="label-sm">Ref. Min</label>
                          <input type="number" value={editData.reference_min ?? ''} onChange={(e) => setEditData({ ...editData, reference_min: e.target.value ? Number(e.target.value) : null })} className="form-input" />
                        </div>
                        <div style={{ width: 100 }}>
                          <label className="label-sm">Ref. Max</label>
                          <input type="number" value={editData.reference_max ?? ''} onChange={(e) => setEditData({ ...editData, reference_max: e.target.value ? Number(e.target.value) : null })} className="form-input" />
                        </div>
                      </div>
                      <div className="flex-row gap-sm justify-end">
                        <button className="btn btn-primary" onClick={handleSave}>{t('admin.save')}</button>
                        <button className="btn btn-ghost" onClick={cancelEdit}>{t('admin.cancel')}</button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td>{test.name}</td>
                    <td>{test.category || '-'}</td>
                    <td>{test.unit || '-'}</td>
                    <td>${Number(test.price).toFixed(2)}</td>
                    <td>
                      <button className={`btn btn-sm ${test.active ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleActive(test)}>
                        {test.active ? t('admin.yes') : t('admin.no')}
                      </button>
                    </td>
                    <td>
                      <div className="flex-row gap-sm">
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(test)}>{t('admin.edit')}</button>
                        <button className="btn btn-ghost btn-sm icon-danger" onClick={() => handleDelete(test.id)}>{t('admin.delete')}</button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
