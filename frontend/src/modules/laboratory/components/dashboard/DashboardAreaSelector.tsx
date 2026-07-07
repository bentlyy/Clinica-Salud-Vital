import type { LabArea } from '../../types';

interface DashboardAreaSelectorProps {
  areas: LabArea[];
  selectedAreaId: number | null;
  onSelect: (areaId: number | null) => void;
}

export default function DashboardAreaSelector({ areas, selectedAreaId, onSelect }: DashboardAreaSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button
        onClick={() => onSelect(null)}
        className={`btn btn-sm ${!selectedAreaId ? 'btn-primary' : 'btn-ghost'}`}
        style={{ fontSize: 12 }}
      >
        🔬 Todos
      </button>
      {areas.map((area) => (
        <button
          key={area.id}
          onClick={() => onSelect(area.id)}
          className={`btn btn-sm ${selectedAreaId === area.id ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            fontSize: 12,
            borderColor: selectedAreaId === area.id ? area.color : 'transparent',
            background: selectedAreaId === area.id ? `${area.color}20` : undefined,
            color: selectedAreaId === area.id ? area.color : undefined,
          }}
        >
          {area.name}
        </button>
      ))}
    </div>
  );
}
