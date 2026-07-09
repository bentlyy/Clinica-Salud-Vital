import { useEffect, useState } from 'react';
import { getClinicalRecords } from '../api/clinicalRecords';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { PageContainer, PageHeader } from '../components/ui/PageContainer';

export default function MyMedicalHistoryPage() {
  const { t } = useI18n();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getClinicalRecords({ limit: 50 })
      .then((res) => setRecords(Array.isArray(res) ? res : (res.data || [])))
      .catch(() => setError(t('medical_history.error_loading')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer maxWidth="md">
      <PageHeader title={t('medical_history.title')} />

      {error && <Alert variant="error">{error}</Alert>}

      {loading && <p style={{ color: 'var(--ds-text-tertiary)' }}>{t('medical_history.loading')}</p>}

      {!loading && records.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>{t('medical_history.empty_title')}</h3>
          <p>{t('medical_history.empty_desc')}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {records.map((r) => (
          <Card key={r.id} padding="sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, }}
            onClick={() => setSelected(r)}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--ds-radius-full)',
              background: r.status === 'completed' ? 'var(--ds-primary-50)' : 'var(--ds-warning-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              flexShrink: 0,
            }}>
              {r.status === 'completed' ? '✅' : '📝'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
              }}>
                <strong style={{
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>{r.chief_complaint}</strong>
                <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>
                  {r.status === 'completed' ? t('medical_history.completed') : t('medical_history.draft')}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', marginTop: 2 }}>
                {r.created_at?.split('T')[0] || '-'}
                {r.doctor_name && <> — {r.doctor_name}</>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: 'var(--ds-bg-secondary)',
              borderRadius: 'var(--ds-radius-lg)',
              maxWidth: 500,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: 'var(--ds-shadow-xl)',
              animation: 'slideDown 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--ds-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 2 }}>{selected.chief_complaint}</h3>
                <p style={{ fontSize: 13, color: 'var(--ds-text-secondary)', margin: 0 }}>
                  {selected.created_at?.split('T')[0]} — {selected.doctor_name || t('medical_history.doctor_unknown')}
                </p>
              </div>
              <Badge variant={selected.status === 'completed' ? 'success' : 'warning'}>
                {selected.status === 'completed' ? t('medical_history.completed') : t('medical_history.draft')}
              </Badge>
            </div>

            <div style={{ padding: '16px 24px' }}>
              {selected.diagnosis && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>{t('clinical_records.diagnosis_label')}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 14 }}>{selected.diagnosis}</p>
                </div>
              )}
              {selected.physical_exam && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>{t('clinical_records.physical_exam')}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{selected.physical_exam}</p>
                </div>
              )}
              {selected.vital_signs && Object.values(selected.vital_signs).some(v => v) && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>{t('medical_history.vital_signs')}</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 4, fontSize: 13 }}>
                    {selected.vital_signs.blood_pressure && <span>PA: {selected.vital_signs.blood_pressure}</span>}
                    {selected.vital_signs.heart_rate && <span>FC: {selected.vital_signs.heart_rate}</span>}
                    {selected.vital_signs.temperature && <span>T°: {selected.vital_signs.temperature}°C</span>}
                    {selected.vital_signs.oxygen_saturation && <span>SpO2: {selected.vital_signs.oxygen_saturation}%</span>}
                  </div>
                </div>
              )}
              {selected.treatment_plan && (
                <div style={{ marginBottom: 14 }}>
                  <strong style={{ fontSize: 13, color: 'var(--ds-text-secondary)' }}>{t('medical_history.treatment_plan')}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>{selected.treatment_plan}</p>
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--ds-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                {t('medical_history.back')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelected(null);
                  navigate(`/my-medical-history/${selected.id}`);
                }}
              >
                {t('medical_history.view')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
