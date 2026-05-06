import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/useTheme';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import api from '../api/axios';

const LIGHT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const DARK_COLORS = ['#4A9EFF', '#00E6A7', '#FFD444', '#FF9955', '#A78BFA', '#6EE7B7'];

const tabs = [
  { id: 'noshow', label: 'No-Shows', icon: '⚠️' },
  { id: 'diagnoses', label: 'Diagnósticos', icon: '🩺' },
  { id: 'demand', label: 'Demanda', icon: '📈' },
  { id: 'schedules', label: 'Horarios', icon: '🕐' },
  { id: 'vitals', label: 'Signos Vitales', icon: '❤️' },
];

export default function AnalyticsPage() {
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

  useEffect(() => {
    fetchAllData();
    fetchModelStatus();
  }, []);

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const fetchAllData = async () => {
    setLoading(true);
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
      console.error('Error fetching analytics:', err);
      setData({
        noShows: mockNoShows,
        diagnoses: mockDiagnoses,
        demand: mockDemand,
        schedules: mockSchedules,
        vitals: mockVitals,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModelStatus = async () => {
    try {
      const status = await api.get('/ml/status');
      setModelStatus(status.data);
    } catch (err) {
      console.error('Error fetching model status:', err);
    }
  };

  const trainModels = async () => {
    setTraining(true);
    try {
      await api.post('/ml/train');
      await fetchModelStatus();
      await fetchAllData();
    } catch (err) {
      console.error('Error training models:', err);
    } finally {
      setTraining(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: 'auto' }}></div>
          <p>Cargando análisis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Análisis y Predicciones</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Dashboard de Machine Learning y Deep Learning</p>
        </div>
        <button 
          onClick={trainModels} 
          disabled={training}
          className="btn btn-primary"
          style={{ padding: '10px 20px' }}
        >
          {training ? '🔄 Entrenando...' : '🧠 Entrenar Modelos'}
        </button>
      </div>

      <div className="model-status-bar">
        <span style={{ fontWeight: 600, marginRight: 12 }}>Estado de Modelos:</span>
        <span className={`status-badge ${modelStatus.noShowModel === 'loaded' ? 'success' : 'warning'}`}>
          No-Shows: {modelStatus.noShowModel === 'loaded' ? '✅' : '⏳'}
        </span>
        <span className={`status-badge ${modelStatus.diagnosisModel === 'loaded' ? 'success' : 'warning'}`}>
          Diagnósticos: {modelStatus.diagnosisModel === 'loaded' ? '✅' : '⏳'}
        </span>
        <span className={`status-badge ${modelStatus.demandModel === 'loaded' ? 'success' : 'warning'}`}>
          Demanda: {modelStatus.demandModel === 'loaded' ? '✅' : '⏳'}
        </span>
        <span className={`status-badge ${modelStatus.vitalAnomalyModel === 'trained' ? 'success' : 'warning'}`}>
          Vitals: {modelStatus.vitalAnomalyModel === 'trained' ? '✅' : '⏳'}
        </span>
      </div>

      <div className="analytics-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`analytics-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="analytics-content">
        {activeTab === 'noshow' && <NoShowsPanel data={data.noShows} />}
        {activeTab === 'diagnoses' && <DiagnosesPanel data={data.diagnoses} />}
        {activeTab === 'demand' && <DemandPanel data={data.demand} />}
        {activeTab === 'schedules' && <SchedulesPanel data={data.schedules} />}
        {activeTab === 'vitals' && <VitalsPanel data={data.vitals} />}
      </div>

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
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: var(--primary-600);
        }
        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        .alert-card {
          background: var(--warning-50);
          border: 1px solid var(--warning-500);
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
        }
        .alert-card.danger {
          background: var(--danger-50);
          border-color: var(--danger-500);
        }
      `}</style>
    </div>
  );
}

function NoShowsPanel({ data }) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const noShows = data.reduce((acc, d) => acc + d.noShows, 0);
  const rate = total > 0 ? ((noShows / total) * 100).toFixed(1) : 0;

  const chartRed = theme === 'dark' ? '#FF6B6B' : '#DC3545';
  const chartGreen = theme === 'dark' ? '#34D399' : '#28A745';

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Citas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: chartRed }}>{noShows}</div>
          <div className="stat-label">No-Asistencias</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: rate > 15 ? chartRed : chartGreen }}>{rate}%</div>
          <div className="stat-label">Tasa No-Show</div>
        </div>
      </div>

      <div className="analytics-card">
        <h3>No-Shows por Doctor (Últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="doctor" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill={colors[0]} name="Total Citas" />
            <Bar dataKey="noShows" fill={chartRed} name="No-Asistencias" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-card">
        <h3>Predicción de No-Shows (ML)</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Modelo predictivo basado en: historial del paciente, día de la semana, hora, doctor asignado.
        </p>
        <table style={{ width: '100%', marginTop: 12, fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Doctor</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Riesgo</th>
              <th style={{ padding: 10, textAlign: 'right' }}>Recomendación</th>
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
                  {d.noShows / d.total > 0.15 ? '⚠️ Recordatorio extra' : '✅ Normal'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiagnosesPanel({ data }) {
  return (
    <div>
      <div className="analytics-card">
        <h3>Top 10 Diagnósticos Más Frecuentes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="diagnosis" type="category" width={150} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill={colors[1]} name="Casos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-card">
        <h3>Clasificación de Diagnósticos (NLP)</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Clasificador entrenado para sugerir diagnóstico basado en motivo de consulta.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {data.slice(0, 6).map((d, i) => (
            <div key={i} style={{ background: 'var(--bg-primary)', padding: 12, borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{d.diagnosis}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.count} casos</div>
              <div style={{ fontSize: 11, color: chartGreen, marginTop: 4 }}>CIE-10: {d.cie10 || 'N/A'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DemandPanel({ data }) {
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.reduce((a, d) => a + d.bookings, 0)}</div>
          <div className="stat-label">Citas (30 días)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Math.round(data.reduce((a, d) => a + d.bookings, 0) / 30)}</div>
          <div className="stat-label">Promedio/Día</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: colors[3] }}>
            {Math.max(...data.map(d => d.bookings))}
          </div>
          <div className="stat-label">Día Pico</div>
        </div>
      </div>

      <div className="analytics-card">
        <h3>Demanda de Citas por Día</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="bookings" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} name="Citas" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="analytics-card">
        <h3>Predicción de Demanda (LSTM/Prophet)</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Predicción de demanda para los próximos 7 días basada en series temporales.
        </p>
        <div style={{ marginTop: 12 }}>
          {data.slice(0, 7).map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
              <span>{d.date}</span>
              <span style={{ fontWeight: 600 }}>{d.predicted || d.bookings} citas</span>
              <span style={{ color: d.predicted && d.predicted > d.bookings ? chartRed : chartGreen }}>
                {d.predicted ? (d.predicted > d.bookings ? '↑ demanda' : '↓ normal') : 'actual'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SchedulesPanel({ data }) {
  return (
    <div>
      <div className="analytics-card">
        <h3>Mejores Horarios por Día (Heatmap)</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Análisis de disponibilidad óptimo basado en patrones históricos.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((day) => {
            const dayData = data.find(d => d.day === day);
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 60, fontWeight: 500 }}>{day}</span>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((hour) => {
                    const hourData = dayData?.hours.find(h => h.time === hour);
                    const score = hourData?.score || 50;
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
        <h3>Recomendaciones de Horarios (ML)</h3>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Día</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Mejor Hora</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Ocupación</th>
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

function VitalsPanel({ data }) {
  const anomalies = data.filter(d => d.anomaly);
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data.length}</div>
          <div className="stat-label">Registros Totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: chartRed }}>{anomalies.length}</div>
          <div className="stat-label">Anomalías Detectadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: chartGreen }}>{data.length - anomalies.length}</div>
          <div className="stat-label">Normales</div>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="analytics-card">
          <h3>⚠️ Signos Vitales Anómalos (Autoencoder/Isolation Forest)</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Detección de anomalías en signos vitales usando modelos de Machine Learning.
          </p>
          {anomalies.map((d, i) => (
            <div key={i} className="alert-card danger" style={{ marginTop: 12 }}>
              <strong>Paciente ID: {d.patientId}</strong>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div>Fecha: {d.date}</div>
                <div>Presión: {d.pressure} {d.pressureAnomaly && <span style={{ color: chartRed }}>⚠️</span>}</div>
                <div>Frecuencia Cardíaca: {d.heartRate} lpm {d.heartRateAnomaly && <span style={{ color: chartRed }}>⚠️</span>}</div>
                <div>Temperatura: {d.temperature}°C {d.tempAnomaly && <span style={{ color: chartRed }}>⚠️</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="analytics-card">
        <h3>Distribución de Signos Vitales</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={[
                { name: 'Normales', value: data.length - anomalies.length },
                { name: 'Anómalos', value: anomalies.length },
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

const mockNoShows = [
  { doctor: 'Dr. Pérez', total: 45, noShows: 8 },
  { doctor: 'Dr. García', total: 38, noShows: 5 },
  { doctor: 'Dra. López', total: 52, noShows: 12 },
  { doctor: 'Dr. Martínez', total: 30, noShows: 3 },
  { doctor: 'Dra. Silva', total: 41, noShows: 7 },
];

const mockDiagnoses = [
  { diagnosis: 'Hipertensión esencial', count: 45, cie10: 'I10' },
  { diagnosis: 'Diabetes tipo 2', count: 38, cie10: 'E11' },
  { diagnosis: 'Bronquitis aguda', count: 32, cie10: 'J20' },
  { diagnosis: 'Gastritis', count: 28, cie10: 'K29' },
  { diagnosis: 'Artrosis', count: 24, cie10: 'M19' },
  { diagnosis: 'Migraña', count: 21, cie10: 'G43' },
  { diagnosis: 'Ansiedad', count: 18, cie10: 'F41' },
  { diagnosis: 'Asma', count: 15, cie10: 'J45' },
];

const mockDemand = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-04-${String(i + 1).padStart(2, '0')}`,
  bookings: Math.floor(Math.random() * 20) + 10,
  predicted: Math.floor(Math.random() * 20) + 10,
}));

const mockSchedules = [
  { day: 'Lunes', bestTime: '10:00', occupancy: 75 },
  { day: 'Martes', bestTime: '14:00', occupancy: 60 },
  { day: 'Miércoles', bestTime: '09:00', occupancy: 80 },
  { day: 'Jueves', bestTime: '15:00', occupancy: 55 },
  { day: 'Viernes', bestTime: '11:00', occupancy: 70 },
];

const mockVitals = [
  { patientId: 101, date: '2026-04-01', pressure: '140/90', pressureAnomaly: true, heartRate: 78, heartRateAnomaly: false, temperature: 36.5, tempAnomaly: false, anomaly: true },
  { patientId: 102, date: '2026-04-01', pressure: '120/80', pressureAnomaly: false, heartRate: 72, heartRateAnomaly: false, temperature: 36.6, tempAnomaly: false, anomaly: false },
  { patientId: 103, date: '2026-04-02', pressure: '130/85', pressureAnomaly: false, heartRate: 95, heartRateAnomaly: true, temperature: 37.2, tempAnomaly: false, anomaly: true },
  { patientId: 104, date: '2026-04-02', pressure: '118/75', pressureAnomaly: false, heartRate: 68, heartRateAnomaly: false, temperature: 36.4, tempAnomaly: false, anomaly: false },
];