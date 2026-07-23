import { memo, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { PriorityChip } from '../shared/PriorityChip';
import { StatusBadge } from '../shared/StatusBadge';
import type { LabRequest } from '../../types/lab.types';

interface WorkQueueProps {
  requests?: LabRequest[];
  onSelectRequest: (id: number) => void;
  selectedId?: number;
  isLoading?: boolean;
}

const TAB_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'En Proceso', value: 'processing' },
  { label: 'Urgentes', value: 'urgent' },
  { label: 'Críticos', value: 'critical' },
] as const;

function filterRequests(requests: LabRequest[], filter: string): LabRequest[] {
  if (!requests) return [];
  switch (filter) {
    case 'pending':
      return requests.filter((r) => r.status === 'pending' || r.status === 'received');
    case 'processing':
      return requests.filter(
        (r) =>
          r.status === 'processing' ||
          r.status === 'assigned' ||
          r.status === 'qc_review' ||
          r.status === 'result_entered',
      );
    case 'urgent':
      return requests.filter((r) => r.priority === 'urgent' || r.priority === 'emergency');
    case 'critical':
      return requests.filter((r) => r.status === 'qc_review' || r.priority === 'emergency');
    default:
      return requests;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function WorkQueueBase({ requests, onSelectRequest, selectedId, isLoading }: WorkQueueProps) {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  const filteredRequests = useMemo(
    () => filterRequests(requests, TAB_FILTERS[tabValue].value),
    [requests, tabValue],
  );

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 2, pt: 1 }}>
          <Skeleton variant="text" width={200} height={36} />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {['#', 'Paciente', 'Prioridad', 'Estado', 'Fecha', 'Acciones'].map((col) => (
                  <TableCell key={col}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" width={j === 1 ? 140 : 80} height={20} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}>
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{
          px: 2,
          pt: 0.5,
          borderBottom: '1px solid #e5e7eb',
          '& .MuiTab-root': {
            minHeight: 44,
            fontWeight: 500,
            fontSize: '0.8125rem',
            textTransform: 'none',
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#0d9488',
            height: 2.5,
          },
        }}
      >
        {TAB_FILTERS.map((tab) => (
          <Tab key={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {filteredRequests.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            gap: 1.5,
          }}
        >
          <InboxOutlinedIcon sx={{ fontSize: 40, color: '#d1d5db' }} />
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            No hay solicitudes en esta cola
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>#</TableCell>
                <TableCell>Paciente</TableCell>
                <TableCell sx={{ width: 100 }}>Prioridad</TableCell>
                <TableCell sx={{ width: 140 }}>Estado</TableCell>
                <TableCell sx={{ width: 110 }}>Fecha</TableCell>
                <TableCell sx={{ width: 60 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((request) => {
                const isSelected = selectedId === request.id;
                return (
                  <TableRow
                    key={request.id}
                    hover
                    selected={isSelected}
                    onClick={() => onSelectRequest(request.id)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      backgroundColor: isSelected
                        ? `${theme.palette.primary.main}08`
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: isSelected
                          ? `${theme.palette.primary.main}12`
                          : `${theme.palette.action?.hover ?? '#f5f5f5'}`,
                      },
                      ...(isSelected && {
                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                      }),
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#0d9488' }}>
                        {request.request_number || `#${request.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                        {request.patient_name ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <PriorityChip priority={request.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {formatDate(request.requested_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Ver detalle">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRequest(request.id);
                          }}
                          sx={{ color: '#0d9488' }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

export const WorkQueue = memo(WorkQueueBase);
