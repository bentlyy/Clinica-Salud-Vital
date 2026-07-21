import { ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  collapsed: boolean;
  onClick: (path: string) => void;
}

export function SidebarItem({ icon, label, path, active, collapsed, onClick }: SidebarItemProps) {
  const item = (
    <ListItemButton
      selected={active}
      onClick={() => onClick(path)}
      sx={{
        minHeight: 42,
        borderRadius: '10px',
        mx: 1,
        my: 0.25,
        px: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? 'center' : 'initial',
        '&.Mui-selected': {
          backgroundColor: '#f0fdfa',
          color: '#0d9488',
          '& .MuiListItemIcon-root': { color: '#0d9488' },
          '&:hover': { backgroundColor: '#ccfbf1' },
        },
        '&:hover': {
          backgroundColor: '#f9fafb',
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 0,
          mr: collapsed ? 0 : 1.5,
          justifyContent: 'center',
          color: active ? '#0d9488' : '#6b7280',
        }}
      >
        {icon}
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: '0.8125rem',
            fontWeight: active ? 600 : 500,
            color: active ? '#0d9488' : '#374151',
          }}
        />
      )}
    </ListItemButton>
  );

  if (collapsed) {
    return (
      <Tooltip title={label} placement="right" arrow>
        {item}
      </Tooltip>
    );
  }

  return item;
}
