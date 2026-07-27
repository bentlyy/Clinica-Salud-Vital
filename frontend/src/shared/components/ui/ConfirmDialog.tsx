import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import WarningAmber from '@mui/icons-material/WarningAmber';
import ErrorOutline from '@mui/icons-material/ErrorOutline';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
}

import type { Theme } from '@mui/material/styles';

function getVariantConfig(variant: 'danger' | 'primary' | 'warning', theme: Theme) {
  switch (variant) {
    case 'danger':
      return {
        icon: <ErrorOutline sx={{ color: theme.palette.error.main, fontSize: 28 }} />,
        color: theme.palette.error.main,
        hoverBg: theme.palette.error.dark,
      };
    case 'warning':
      return {
        icon: <WarningAmber sx={{ color: theme.palette.warning.main, fontSize: 28 }} />,
        color: theme.palette.warning.main,
        hoverBg: theme.palette.warning.dark,
      };
    case 'primary':
      return {
        icon: <InfoOutlined sx={{ color: theme.palette.primary.main, fontSize: 28 }} />,
        color: theme.palette.primary.main,
        hoverBg: theme.palette.primary.dark,
      };
  }
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation('common');
  const config = getVariantConfig(variant, theme);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '14px',
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        {config.icon}
        <span style={{ fontWeight: 600, color: theme.palette.text.primary }}>{title}</span>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: theme.palette.text.secondary, lineHeight: 1.6 }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            textTransform: 'none',
            color: theme.palette.text.secondary,
            borderColor: theme.palette.divider,
            '&:hover': { borderColor: theme.palette.text.secondary },
          }}
          variant="outlined"
        >
          {cancelLabel ?? t('cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          sx={{
            textTransform: 'none',
            backgroundColor: config.color,
            '&:hover': { backgroundColor: config.hoverBg },
            fontWeight: 600,
          }}
        >
          {loading ? t('processing') : (confirmLabel ?? t('confirm'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
