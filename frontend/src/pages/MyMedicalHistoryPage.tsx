import { useEffect, useState } from 'react';
import { getClinicalRecords } from '../api/clinicalRecords';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

export default function MyMedicalHistoryPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getClinicalRecords({ limit: 50 })
      .then((res) => setRecords(Array.isArray(res) ? res : (res.data || [])))
      .catch(() => setError(t('medical_history.error_loading')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 24 }}>{t('medical_history.title')}</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <p style={{ color: 'var(--text-muted)' }}>{t('medical_history.loading')}</p>}

      {!loading && records.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>{t('medical_history.empty_title')}</h3>
          <p>{t('medical_history.empty_desc')}</p>
        </div>
      )}

      <div className="grid" style={{ gap: 12 }}>
        {records.map((r) => (
          <div
            key={r.id}
            className="card"
            style={{ padding: 20, cursor: 'pointer' }}
            onClick={() => navigate(`/my-medical-history/${r.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <strong style={{ fontSize: 16 }}>{r.chief_complaint}</strong>
              <span className={`badge ${r.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                {r.status === 'completed' ? t('medical_history.completed') : t('medical_history.draft')}
              </span>
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              <span>{t('medical_history.date')}: {r.created_at?.split('T')[0] || '-'}</span>
              {r.doctor_name && <span style={{ marginLeft: 16 }}>{t('medical_history.doctor')}: {r.doctor_name}</span>}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {r.diagnosis || <span style={{ fontStyle: 'italic' }}>{t('medical_history.no_diagnosis')}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
