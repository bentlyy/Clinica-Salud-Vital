import { ListItemButton, ListItemIcon, ListItemText, Tooltip, Collapse, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
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
          backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.selected,
          color: theme.palette.primary.main,
          '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
          '&:hover': { backgroundColor: theme.palette.custom?.brand?.lighter || theme.palette.action.selected },
        },
        '&:hover': {
          backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.action.hover,
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 0,
          mr: collapsed ? 0 : 1.5,
          justifyContent: 'center',
          color: parentActive ? theme.palette.primary.main : theme.palette.text.secondary,
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
              color: locked ? theme.palette.text.secondary : parentActive ? theme.palette.primary.main : theme.palette.text.primary,
            }}
          />
          {locked && <LockIcon sx={{ fontSize: 14, color: theme.palette.warning.dark, ml: 0.5 }} />}
          {hasChildren && (
            <Box component="span" sx={{ ml: 'auto', display: 'flex', alignItems: 'center', color: theme.palette.text.secondary }}>
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
                      backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.selected,
                      color: theme.palette.primary.main,
                      '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
                      '&:hover': { backgroundColor: theme.palette.custom?.brand?.lighter || theme.palette.action.selected },
                    },
                    '&:hover': { backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.action.hover },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, mr: 0, justifyContent: 'center', color: childIsActive ? theme.palette.primary.main : theme.palette.text.secondary }}>
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
                  backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.selected,
                  color: theme.palette.primary.main,
                  '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
                  '&:hover': { backgroundColor: theme.palette.custom?.brand?.lighter || theme.palette.action.selected },
                },
                '&:hover': { backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.action.hover },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 1.5,
                  justifyContent: 'center',
                  color: childIsActive ? theme.palette.primary.main : theme.palette.text.secondary,
                }}
              >
                {child.icon}
              </ListItemIcon>
              <ListItemText
                primary={child.label}
                primaryTypographyProps={{
                  fontSize: '0.78rem',
                  fontWeight: childIsActive ? 600 : 400,
                  color: childIsActive ? theme.palette.primary.main : theme.palette.text.secondary,
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
