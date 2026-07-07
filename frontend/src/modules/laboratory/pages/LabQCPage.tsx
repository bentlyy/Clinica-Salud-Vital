import { useState } from 'react';
import { useLabAreas } from '../hooks/useLabAreas';
import QCDashboard from '../components/qc/QCDashboard';
import ReagentStockTable from '../components/inventory/ReagentStockTable';

export default function LabQCPage() {
  const { areas, selectedAreaId, setSelectedAreaId } = useLabAreas();
  const [tab, setTab] = useState<'qc' | 'reagents'>('qc');

  return (
    <div className="page-container-wide">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>
            🔬
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Calidad e Insumos</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Control de calidad, reactivos y equipos
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setTab('qc')}
            className={`btn btn-sm ${tab === 'qc' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Control de Calidad
          </button>
          <button
            onClick={() => setTab('reagents')}
            className={`btn btn-sm ${tab === 'reagents' ? 'btn-primary' : 'btn-ghost'}`}
          >
            Reactivos
          </button>
        </div>
      </div>

      {areas.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <button
            onClick={() => setSelectedAreaId(null)}
            className={`btn btn-sm ${!selectedAreaId ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12 }}
          >
            Todas las áreas
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`btn btn-sm ${selectedAreaId === area.id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12, borderColor: selectedAreaId === area.id ? area.color : 'transparent' }}
            >
              {area.name}
            </button>
          ))}
        </div>
      )}

      {tab === 'qc' && <QCDashboard areaId={selectedAreaId ?? undefined} />}
      {tab === 'reagents' && <ReagentStockTable />}
    </div>
  );
}
