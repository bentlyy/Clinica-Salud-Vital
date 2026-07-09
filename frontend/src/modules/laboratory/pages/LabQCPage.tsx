import { useState } from 'react';
import { useLabAreas } from '../hooks/useLabAreas';
import QCDashboard from '../components/qc/QCDashboard';
import ReagentStockTable from '../components/inventory/ReagentStockTable';
import { PageContainer, PageHeader } from '../../../components/ui/PageContainer';
import Button from '../../../components/ui/Button';

export default function LabQCPage() {
  const { areas, selectedAreaId, setSelectedAreaId } = useLabAreas();
  const [tab, setTab] = useState<'qc' | 'reagents'>('qc');

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="Calidad e Insumos"
        subtitle="Control de calidad, reactivos y equipos"
        style={{ marginBottom: 24 }}
        actions={
          <div style={{ display: 'flex', gap: 4 }}>
            <Button variant={tab === 'qc' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('qc')}>
              Control de Calidad
            </Button>
            <Button variant={tab === 'reagents' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('reagents')}>
              Reactivos
            </Button>
          </div>
        }
      />

      {areas.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <Button variant={!selectedAreaId ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedAreaId(null)}>
            Todas las áreas
          </Button>
          {areas.map((area) => (
            <Button key={area.id} variant={selectedAreaId === area.id ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedAreaId(area.id)} style={{ borderColor: selectedAreaId === area.id ? area.color : undefined }}>
              {area.name}
            </Button>
          ))}
        </div>
      )}

      {tab === 'qc' && <QCDashboard areaId={selectedAreaId ?? undefined} />}
      {tab === 'reagents' && <ReagentStockTable />}
    </PageContainer>
  );
}
