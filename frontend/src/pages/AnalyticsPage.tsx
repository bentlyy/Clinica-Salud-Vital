import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from '../context/useTheme';
import { useI18n } from '../i18n/useI18n';
import api from '../api/axios';
import { logger } from '../utils/logger.js';

const AnalyticsCharts = lazy(() => import('./AnalyticsCharts.jsx'));

const LIGHT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const DARK_COLORS = ['#4A9EFF', '#00E6A7', '#FFD444', '#FF9955', '#A78BFA', '#6EE7B7'];

const tabs = [
  { id: 'noshow', labelKey: 'analytics.tab_noshow', icon: '⚠️' },
  { id: 'diagnoses', labelKey: 'analytics.tab_diagnoses', icon: '🩺' },
  { id: 'demand', labelKey: 'analytics.tab_demand', icon: '📈' },
  { id: 'schedules', labelKey: 'analytics.tab_schedules', icon: '🕐' },
  { id: 'vitals', labelKey: 'analytics.tab_vitals', icon: '❤️' },
];

function getColors(theme) {
  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const chartRed = theme === 'dark' ? '#FF6B6B' : '#DC3545';
  const chartGreen = theme === 'dark' ? '#34D399' : '#28A745';
  return { colors, chartRed, chartGreen };
}

export default function AnalyticsPage() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('noshow');
  const [loading, setLoading] = useState(true);
  const [modelStatus, setModelStatus] = useState({});
  const [training, setTraining] = useState(false);
  const [data, setData] = useState({
    noShows: [],
    diagnoses: [],
    demand: [],
    schedules: [],
    vitals: [],
  });
  const [fetchError, setFetchError] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [noShows, diagnoses, demand, schedules, vitals, status] = await Promise.all([
        api.get('/analytics/no-shows'),
        api.get('/analytics/diagnoses'),
        api.get('/analytics/demand'),
        api.get('/analytics/schedules'),
        api.get('/analytics/vitals'),
        api.get('/ml/status').catch(() => ({ data: {} })),
      ]);
      setData({
        noShows: noShows.data || [],
        diagnoses: diagnoses.data || [],
        demand: demand.data || [],
        schedules: schedules.data || [],
        vitals: vitals.data || [],
      });
      setModelStatus(status.data || {});
    } catch (err) {
      logger.error('Error fetching analytics:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelStatus = async () => {
    try {
      const status = await api.get('/ml/status');
      setModelStatus(status.data);
    } catch (err) {
      logger.error('Error fetching model status:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchModelStatus();
  }, []);

  const trainModels = async () => {
    setTraining(true);
    try {
      await api.post('/ml/train');
      await fetchModelStatus();
      await fetchAllData();
      downloadExport();
    } catch (err) {
      logger.error('Error training models:', err);
    } finally {
      setTraining(false);
    }
  };

  const downloadExport = async () => {
    try {
      const res = await api.get('/analytics/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-powerbi-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error exporting analytics:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: 'auto' }}></div>
          <p>{t('analytics.loading')}</p>
        </div>
      </div>
    );
  }

  const { colors, chartRed, chartGreen } = getColors(theme);

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t('analytics.title')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('analytics.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadExport} className="btn btn-outline" style={{ padding: '10px 20px' }}>
            📥 {t('analytics.export_excel')}
          </button>
          <button onClick={() => { const url = `${window.location.origin}/api/v1/ml/powerbi-export`; navigator.clipboard.writeText(url); alert(t('analytics.powerbi_copied')); }} className="btn btn-outline" style={{ padding: '10px 20px' }}>
            📊 Power BI
          </button>
          <button onClick={trainModels} disabled={training} className="btn btn-primary" style={{ padding: '10px 20px' }}>
            {training ? '🔄 ' + t('analytics.training') : '🧠 ' + t('analytics.train_models')}
          </button>
        </div>
      </div>

      <div className="model-status-bar">
        <span style={{ fontWeight: 600, marginRight: 12 }}>{t('analytics.model_status')}</span>
        <span className={`status-badge ${modelStatus.models?.noShowModel === 'loaded' ? 'success' : 'warning'}`}>{t('analytics.model_noshow')}: {modelStatus.models?.noShowModel === 'loaded' ? '✅' : '⏳'}</span>
        <span className={`status-badge ${modelStatus.models?.demandModel === 'loaded' ? 'success' : 'warning'}`}>{t('analytics.model_demand')}: {modelStatus.models?.demandModel === 'loaded' ? '✅' : '⏳'}</span>
        <span className={`status-badge ${modelStatus.models?.vitalAnomalyModel === 'trained' ? 'success' : 'warning'}`}>{t('analytics.model_vitals')}: {modelStatus.models?.vitalAnomalyModel === 'trained' ? '✅' : '⏳'}</span>
      </div>

      {fetchError && (
        <div style={{ background: 'var(--danger-50, #fef2f2)', border: '1px solid var(--danger-200, #fecaca)', borderRadius: 8, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ color: 'var(--danger-700, #b91c1c)' }}>{t('analytics.fetch_error')}</span>
          <button onClick={fetchAllData} style={{ padding: '8px 16px', border: 'none', borderRadius: 6, background: 'var(--danger-500, #ef4444)', color: '#fff', cursor: 'pointer', fontSize: 14 }}>{t('analytics.retry')}</button>
        </div>
      )}

      <div className="analytics-tabs">
        {tabs.map((tab) => (
          <button key={tab.id} className={`analytics-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <span className="tab-icon">{tab.icon}</span>
            <span>{t(tab.labelKey)}</span>
          </button>
        ))}
      </div>

      <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }}></div><p>{t('analytics.loading')}</p></div>}>
        <div className="analytics-content">
          {activeTab === 'noshow' && <AnalyticsCharts.NoShowsPanel data={data.noShows} colors={colors} chartRed={chartRed} chartGreen={chartGreen} />}
          {activeTab === 'diagnoses' && <AnalyticsCharts.DiagnosesPanel data={data.diagnoses} colors={colors} chartGreen={chartGreen} />}
          {activeTab === 'demand' && <AnalyticsCharts.DemandPanel data={data.demand} colors={colors} chartRed={chartRed} chartGreen={chartGreen} />}
          {activeTab === 'schedules' && <AnalyticsCharts.SchedulesPanel data={data.schedules} chartRed={chartRed} chartGreen={chartGreen} />}
          {activeTab === 'vitals' && <AnalyticsCharts.VitalsPanel data={data.vitals} chartRed={chartRed} chartGreen={chartGreen} />}
        </div>
      </Suspense>

      <style>{`
        .model-status-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .status-badge.success {
          background: var(--primary-50);
          color: var(--primary-700);
        }
        .status-badge.warning {
          background: var(--warning-50);
          color: var(--warning-500);
        }
        .analytics-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 12px;
          flex-wrap: wrap;
        }
        .analytics-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          background: var(--bg-secondary);
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .analytics-tab:hover {
          background: var(--primary-100);
        }
        .analytics-tab.active {
          background: var(--primary-600);
          color: white;
        }
        .tab-icon {
          font-size: 16px;
        }
        .analytics-content {
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 24px;
        }
        .analytics-card {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .analytics-card h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: var(--text-primary);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: var(--bg-primary);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value { font-size: 28px; font-weight: bold; color: var(--primary-600); }
        .stat-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
        .alert-card { background: var(--warning-50); border: 1px solid var(--warning-500); border-radius: 8px; padding: 16px; margin: 12px 0; }
        .alert-card.danger { background: var(--danger-50); border-color: var(--danger-500); }
      `}</style>
    </div>
  );
}
