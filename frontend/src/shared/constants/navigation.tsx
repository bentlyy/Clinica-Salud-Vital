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
import Payments from '@mui/icons-material/Payments';
import MedicalServices from '@mui/icons-material/MedicalServices';
import PersonSearch from '@mui/icons-material/PersonSearch';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Verified from '@mui/icons-material/Verified';
import Analytics from '@mui/icons-material/Analytics';
import type { UserRole } from '@/shared/types/api.types';
import type { TFunction } from 'i18next';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  featureKey?: string;
  children?: { label: string; icon: React.ReactNode; path: string }[];
}

type TranslationFn = TFunction<'nav', undefined>;

interface NavItemDef {
  labelKey: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  featureKey?: string;
  children?: { labelKey: string; icon: React.ReactNode; path: string }[];
}

const NAV_ITEMS_DEF: NavItemDef[] = [
  { labelKey: 'dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['admin', 'doctor', 'lab_technician', 'patient'] },
  { labelKey: 'panelSaas', icon: <TrendingUp />, path: '/saas', roles: ['superadmin'] },
  { labelKey: 'clinics', icon: <AccountBalance />, path: '/tenants', roles: ['superadmin'] },
  { labelKey: 'users', icon: <People />, path: '/users', roles: ['superadmin', 'admin'] },
  { labelKey: 'doctors', icon: <LocalHospital />, path: '/doctors', roles: ['admin'] },
  { labelKey: 'patients', icon: <PersonSearch />, path: '/patients', roles: ['admin', 'doctor'] },
  { labelKey: 'specialties', icon: <MedicalServices />, path: '/specialties', roles: ['superadmin', 'admin'] },
  { labelKey: 'bookings', icon: <CalendarMonth />, path: '/bookings', roles: ['admin', 'doctor', 'patient'] },
  { labelKey: 'availability', icon: <CalendarMonth />, path: '/availability', roles: ['doctor'] },
  { labelKey: 'doctorPanel', icon: <Dashboard />, path: '/panel', roles: ['doctor'] },
  { labelKey: 'clinicalRecords', icon: <Description />, path: '/clinical-records', roles: ['admin', 'doctor', 'patient'] },
  { labelKey: 'prescriptions', icon: <Assignment />, path: '/prescriptions', roles: ['admin', 'doctor', 'patient'] },
  { labelKey: 'medicalHistory', icon: <History />, path: '/medical-history', roles: ['admin', 'doctor', 'patient'] },
  {
    labelKey: 'laboratory',
    icon: <Science />,
    path: '/laboratory',
    roles: ['admin', 'doctor', 'lab_technician'],
    featureKey: 'laboratory',
    children: [
      { labelKey: 'labPanel', path: '/laboratory', icon: <Dashboard /> },
      { labelKey: 'labRequests', path: '/laboratory/requests', icon: <Assignment /> },
      { labelKey: 'labCatalog', path: '/laboratory/catalog', icon: <Inventory /> },
      { labelKey: 'labQualityControl', path: '/laboratory/quality-control', icon: <Verified /> },
      { labelKey: 'labAnalytics', path: '/laboratory/analytics', icon: <Analytics /> },
    ],
  },
  { labelKey: 'doctorLabResults', icon: <Science />, path: '/doctor/lab-results', roles: ['doctor'] },
  { labelKey: 'doctorPatientHistory', icon: <History />, path: '/patient-history', roles: ['doctor'] },
  { labelKey: 'billing', icon: <Receipt />, path: '/billing', roles: ['admin'] },
  { labelKey: 'analytics', icon: <Assessment />, path: '/analytics', roles: ['admin', 'doctor'] },
  { labelKey: 'reports', icon: <Badge />, path: '/reports', roles: ['admin', 'doctor', 'lab_technician'] },
  { labelKey: 'audit', icon: <Inventory />, path: '/audit', roles: ['superadmin', 'admin'] },
  { labelKey: 'labResults', icon: <Science />, path: '/my-laboratory', roles: ['patient'] },
  { labelKey: 'notifications', icon: <Notifications />, path: '/notifications', roles: ['superadmin', 'admin', 'doctor', 'lab_technician', 'patient'] },
  { labelKey: 'cobros', icon: <Payments />, path: '/cobros', roles: ['superadmin'] },
  { labelKey: 'settings', icon: <Settings />, path: '/settings', roles: ['superadmin', 'admin', 'doctor', 'lab_technician', 'patient'] },
];

export function getNavItems(role: UserRole, t: TranslationFn): NavItem[] {
  return NAV_ITEMS_DEF
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      label: t(item.labelKey),
      icon: item.icon,
      path: item.path,
      roles: item.roles,
      featureKey: item.featureKey,
      children: item.children?.map((child) => ({
        label: t(child.labelKey),
        icon: child.icon,
        path: child.path,
      })),
    }));
}
