import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import EventNote from '@mui/icons-material/EventNote';
import AttachMoney from '@mui/icons-material/AttachMoney';
import People from '@mui/icons-material/People';
import Science from '@mui/icons-material/Science';
import Description from '@mui/icons-material/Description';
import Download from '@mui/icons-material/Download';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Error from '@mui/icons-material/Error';
import { motion } from 'framer-motion';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { useGenerateReport, useReportDetail } from '../hooks/useReports';
import { downloadReport } from '../utils/reportGenerator';
import type { ReportType } from '../types/report.types';

const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; description: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  appointments: {
    label: 'Citas',
    description: 'Reporte de citas médicas del período seleccionado',
    icon: <EventNote sx={{ fontSize: 32 }} />,
    color: '#0d9488',
    bgColor: '#f0fdfa',
  },
  revenue: {
    label: 'Ingresos',
    description: 'Reporte financiero detallado de ingresos y gastos',
    icon: <AttachMoney sx={{ fontSize: 32 }} />,
    color: '#3b82f6',
    bgColor: '#eff6ff',
  },
  patients: {
    label: 'Pacientes',
    description: 'Estadísticas y listado de pacientes atendidos',
    icon: <People sx={{ fontSize: 32 }} />,
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
  },
  laboratory: {
    label: 'Laboratorio',
    description: 'Resultados de exámenes de laboratorio del período',
    icon: <Science sx={{ fontSize: 32 }} />,
    color: '#f59e0b',
    bgColor: '#fffbeb',
  },
  custom: {
    label: 'Personalizado',
    description: 'Genera un reporte con filtros personalizados',
    icon: <Description sx={{ fontSize: 32 }} />,
    color: '#6b7280',
    bgColor: '#f9fafb',
  },
};

const REPORT_STATUS_CONFIG = {
  generating: { label: 'Generando', icon: <HourglassEmpty sx={{ fontSize: 16 }} />, color: 'warning' as const },
  completed: { label: 'Completado', icon: <CheckCircle sx={{ fontSize: 16 }} />, color: 'success' as const },
  failed: { label: 'Error', icon: <Error sx={{ fontSize: 16 }} />, color: 'error' as const },
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pollingReportId, setPollingReportId] = useState<number | null>(null);

  const generateReport = useGenerateReport();
  const { data: pollingReport } = useReportDetail(pollingReportId ?? 0);

  const handleGenerate = () => {
    if (!selectedType || !dateFrom || !dateTo) return;

    generateReport.mutate(
      {
        type: selectedType,
        date_from: dateFrom,
        date_to: dateTo,
      },
      {
        onSuccess: (report) => {
          setPollingReportId(report.id);
        },
      },
    );
  };

  // Default report types if API doesn't return them
  const reportTypes: ReportType[] = ['appointments', 'revenue', 'patients', 'laboratory'];

  return (
    <Box>
      <PageHeader
        title="Reportes"
        subtitle="Genera reportes detallados de la clínica"
      />

      {/* Report Type Selector */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
        Tipo de Reporte
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {reportTypes.map((type, index) => {
          const config = REPORT_TYPE_CONFIG[type];
          return (
            <Card
              key={type}
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
              onClick={() => setSelectedType(type)}
              sx={{
                cursor: 'pointer',
                border: selectedType === type ? `2px solid ${config.color}` : '1px solid #e5e7eb',
                backgroundColor: selectedType === type ? config.bgColor : '#fff',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Box sx={{ color: config.color, mb: 1.5 }}>{config.icon}</Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9375rem' }}>
                  {config.label}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5, fontSize: '0.75rem' }}>
                  {config.description}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Date Range & Generate */}
      {selectedType && (
        <Paper
          component={motion.div}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
            Rango de Fechas
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              type="date"
              label="Fecha Inicio"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ maxWidth: 300 }}
            />
            <TextField
              fullWidth
              type="date"
              label="Fecha Fin"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ maxWidth: 300 }}
            />
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={!dateFrom || !dateTo || generateReport.isPending}
              sx={{ minWidth: 160 }}
            >
              {generateReport.isPending ? 'Generando...' : 'Generar Reporte'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Report History / Status */}
      {pollingReport && (
        <Paper
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{ p: 3, mb: 3, border: '1px solid #e5e7eb' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937', mb: 2 }}>
            Estado del Reporte
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>#{pollingReport.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={REPORT_TYPE_CONFIG[pollingReport.type]?.label || pollingReport.type}
                      size="small"
                      sx={{
                        backgroundColor: REPORT_TYPE_CONFIG[pollingReport.type]?.bgColor,
                        color: REPORT_TYPE_CONFIG[pollingReport.type]?.color,
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(pollingReport.config.date_from)} – {formatDate(pollingReport.config.date_to)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={REPORT_STATUS_CONFIG[pollingReport.status].icon}
                      label={REPORT_STATUS_CONFIG[pollingReport.status].label}
                      color={REPORT_STATUS_CONFIG[pollingReport.status].color}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(pollingReport.created_at)}</TableCell>
                  <TableCell align="right">
                    {pollingReport.status === 'completed' && pollingReport.result_url && (
                      <Button
                        size="small"
                        startIcon={<Download />}
                        onClick={() =>
                          downloadReport(
                            pollingReport.type,
                            pollingReport.result_url!,
                            pollingReport.config.date_from,
                            pollingReport.config.date_to,
                          )
                        }
                        sx={{ color: '#0d9488' }}
                      >
                        Descargar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Empty state if no type selected */}
      {!selectedType && (
        <EmptyState
          icon={<Description sx={{ fontSize: 48, color: '#d1d5db' }} />}
          title="Selecciona un tipo de reporte"
          message="Elige el tipo de reporte que deseas generar y selecciona el rango de fechas."
        />
      )}
    </Box>
  );
}
