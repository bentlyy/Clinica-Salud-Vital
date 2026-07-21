import { Box, Typography, Button } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        gap: 2,
        textAlign: 'center',
      }}
    >
      {icon || <InboxOutlinedIcon sx={{ fontSize: 48, color: '#d1d5db' }} />}
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151' }}>
        {title}
      </Typography>
      {message && (
        <Typography variant="body2" sx={{ color: '#6b7280', maxWidth: 400 }}>
          {message}
        </Typography>
      )}
      {action && (
        <Button variant="contained" onClick={action.onClick} sx={{ mt: 1 }}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
