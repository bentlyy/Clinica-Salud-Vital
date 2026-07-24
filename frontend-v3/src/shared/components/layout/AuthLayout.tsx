import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export function AuthLayout() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.background.default,
        p: 2,
      }}
    >
      <Outlet />
    </Box>
  );
}
