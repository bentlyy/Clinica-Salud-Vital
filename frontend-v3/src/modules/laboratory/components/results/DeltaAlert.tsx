import { memo } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Fade,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { useTheme } from '@mui/material/styles';

// ── Props ────────────────────────────────────────────────────────────────────

interface DeltaAlertProps {
  status: 'warning' | 'critical';
  testName: string;
  currentValue: string;
  previousValue: string;
  deltaPercentage: number;
  patientName: string;
  onReview?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export const DeltaAlert = memo(function DeltaAlert({
  status,
  testName,
  currentValue,
  previousValue,
  deltaPercentage,
  patientName,
  onReview,
}: DeltaAlertProps) {
  const theme = useTheme();

  const severity = status === 'critical' ? 'error' : 'warning';

  const bodyText =
    `Paciente ${patientName}: resultado ${currentValue} vs anterior ` +
    `${previousValue} (${deltaPercentage > 0 ? '+' : ''}${deltaPercentage.toFixed(1)}% de cambio)`;

  return (
    <Fade in timeout={400}>
      <Alert
        severity={severity}
        icon={
          status === 'critical' ? (
            <ErrorIcon sx={{ fontSize: 22 }} />
          ) : (
            <WarningAmberIcon sx={{ fontSize: 22 }} />
          )
        }
        action={
          onReview ? (
            <Button
              color="inherit"
              size="small"
              onClick={onReview}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.8125rem',
                borderRadius: '8px',
                px: 1.5,
                '&:hover': {
                  backgroundColor:
                    status === 'critical'
                      ? 'rgba(239, 68, 68, 0.12)'
                      : 'rgba(245, 158, 11, 0.12)',
                },
              }}
            >
              Revisar
            </Button>
          ) : undefined
        }
        sx={{
          borderRadius: '12px',
          border: `1px solid ${
            status === 'critical' ? '#fecaca' : '#fde68a'
          }`,
          backgroundColor:
            status === 'critical' ? '#fef2f2' : '#fffbeb',
          '& .MuiAlert-message': {
            width: '100%',
          },
          '& .MuiAlert-icon': {
            color: status === 'critical' ? '#dc2626' : '#d97706',
          },
        }}
      >
        <AlertTitle
          sx={{
            fontWeight: 700,
            fontSize: '0.875rem',
            color: status === 'critical' ? '#991b1b' : '#92400e',
            mb: 0.25,
          }}
        >
          Verificación Delta — {testName}
        </AlertTitle>
        <span
          style={{
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: status === 'critical' ? '#b91c1c' : '#a16207',
          }}
        >
          {bodyText}
        </span>
      </Alert>
    </Fade>
  );
});

export default DeltaAlert;
