import { useLabFilters } from '../../context/LabFiltersContext';
import LabSearchInput from './LabSearchInput';
import { LAB_STATUS_LABELS, LAB_PRIORITY_LABELS } from '../../types';

export default function LabFiltersBar() {
  const { filters, setFilter, resetFilters, activeFilterCount } = useLabFilters();

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      flexWrap: 'wrap', padding: '12px 0',
    }}>
      <LabSearchInput
        value={filters.search}
        onChange={(v) => setFilter('search', v)}
      />

      <select
        className="form-input"
        value={filters.status}
        onChange={(e) => setFilter('status', e.target.value)}
        style={{ width: 150, fontSize: 12, padding: '6px 10px' }}
      >
        <option value="">Todos los estados</option>
        {Object.entries(LAB_STATUS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <select
        className="form-input"
        value={filters.priority}
        onChange={(e) => setFilter('priority', e.target.value)}
        style={{ width: 130, fontSize: 12, padding: '6px 10px' }}
      >
        <option value="">Todas prioridades</option>
        {Object.entries(LAB_PRIORITY_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={filters.onlyUrgent}
          onChange={(e) => setFilter('onlyUrgent', e.target.checked)}
        />
        Solo Urgentes
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={filters.isCritical}
          onChange={(e) => setFilter('isCritical', e.target.checked)}
        />
        Críticos
      </label>

      {activeFilterCount > 0 && (
        <button
          onClick={resetFilters}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, color: '#ef4444' }}
        >
          Limpiar filtros ({activeFilterCount})
        </button>
      )}
    </div>
  );
}
