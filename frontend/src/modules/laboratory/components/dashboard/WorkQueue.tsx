import { memo, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatDate } from '@/shared/utils/localeUtils';
import type { LabRequest } from '../../types/lab.types';

interface WorkQueueProps {
  requests?: LabRequest[];
  onSelectRequest: (id: number) => void;
  selectedId?: number;
  isLoading?: boolean;
}

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

function formatDateLocal(dateStr: string): string {
  try {
    return formatDate(new Date(dateStr), {
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
  const { t } = useTranslation('lab');
  const [tabValue, setTabValue] = useState(0);

  const tabFilters = useMemo(() => [
    { label: t('all'), value: 'all' },
    { label: t('pending'), value: 'pending' },
    { label: t('inProgress'), value: 'processing' },
    { label: t('urgent'), value: 'urgent' },
    { label: t('critical'), value: 'critical' },
  ], [t]);

  const filteredRequests = useMemo(
    () => filterRequests(requests ?? [], tabFilters[tabValue]?.value ?? 'all'),
    [requests, tabValue, tabFilters],
  );

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 2, pt: 1 }}>
          <Skeleton variant="text" width={200} height={36} />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {[t('requestNumber'), t('patient'), t('priority'), t('status'), t('dateLabel'), t('actionsLabel')].map((col) => (
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
    <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '14px', overflow: 'hidden' }}>
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{
          px: 2,
          pt: 0.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '& .MuiTab-root': {
            minHeight: 44,
            fontWeight: 500,
            fontSize: '0.8125rem',
            textTransform: 'none',
          },
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.main,
            height: 2.5,
          },
        }}
      >
        {tabFilters.map((tab) => (
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
          <InboxOutlinedIcon sx={{ fontSize: 40, color: theme.palette.divider }} />
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
            {t('noRequests')}
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>#</TableCell>
                <TableCell>{t('patient')}</TableCell>
                <TableCell sx={{ width: 100 }}>{t('priority')}</TableCell>
                <TableCell sx={{ width: 140 }}>{t('status')}</TableCell>
                <TableCell sx={{ width: 110 }}>{t('dateLabel')}</TableCell>
                <TableCell sx={{ width: 60 }}>{t('actionsLabel')}</TableCell>
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
                          : `${theme.palette.action?.hover ?? theme.palette.custom.surface.sunken}`,
                      },
                      ...(isSelected && {
                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                      }),
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                        {request.request_number || `#${request.id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.primary }}>
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
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
                        {formatDateLocal(request.requested_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t('viewDetail')}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRequest(request.id);
                          }}
                          sx={{ color: theme.palette.primary.main }}
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
