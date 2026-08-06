import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { formatDate } from '@/shared/utils/localeUtils';
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

const REPORT_ICONS: Record<ReportType, React.ReactNode> = {
  appointments: <EventNote sx={{ fontSize: 32 }} />,
  revenue: <AttachMoney sx={{ fontSize: 32 }} />,
  patients: <People sx={{ fontSize: 32 }} />,
  laboratory: <Science sx={{ fontSize: 32 }} />,
  custom: <Description sx={{ fontSize: 32 }} />,
};

import type { Theme } from '@mui/material/styles';

function getReportColors(theme: Theme): Record<ReportType, { color: string; bgColor: string }> {
  return {
    appointments: { color: theme.palette.primary.main, bgColor: theme.palette.custom.brand.lightest },
    revenue: { color: theme.palette.info.main, bgColor: theme.palette.custom.status.info.bg },
    patients: { color: theme.palette.secondary.main, bgColor: theme.palette.custom.status.info.bg },
    laboratory: { color: theme.palette.warning.main, bgColor: theme.palette.custom.status.warning.bg },
    custom: { color: theme.palette.text.secondary, bgColor: theme.palette.custom.surface.muted },
  };
}

const STATUS_ICONS: Record<string, React.ReactElement> = {
  generating: <HourglassEmpty sx={{ fontSize: 16 }} />,
  completed: <CheckCircle sx={{ fontSize: 16 }} />,
  failed: <Error sx={{ fontSize: 16 }} />,
};

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error'> = {
  generating: 'warning',
  completed: 'success',
  failed: 'error',
};

export default function ReportsPage() {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');
  const theme = useTheme();
  const REPORT_COLORS = useMemo(() => getReportColors(theme), [theme]);

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

  const reportTypes: ReportType[] = ['appointments', 'revenue', 'patients', 'laboratory'];

  return (
    <Box>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Report Type Selector */}
      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
        {t('reportType')}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {reportTypes.map((type, index) => {
          const colors = REPORT_COLORS[type];
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
                border: selectedType === type ? `2px solid ${colors.color}` : `1px solid ${theme.palette.divider}`,
                backgroundColor: selectedType === type ? colors.bgColor : theme.palette.background.paper,
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Box sx={{ color: colors.color, mb: 1.5 }}>{REPORT_ICONS[type]}</Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, fontSize: '0.9375rem' }}>
                  {t(`reportTypes.${type}`)}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5, fontSize: '0.75rem' }}>
                  {t(`typeDescriptions.${type}`)}
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
          sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
            {t('dateRange')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              type="date"
              label={t('dateFrom')}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ maxWidth: 300 }}
            />
            <TextField
              fullWidth
              type="date"
              label={t('dateTo')}
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
              {generateReport.isPending ? t('generating') : t('generateReport')}
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
          sx={{ p: 3, mb: 3, border: `1px solid ${theme.palette.divider}` }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary, mb: 2 }}>
            {t('reportStatus')}
          </Typography>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('columnId')}</TableCell>
                  <TableCell>{t('columnType')}</TableCell>
                  <TableCell>{t('columnPeriod')}</TableCell>
                  <TableCell>{t('columnStatus')}</TableCell>
                  <TableCell>{t('columnDate')}</TableCell>
                  <TableCell align="right">{tc('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>#{pollingReport.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={t(`reportTypes.${pollingReport.type}`) || pollingReport.type}
                      size="small"
                      sx={{
                        backgroundColor: REPORT_COLORS[pollingReport.type]?.bgColor,
                        color: REPORT_COLORS[pollingReport.type]?.color,
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(pollingReport.config.date_from)} – {formatDate(pollingReport.config.date_to)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={STATUS_ICONS[pollingReport.status]}
                      label={t(`statusLabels.${pollingReport.status}`)}
                      color={STATUS_COLORS[pollingReport.status]}
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
                        sx={{ color: theme.palette.primary.main }}
                      >
                        {t('download')}
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
          icon={<Description sx={{ fontSize: 48, color: theme.palette.divider }} />}
          title={t('selectType')}
          message={t('selectTypeMessage')}
        />
      )}
    </Box>
  );
}
