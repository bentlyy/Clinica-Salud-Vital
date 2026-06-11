import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useI18n } from '../i18n/useI18n';

const DAY_KEYS = {
  'Lunes': 'analytics.monday',
  'Martes': 'analytics.tuesday',
  'Miércoles': 'analytics.wednesday',
  'Jueves': 'analytics.thursday',
  'Viernes': 'analytics.friday',
};

export function NoShowsPanel({ data, colors, chartRed, chartGreen }) {
  const { t } = useI18n();
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const noShows = data.reduce((acc, d) => acc + d.noShows, 0);
  const rate = total > 0 ? ((noShows / total) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">{t('analytics.total_appointments')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: chartRed }}>{noShows}</div>
          <div className="stat-label">{t('analytics.no_shows')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: rate > 15 ? chartRed : chartGreen }}>{rate}%</div>
          <div className="stat-label">{t('analytics.no_show_rate')}</div>
        </div>
      </div>

      <div className="analytics-card">
        <h3>{t('analytics.no_shows_by_doctor')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="doctor" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill={colors[0]} name={t('analytics.total_appointments')} />
            <Bar dataKey="noShows" fill={chartRed} name={t('analytics.no_shows')} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-card">
        <h3>{t('analytics.no_show_prediction')}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {t('analytics.no_show_prediction_desc')}
        </p>
        <table style={{ width: '100%', marginTop: 12, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>{t('analytics.doctor')}</th>
              <th style={{ padding: 10, textAlign: 'right' }}>{t('analytics.risk')}</th>
              <th style={{ padding: 10, textAlign: 'right' }}>{t('analytics.recommendation')}</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: 10 }}>{d.doctor}</td>
                <td style={{ padding: 10, textAlign: 'right', color: d.noShows / d.total > 0.15 ? chartRed : chartGreen }}>
                  {((d.noShows / d.total) * 100).toFixed(1)}%
                </td>
                <td style={{ padding: 10, textAlign: 'right' }}>
                  {d.noShows / d.total > 0.15 ? '⚠️ ' + t('analytics.extra_reminder') : '✅ ' + t('analytics.normal')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DiagnosesPanel({ data, colors, chartGreen }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="analytics-card">
        <h3>{t('analytics.top_diagnoses')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="diagnosis" type="category" width={150} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill={colors[1]} name={t('analytics.cases')} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-card">
        <h3>{t('analytics.diagnosis_classification')}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t('analytics.diagnosis_classification_desc')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {data.slice(0, 6).map((d, i) => (
            <div key={i} style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{d.diagnosis}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.count} {t('analytics.cases')}</div>
              <div style={{ fontSize: 11, color: chartGreen, marginTop: 4 }}>CIE-10: {d.cie10 || t('analytics.na')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DemandPanel({ data, colors, chartRed, chartGreen }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.reduce((a, d) => a + d.bookings, 0)}</div>
          <div className="stat-label">{t('analytics.appointments_30d')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(data.reduce((a, d) => a + d.bookings, 0) / 30)}</div>
          <div className="stat-label">{t('analytics.avg_daily')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: colors[3] }}>
            {Math.max(...data.map(d => d.bookings))}
          </div>
          <div className="stat-label">{t('analytics.peak_day')}</div>
        </div>
      </div>

      <div className="analytics-card">
        <h3>{t('analytics.daily_demand')}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="bookings" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} name={t('analytics.appointments')} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-card">
        <h3>{t('analytics.demand_forecast')}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {t('analytics.demand_forecast_desc')}
        </p>
        <div style={{ marginTop: 12 }}>
          {data.slice(0, 7).map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
              <span>{d.date}</span>
              <span style={{ fontWeight: 600 }}>{d.predicted || d.bookings} {t('analytics.appointments')}</span>
              <span style={{ color: d.predicted && d.predicted > d.bookings ? chartRed : chartGreen }}>
                {d.predicted ? (d.predicted > d.bookings ? '↑ ' + t('analytics.demand_up') : '↓ ' + t('analytics.normal')) : t('analytics.actual')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SchedulesPanel({ data, chartRed, chartGreen }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="analytics-card">
        <h3>{t('analytics.best_slots')}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t('analytics.best_slots_desc')}
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((day) => {
            const dayData = data.find(d => d.day === day);
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 60, fontWeight: 500 }}>{t(DAY_KEYS[day])}</span>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((hour) => {
                    const hourData = dayData?.hours?.find(h => h.time === hour);
                    const score = hourData?.score ?? 50;
                    const bg = score > 70 ? chartGreen : score > 40 ? 'var(--chart-warning)' : chartRed;
                    return (
                      <div key={hour} style={{ flex: 1, padding: 8, background: bg, borderRadius: 4, textAlign: 'center', color: 'white', fontSize: 11 }}>
                        {hour}<br />{score}%
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="analytics-card">
        <h3>{t('analytics.schedule_recommendations')}</h3>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>{t('analytics.day')}</th>
              <th style={{ padding: 10, textAlign: 'left' }}>{t('analytics.best_time')}</th>
              <th style={{ padding: 10, textAlign: 'left' }}>{t('analytics.occupancy')}</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((d, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: 10 }}>{d.day}</td>
                <td style={{ padding: 10 }}>{d.bestTime}</td>
                <td style={{ padding: 10 }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    background: d.occupancy > 70 ? 'var(--danger-50)' : 'var(--primary-50)',
                    color: d.occupancy > 70 ? 'var(--danger-600)' : 'var(--primary-700)'
                  }}>
                    {d.occupancy}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function VitalsPanel({ data, chartRed, chartGreen }) {
  const { t } = useI18n();
  const anomalies = data.filter(d => d.anomaly);
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.length}</div>
          <div className="stat-label">{t('analytics.total_records')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: chartRed }}>{anomalies.length}</div>
          <div className="stat-label">{t('analytics.anomalies_detected')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: chartGreen }}>{data.length - anomalies.length}</div>
          <div className="stat-label">{t('analytics.normal')}</div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="analytics-card">
          <h3>{t('analytics.vital_anomalies')}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {t('analytics.vital_anomalies_desc')}
          </p>
          {anomalies.map((d, i) => (
            <div key={i} className="alert-card danger" style={{ marginTop: 12 }}>
              <strong>{t('analytics.patient_id')}: {d.patientId}</strong>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div>{t('analytics.date')}: {d.date}</div>
                <div>{t('analytics.pressure')}: {d.pressure} {d.pressureAnomaly && <span style={{ color: chartRed }}>⚠️</span>}</div>
                <div>{t('analytics.heart_rate')}: {d.heartRate} {t('analytics.bpm')} {d.heartRateAnomaly && <span style={{ color: chartRed }}>⚠️</span>}</div>
                <div>{t('analytics.temperature')}: {d.temperature}°C {d.tempAnomaly && <span style={{ color: chartRed }}>⚠️</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="analytics-card">
        <h3>{t('analytics.vital_distribution')}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={[
                { name: t('analytics.normal'), value: data.length - anomalies.length },
                { name: t('analytics.anomalous'), value: anomalies.length },
              ]}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              label
            >
              <Cell fill={chartGreen} />
              <Cell fill={chartRed} />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}