import { ListItemButton, ListItemIcon, ListItemText, Tooltip, Collapse, Box, Badge } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import React, { useState } from 'react';

interface NavChild {
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active: boolean;
  collapsed: boolean;
  onClick: (path: string) => void;
  subItems?: NavChild[];
  locked?: boolean;
}

export function SidebarItem({ icon, label, path, active, collapsed, onClick, subItems, locked }: SidebarItemProps) {
  const hasChildren = Boolean(subItems && subItems.length > 0);
  const [expanded, setExpanded] = useState(false);

  const parentActive = active;
  const childActive = subItems?.some((c) => window.location.pathname === c.path || window.location.pathname.startsWith(c.path + '/')) ?? false;
  const showExpanded = expanded || childActive;

  const parentItem = (
    <ListItemButton
      selected={parentActive && !hasChildren}
      onClick={() => {
        if (locked) return;
        if (hasChildren) {
          setExpanded((prev) => !prev);
        } else {
          onClick(path);
        }
      }}
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
          color: parentActive ? '#0d9488' : '#6b7280',
        }}
      >
        {icon}
      </ListItemIcon>
      {!collapsed && (
        <>
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              fontSize: '0.8125rem',
              fontWeight: parentActive ? 600 : 500,
              color: locked ? '#9ca3af' : parentActive ? '#0d9488' : '#374151',
            }}
          />
          {locked && <LockIcon sx={{ fontSize: 14, color: '#d97706', ml: 0.5 }} />}
          {hasChildren && (
            <Box component="span" sx={{ ml: 'auto', display: 'flex', alignItems: 'center', color: '#9ca3af' }}>
              {showExpanded ? <ExpandMore sx={{ fontSize: '1.1rem' }} /> : <ChevronRight sx={{ fontSize: '1.1rem' }} />}
            </Box>
          )}
        </>
      )}
    </ListItemButton>
  );

  const renderSubItems = () => {
    if (!hasChildren) return null;
    return (
      <Collapse in={showExpanded} timeout="auto" unmountOnExit>
        {subItems!.map((child) => {
          const childIsActive = window.location.pathname === child.path || window.location.pathname.startsWith(child.path + '/');
          if (collapsed) {
            return (
              <Tooltip key={child.path} title={child.label} placement="right" arrow>
                <ListItemButton
                  selected={childIsActive}
                  onClick={() => onClick(child.path)}
                  sx={{
                    minHeight: 36,
                    borderRadius: '10px',
                    mx: 1,
                    my: 0.15,
                    px: 0,
                    justifyContent: 'center',
                    pl: 2.5,
                    '&.Mui-selected': {
                      backgroundColor: '#f0fdfa',
                      color: '#0d9488',
                      '& .MuiListItemIcon-root': { color: '#0d9488' },
                      '&:hover': { backgroundColor: '#ccfbf1' },
                    },
                    '&:hover': { backgroundColor: '#f9fafb' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 0, justifyContent: 'center', color: childIsActive ? '#0d9488' : '#6b7280' }}>
                    {child.icon}
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            );
          }
          return (
            <ListItemButton
              key={child.path}
              selected={childIsActive}
              onClick={() => onClick(child.path)}
              sx={{
                minHeight: 36,
                borderRadius: '10px',
                mx: 1,
                my: 0.15,
                pl: 5,
                '&.Mui-selected': {
                  backgroundColor: '#f0fdfa',
                  color: '#0d9488',
                  '& .MuiListItemIcon-root': { color: '#0d9488' },
                  '&:hover': { backgroundColor: '#ccfbf1' },
                },
                '&:hover': { backgroundColor: '#f9fafb' },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 1.5,
                  justifyContent: 'center',
                  color: childIsActive ? '#0d9488' : '#6b7280',
                }}
              >
                {child.icon}
              </ListItemIcon>
              <ListItemText
                primary={child.label}
                primaryTypographyProps={{
                  fontSize: '0.78rem',
                  fontWeight: childIsActive ? 600 : 400,
                  color: childIsActive ? '#0d9488' : '#6b7280',
                }}
              />
            </ListItemButton>
          );
        })}
      </Collapse>
    );
  };

  if (collapsed) {
    return (
      <>
        <Tooltip title={label} placement="right" arrow>
          {parentItem}
        </Tooltip>
        {renderSubItems()}
      </>
    );
  }

  return (
    <>
      {parentItem}
      {renderSubItems()}
    </>
  );
}
