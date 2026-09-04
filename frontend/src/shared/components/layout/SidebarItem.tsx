import { ListItemButton, ListItemIcon, ListItemText, Tooltip, Collapse, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import React, { memo, useState } from 'react';
import { useLocation } from 'react-router-dom';

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

export const SidebarItem = memo(function SidebarItem({ icon, label, path, active, collapsed, onClick, subItems, locked }: SidebarItemProps) {
  const theme = useTheme();
  const { pathname } = useLocation();
  const hasChildren = Boolean(subItems && subItems.length > 0);
  const [expanded, setExpanded] = useState(false);

  const childActive = subItems?.some((c) => pathname === c.path || pathname.startsWith(c.path + '/')) ?? false;
  const isActive = active && !hasChildren;
  const showExpanded = expanded || childActive;

  const selectedStyles = {
    backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.selected,
    color: theme.palette.primary.main,
    boxShadow: `inset 0 0 0 1px ${theme.palette.custom?.brand?.alpha12 || 'rgba(13,148,136,0.08)'}`,
    '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
    '& .MuiListItemText-primary': { color: theme.palette.primary.main, fontWeight: 700 },
    '&:hover': { backgroundColor: theme.palette.custom?.brand?.lighter || theme.palette.action.selected },
  };

  const activeIndicator = isActive ? (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 4,
        height: 22,
        borderRadius: '0 4px 4px 0',
        background: `linear-gradient(180deg, ${theme.palette.custom?.brand?.light || '#2dd4bf'}, ${theme.palette.custom?.brand?.main || theme.palette.primary.main})`,
      }}
    />
  ) : null;

  const parentItem = (
    <ListItemButton
      selected={isActive}
      onClick={() => {
        if (locked) return;
        if (hasChildren) {
          setExpanded((prev) => !prev);
        } else {
          onClick(path);
        }
      }}
      sx={{
        position: 'relative',
        minHeight: 44,
        borderRadius: '12px',
        mx: 1.25,
        my: 0.75,
        px: collapsed ? 0 : 1.75,
        justifyContent: collapsed ? 'center' : 'initial',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
        '&.Mui-selected': selectedStyles,
        '&:hover': {
          backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.action.hover,
          transform: 'translateX(2px)',
        },
      }}
    >
      {activeIndicator}
      <ListItemIcon
        sx={{
          minWidth: 0,
          mr: collapsed ? 0 : 1.5,
          justifyContent: 'center',
          color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
        }}
      >
        {icon}
      </ListItemIcon>
      {!collapsed && (
        <>
          <ListItemText
            primary={label}
            primaryTypographyProps={{
              fontSize: '0.84rem',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: 0.1,
              color: locked ? theme.palette.text.secondary : isActive ? theme.palette.primary.main : theme.palette.text.primary,
            }}
          />
          {locked && <LockIcon sx={{ fontSize: 14, color: theme.palette.warning.dark, ml: 0.5 }} />}
          {hasChildren && (
            <Box component="span" sx={{ ml: 'auto', display: 'flex', alignItems: 'center', color: theme.palette.text.secondary }}>
              {showExpanded ? <ExpandMore sx={{ fontSize: '1.15rem' }} /> : <ChevronRight sx={{ fontSize: '1.15rem' }} />}
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
          const childIsActive = pathname === child.path || pathname.startsWith(child.path + '/');
          const childSelected = {
            backgroundColor: theme.palette.custom?.brand?.lightest || theme.palette.action.selected,
            color: theme.palette.primary.main,
            '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
            '& .MuiListItemText-primary': { color: theme.palette.primary.main, fontWeight: 600 },
            '&:hover': { backgroundColor: theme.palette.custom?.brand?.lighter || theme.palette.action.selected },
          };
          if (collapsed) {
            return (
              <Tooltip key={child.path} title={child.label} placement="right" arrow>
                <ListItemButton
                  selected={childIsActive}
                  onClick={() => onClick(child.path)}
                  sx={{
                    position: 'relative',
                    minHeight: 36,
                    borderRadius: '10px',
                    mx: 1,
                    my: 0.35,
                    px: 0,
                    justifyContent: 'center',
                    pl: 2.5,
                    transition: 'background-color 0.15s ease',
                    '&.Mui-selected': childSelected,
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
                position: 'relative',
                minHeight: 38,
                borderRadius: '10px',
                mx: 1.25,
                my: 0.35,
                pl: 5,
                transition: 'background-color 0.15s ease, transform 0.15s ease',
                '&.Mui-selected': childSelected,
                '&:hover': {
                  backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.action.hover,
                  transform: 'translateX(2px)',
                },
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
                  fontSize: '0.8rem',
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
});
