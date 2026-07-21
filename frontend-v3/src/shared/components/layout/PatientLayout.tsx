import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  useMediaQuery,
  useTheme,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import Person from '@mui/icons-material/Person';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Science from '@mui/icons-material/Science';
import Receipt from '@mui/icons-material/Receipt';
import Settings from '@mui/icons-material/Settings';
import Notifications from '@mui/icons-material/Notifications';
import Logout from '@mui/icons-material/Logout';
import Home from '@mui/icons-material/Home';
import { useAuth } from '@/shared/providers/AuthProvider';
import { getRoleColor } from '@/shared/utils/role.utils';

const TOPBAR_HEIGHT = 64;

const patientNavItems = [
  { label: 'Inicio', icon: <Home />, path: '/patient' },
  { label: 'Citas', icon: <CalendarMonth />, path: '/patient/bookings' },
  { label: 'Historial', icon: <Receipt />, path: '/patient/clinical-records' },
  { label: 'Laboratorio', icon: <Science />, path: '/patient/laboratory' },
  { label: 'Perfil', icon: <Person />, path: '/patient/settings' },
];

export function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const bottomNavIdx = patientNavItems.findIndex(
    (item) => item.path === location.pathname || location.pathname.startsWith(item.path + '/'),
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Topbar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f3f4f6',
          color: '#1f2937',
        }}
      >
        <Toolbar sx={{ height: TOPBAR_HEIGHT, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              C
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937', fontSize: '1rem' }}>
              Mi Portal
            </Typography>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton size="small" sx={{ color: '#6b7280' }}>
              <Badge badgeContent={3} color="error" variant="dot">
                <Notifications fontSize="small" />
              </Badge>
            </IconButton>

            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ ml: 0.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: user ? getRoleColor(user.role) : '#059669',
                  fontSize: '0.75rem',
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 180, borderRadius: 2, border: '1px solid #e5e7eb' } } }}
          >
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/patient/settings'); }}>
              <Settings sx={{ mr: 1.5, fontSize: 18, color: '#6b7280' }} />
              Configuración
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); logout(); }} sx={{ color: '#ef4444' }}>
              <Logout sx={{ mr: 1.5, fontSize: 18 }} />
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#f9fafb',
          p: { xs: 2, md: 3 },
          pb: { xs: 10, md: 3 },
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <BottomNavigation
          value={bottomNavIdx >= 0 ? bottomNavIdx : 0}
          onChange={(_, newValue) => {
            navigate(patientNavItems[newValue]!.path);
          }}
          sx={{
            borderTop: '1px solid #f3f4f6',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              '&.Mui-selected': { color: '#0d9488' },
            },
          }}
        >
          {patientNavItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </BottomNavigation>
      )}
    </Box>
  );
}
