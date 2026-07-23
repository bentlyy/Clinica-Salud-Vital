import { memo, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Tabs,
  Tab,
  MenuItem,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ScienceIcon from '@mui/icons-material/Science';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { LoadingState } from '@/shared/components/ui/LoadingState';
import { ErrorState } from '@/shared/components/ui/ErrorState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import {
  useQCRecords,
  useLabEquipment,
  useLabAreas,
  useLabTests,
  useCreateQCRecord,
  useApproveQCRecord,
} from '../hooks/useLab';
import { ValidationWorklist } from '../components/qc/ValidationWorklist';
import { ControlChart } from '../components/qc/ControlChart';
import { QCForm } from '../components/qc/QCForm';
import { EquipmentInventory } from '../components/inventory/EquipmentInventory';
import { ReagentInventory } from '../components/inventory/ReagentInventory';
import { useLabReagents } from '../hooks/useLab';
import type { LabQCRecord } from '../types/lab.types';

function LabQualityControlPage() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [qcFormOpen, setQcFormOpen] = useState(false);
  const [areaFilter, setAreaFilter] = useState<number | ''>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [chartAreaId, setChartAreaId] = useState<number | ''>('');
  const [chartTestId, setChartTestId] = useState<number | ''>('');

  const { data: qcRecords, isLoading: qcLoading, error: qcError, refetch: refetchQc } = useQCRecords({
    areaId: typeof areaFilter === 'number' ? areaFilter : undefined,
    type: typeFilter || undefined,
  });
  const { data: equipment, isLoading: eqLoading } = useLabEquipment();
  const { data: areas } = useLabAreas();
  const { data: tests } = useLabTests({
    areaId: typeof chartAreaId === 'number' ? chartAreaId : undefined,
  });
  const { data: reagents, isLoading: reagentLoading } = useLabReagents();

  const createQcMutation = useCreateQCRecord();
  const approveQcMutation = useApproveQCRecord();

  const chartRecords = useMemo(() => {
    if (!qcRecords) return [];
    let filtered = qcRecords;
    if (typeof chartAreaId === 'number') {
      filtered = filtered.filter((r) => r.lab_area_id === chartAreaId);
    }
    if (typeof chartTestId === 'number') {
      filtered = filtered.filter((r) => r.lab_test_id === chartTestId);
    }
    return filtered;
  }, [qcRecords, chartAreaId, chartTestId]);

  const selectedTestName = useMemo(() => {
    if (!chartTestId || !tests) return '';
    return tests.find((t) => t.id === chartTestId)?.name ?? '';
  }, [chartTestId, tests]);

  const selectedAreaName = useMemo(() => {
    if (!chartAreaId || !areas) return '';
    return areas.find((a) => a.id === chartAreaId)?.name ?? '';
  }, [chartAreaId, areas]);

  const handleCreateQc = useCallback(
    (data: Partial<LabQCRecord>) => {
      createQcMutation.mutate(data, {
        onSuccess: () => {
          setQcFormOpen(false);
        },
      });
    },
    [createQcMutation],
  );

  const handleApproveQc = useCallback(
    (id: number) => {
      approveQcMutation.mutate(id);
    },
    [approveQcMutation],
  );

  if (qcLoading) return <LoadingState message="Cargando control de calidad..." />;
  if (qcError) return <ErrorState error={qcError as Error} onRetry={() => void refetchQc()} />;

  return (
    <Box>
      <PageHeader
        title="Control de Calidad"
        subtitle="Registros, graficos e inventario"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => setQcFormOpen(true)}
          >
            Nuevo Registro
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{
          mb: 3,
          borderBottom: '1px solid #e5e7eb',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            minHeight: 44,
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#0d9488',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        <Tab label="Registros QC" />
        <Tab label="Grafico de Control" />
        <Tab label="Inventario" />
      </Tabs>

      {/* Tab 0: QC Records */}
      {tabValue === 0 && (
        <Box>
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Area"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            >
              <MenuItem value="">
                <em>Todas</em>
              </MenuItem>
              {areas?.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Tipo QC"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              <MenuItem value="internal">Control Interno</MenuItem>
              <MenuItem value="external">Control Externo</MenuItem>
              <MenuItem value="calibration">Calibracion</MenuItem>
              <MenuItem value="proficiency">Proficiency</MenuItem>
            </TextField>
          </Box>

          {qcRecords && qcRecords.length > 0 ? (
            <ValidationWorklist
              items={qcRecords.map((r) => ({
                ...r,
                lab_request_id: 0,
                lab_test_id: r.lab_test_id,
                lab_area_id: r.lab_area_id,
                priority: 'normal' as const,
                status: r.status === 'passed' ? 'validated_tech' as const : r.status === 'failed' ? 'rejected' as const : 'result_entered' as const,
                result_value: String(r.measured_value),
                result_notes: r.notes,
                notes: null,
                results: {},
                unit: null,
                is_critical: r.status === 'failed',
                is_repeated: false,
                delta_check_status: null,
                validated_by_tech: null,
                validated_at_tech: null,
                validated_by_doctor: null,
                validated_at_doctor: null,
                signed_by: null,
                signed_at: null,
                delivered_at: null,
                delivery_method: null,
                completed_at: null,
                assigned_tech_id: null,
                created_at: r.performed_at ?? new Date().toISOString(),
                test_name: r.control_name,
              }))}
              isLoading={qcLoading}
            />
          ) : (
            <EmptyState
              icon={<ScienceIcon sx={{ fontSize: 48, color: '#d1d5db' }} />}
              title="Sin registros QC"
              message="No hay registros de control de calidad con los filtros actuales."
              action={{ label: 'Crear Registro', onClick: () => setQcFormOpen(true) }}
            />
          )}
        </Box>
      )}

      {/* Tab 1: Control Chart */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Area"
              value={chartAreaId}
              onChange={(e) => {
                const val = e.target.value === '' ? '' : Number(e.target.value);
                setChartAreaId(val);
                setChartTestId('');
              }}
              sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            >
              <MenuItem value="">
                <em>Todas</em>
              </MenuItem>
              {areas?.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Test"
              value={chartTestId}
              onChange={(e) => setChartTestId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            >
              <MenuItem value="">
                <em>Seleccione un test</em>
              </MenuItem>
              {tests?.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <ControlChart
            records={chartRecords}
            testName={selectedTestName || 'Todos los tests'}
            areaName={selectedAreaName}
            isLoading={qcLoading}
          />
        </Box>
      )}

      {/* Tab 2: Inventory */}
      {tabValue === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <EquipmentInventory
            equipment={equipment}
            areas={areas}
            isLoading={eqLoading}
          />
          <ReagentInventory
            reagents={reagents}
            areas={areas}
            isLoading={reagentLoading}
          />
        </Box>
      )}

      {/* QC Form Dialog */}
      {qcFormOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setQcFormOpen(false)}
        >
          <Box
            sx={{ width: '90%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <QCForm
              areas={areas}
              tests={tests}
              equipment={equipment}
              onSubmit={handleCreateQc}
              onCancel={() => setQcFormOpen(false)}
              isLoading={createQcMutation.isPending}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default memo(LabQualityControlPage);
