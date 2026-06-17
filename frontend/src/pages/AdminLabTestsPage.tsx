import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { getLabTests, createLabTest, updateLabTest, deleteLabTest } from '../api/laboratory';

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
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<LabTest>>({});
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await getLabTests({ active: 'all' });
    setTests(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createLabTest({ name: newName.trim(), category: newCategory.trim() || undefined });
    setNewName('');
    setNewCategory('');
    await load();
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
    await updateLabTest(editId, editData);
    cancelEdit();
    await load();
  };

  const toggleActive = async (test: LabTest) => {
    await updateLabTest(test.id, { active: !test.active });
    await load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.confirm_delete_test'))) return;
    await deleteLabTest(id);
    await load();
  };

  if (loading) return <div className="page-container" style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1>{t('admin.lab_tests_title')}</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('admin.new_test_placeholder')}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder={t('admin.category')}
          style={{ width: 150, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button className="btn btn-primary" onClick={handleCreate}>{t('admin.add')}</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px' }}>{t('admin.name')}</th>
            <th style={{ padding: '8px 12px' }}>{t('admin.category')}</th>
            <th style={{ padding: '8px 12px' }}>{t('admin.unit')}</th>
            <th style={{ padding: '8px 12px' }}>{t('admin.price')}</th>
            <th style={{ padding: '8px 12px' }}>{t('admin.active')}</th>
            <th style={{ padding: '8px 12px' }}>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
              {editId === test.id ? (
                <td colSpan={6} style={{ padding: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.name')}</label>
                        <input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.code')}</label>
                        <input value={editData.code || ''} onChange={(e) => setEditData({ ...editData, code: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.category')}</label>
                        <input value={editData.category || ''} onChange={(e) => setEditData({ ...editData, category: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.description')}</label>
                      <textarea value={editData.description || ''} onChange={(e) => setEditData({ ...editData, description: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc', minHeight: 60 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ width: 100 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.unit')}</label>
                        <input value={editData.unit || ''} onChange={(e) => setEditData({ ...editData, unit: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                      <div style={{ width: 100 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.price')}</label>
                        <input type="number" value={editData.price ?? 0} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                      <div style={{ width: 100 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>Ref. Min</label>
                        <input type="number" value={editData.reference_min ?? ''} onChange={(e) => setEditData({ ...editData, reference_min: e.target.value ? Number(e.target.value) : null })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                      <div style={{ width: 100 }}>
                        <label style={{ fontSize: 12, fontWeight: 600 }}>Ref. Max</label>
                        <input type="number" value={editData.reference_max ?? ''} onChange={(e) => setEditData({ ...editData, reference_max: e.target.value ? Number(e.target.value) : null })} style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary" onClick={handleSave}>{t('admin.save')}</button>
                      <button className="btn btn-ghost" onClick={cancelEdit}>{t('admin.cancel')}</button>
                    </div>
                  </div>
                </td>
              ) : (
                <>
                  <td style={{ padding: '8px 12px' }}>{test.name}</td>
                  <td style={{ padding: '8px 12px' }}>{test.category || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>{test.unit || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>${Number(test.price).toFixed(2)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <button className={`btn btn-sm ${test.active ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleActive(test)}>
                      {test.active ? t('admin.yes') : t('admin.no')}
                    </button>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(test)}>{t('admin.edit')}</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: '#e74c3c' }} onClick={() => handleDelete(test.id)}>{t('admin.delete')}</button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
