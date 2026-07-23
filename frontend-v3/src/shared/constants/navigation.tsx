import React from 'react';
import Dashboard from '@mui/icons-material/Dashboard';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Science from '@mui/icons-material/Science';
import Receipt from '@mui/icons-material/Receipt';
import Settings from '@mui/icons-material/Settings';
import People from '@mui/icons-material/People';
import LocalHospital from '@mui/icons-material/LocalHospital';
import Assessment from '@mui/icons-material/Assessment';
import History from '@mui/icons-material/History';
import Description from '@mui/icons-material/Description';
import Assignment from '@mui/icons-material/Assignment';
import Badge from '@mui/icons-material/Badge';
import Inventory from '@mui/icons-material/Inventory';
import Notifications from '@mui/icons-material/Notifications';
import AccountBalance from '@mui/icons-material/AccountBalance';
import MedicalServices from '@mui/icons-material/MedicalServices';
import PersonSearch from '@mui/icons-material/PersonSearch';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Verified from '@mui/icons-material/Verified';
import Analytics from '@mui/icons-material/Analytics';
import type { UserRole } from '@/shared/types/api.types';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  featureKey?: string;
  children?: { label: string; icon: React.ReactNode; path: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  // Dashboard
  { label: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['superadmin', 'admin', 'doctor', 'lab_technician'] },

  // SaaS Dashboard (superadmin only)
  { label: 'Panel SaaS', icon: <TrendingUp />, path: '/saas', roles: ['superadmin'] },

  // Tenants (superadmin only)
  { label: 'Clínicas', icon: <AccountBalance />, path: '/tenants', roles: ['superadmin'] },

  // Users & Doctors
  { label: 'Usuarios', icon: <People />, path: '/users', roles: ['superadmin', 'admin'] },
  { label: 'Doctores', icon: <LocalHospital />, path: '/doctors', roles: ['superadmin', 'admin'] },

  // Patients (admin/doctor)
  { label: 'Pacientes', icon: <PersonSearch />, path: '/patients', roles: ['superadmin', 'admin', 'doctor'] },

  // Specialties (admin/doctor)
  { label: 'Especialidades', icon: <MedicalServices />, path: '/specialties', roles: ['superadmin', 'admin'] },

  // Bookings
  { label: 'Citas', icon: <CalendarMonth />, path: '/bookings', roles: ['superadmin', 'admin', 'doctor', 'patient'] },

  // Availability
  { label: 'Horarios', icon: <CalendarMonth />, path: '/availability', roles: ['doctor'] },

  // Clinical Records
  { label: 'Expedientes', icon: <Description />, path: '/clinical-records', roles: ['superadmin', 'admin', 'doctor', 'patient'] },

  // Prescriptions
  { label: 'Recetas', icon: <Assignment />, path: '/prescriptions', roles: ['superadmin', 'admin', 'doctor', 'patient'] },

  // Medical History
  { label: 'Historial Médico', icon: <History />, path: '/medical-history', roles: ['superadmin', 'admin', 'doctor', 'patient'] },

  // Laboratory
  { label: 'Laboratorio', icon: <Science />, path: '/laboratory', roles: ['superadmin', 'admin', 'doctor', 'lab_technician'], featureKey: 'laboratory', children: [
    { label: 'Panel', path: '/laboratory', icon: <Dashboard /> },
    { label: 'Solicitudes', path: '/laboratory/requests', icon: <Assignment /> },
    { label: 'Control Calidad', path: '/laboratory/quality-control', icon: <Verified /> },
    { label: 'Analitica', path: '/laboratory/analytics', icon: <Analytics /> },
  ] },

  // Billing
  { label: 'Facturación', icon: <Receipt />, path: '/billing', roles: ['superadmin', 'admin'] },

  // Analytics
  { label: 'Analíticas', icon: <Assessment />, path: '/analytics', roles: ['superadmin', 'admin', 'doctor'] },

  // Reports
  { label: 'Reportes', icon: <Badge />, path: '/reports', roles: ['superadmin', 'admin', 'doctor', 'lab_technician'] },

  // Audit
  { label: 'Auditoría', icon: <Inventory />, path: '/audit', roles: ['superadmin', 'admin'] },

  // Notifications
  { label: 'Notificaciones', icon: <Notifications />, path: '/notifications', roles: ['superadmin', 'admin', 'doctor', 'lab_technician', 'patient'] },

  // Settings
  { label: 'Configuración', icon: <Settings />, path: '/settings', roles: ['superadmin', 'admin', 'doctor', 'lab_technician', 'patient'] },
];

export function getNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
