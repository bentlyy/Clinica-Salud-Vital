import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from '../context/useTheme';
import { useI18n } from '../i18n/useI18n';
import api from '../api/axios';
import { logger } from '../utils/logger.js';

const AnalyticsCharts = lazy(() => import('./AnalyticsCharts'));

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
      const [noShows, diagnoses, demand, schedules, vitals] = await Promise.all([
        api.get('/analytics/no-shows'),
        api.get('/analytics/diagnoses'),
        api.get('/analytics/demand'),
        api.get('/analytics/schedules'),
        api.get('/analytics/vitals'),
      ]);
      setData({
        noShows: noShows.data || [],
        diagnoses: diagnoses.data || [],
        demand: demand.data || [],
        schedules: schedules.data || [],
        vitals: vitals.data || [],
      });
    } catch (err) {
      logger.error('Error fetching analytics:', err);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>{t('analytics.title')}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{t('analytics.subtitle')}</p>
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
    </div>
  );
}
