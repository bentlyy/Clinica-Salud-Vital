interface DashboardSLAIndicatorProps {
  slaBreached: number;
  slaAtRisk: number;
  avgProcessingTime: number;
  samplesProcessedToday: number;
  productivityPerHour: number;
}

export default function DashboardSLAIndicator({
  slaBreached, slaAtRisk, avgProcessingTime,
  samplesProcessedToday, productivityPerHour,
}: DashboardSLAIndicatorProps) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>⏱ SLA y Productividad</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tiempo promedio</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{avgProcessingTime} min</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Muestras hoy</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{samplesProcessedToday}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Productividad/hora</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{productivityPerHour}/h</span>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>SLA incumplido</span>
            {slaBreached > 0 ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>🔴 {slaBreached}</span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>✅ 0</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>SLA en riesgo</span>
            {slaAtRisk > 0 ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>🟡 {slaAtRisk}</span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>✅ 0</span>
            )}
          </div>
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 6,
            background: slaBreached > 0 ? '#fef2f2' : '#f0fdf4',
            fontSize: 12, fontWeight: 600,
            color: slaBreached > 0 ? '#dc2626' : '#16a34a',
          }}>
            {slaBreached > 0
              ? `${slaBreached} examen(es) excedieron el SLA`
              : 'Todos los exámenes dentro del SLA'}
          </div>
        </div>
      </div>
    </div>
  );
}
