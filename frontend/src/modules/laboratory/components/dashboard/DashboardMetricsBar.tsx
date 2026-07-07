import LabMetricCard from '../shared/LabMetricCard';
import type { LabDashboardMetrics } from '../../types';

interface DashboardMetricsBarProps {
  metrics: LabDashboardMetrics;
  onFilterByStatus?: (status: string) => void;
}

export default function DashboardMetricsBar({ metrics, onFilterByStatus }: DashboardMetricsBarProps) {
  return (
    <div className="grid grid-7" style={{ gap: 12 }}>
      <LabMetricCard
        label="Pendientes"
        value={metrics.pending}
        color="#f59e0b"
        icon={<span>⏳</span>}
        onClick={() => onFilterByStatus?.('pending')}
      />
      <LabMetricCard
        label="Recibidos"
        value={metrics.received}
        color="#3b82f6"
        icon={<span>📥</span>}
        onClick={() => onFilterByStatus?.('received')}
      />
      <LabMetricCard
        label="En Proceso"
        value={metrics.in_progress}
        color="#f97316"
        icon={<span>⚙️</span>}
        onClick={() => onFilterByStatus?.('processing')}
      />
      <LabMetricCard
        label="Validación"
        value={metrics.pending_validation}
        color="#8b5cf6"
        icon={<span>✅</span>}
        onClick={() => onFilterByStatus?.('validated_tech')}
      />
      <LabMetricCard
        label="Entregados"
        value={metrics.delivered}
        color="#22c55e"
        icon={<span>📤</span>}
        onClick={() => onFilterByStatus?.('delivered')}
      />
      <LabMetricCard
        label="Urgentes"
        value={metrics.urgent}
        color="#ef4444"
        icon={<span>🔴</span>}
        onClick={() => onFilterByStatus?.('urgent')}
      />
      <LabMetricCard
        label="Críticos"
        value={metrics.critical_unvalidated}
        color="#dc2626"
        icon={<span>🚨</span>}
        onClick={() => onFilterByStatus?.('critical')}
      />
    </div>
  );
}
