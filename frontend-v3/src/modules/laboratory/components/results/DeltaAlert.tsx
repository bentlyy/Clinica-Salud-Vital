import { memo } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';

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
                      ? theme.palette.custom.status.error.bg
                      : theme.palette.custom.status.warning.bg,
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
            status === 'critical' ? theme.palette.custom.status.error.border : theme.palette.custom.status.warning.border
          }`,
          backgroundColor:
            status === 'critical' ? theme.palette.error.light : theme.palette.warning.light,
          '& .MuiAlert-message': {
            width: '100%',
          },
          '& .MuiAlert-icon': {
            color: status === 'critical' ? theme.palette.error.dark : theme.palette.warning.dark,
          },
        }}
      >
        <AlertTitle
          sx={{
            fontWeight: 700,
            fontSize: '0.875rem',
            color: status === 'critical' ? theme.palette.error.dark : theme.palette.warning.dark,
            mb: 0.25,
          }}
        >
          Verificación Delta — {testName}
        </AlertTitle>
        <span
          style={{
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            color: status === 'critical' ? theme.palette.error.dark : theme.palette.warning.dark,
          }}
        >
          {bodyText}
        </span>
      </Alert>
    </Fade>
  );
});

export default DeltaAlert;
