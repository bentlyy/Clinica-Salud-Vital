import { memo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTheme, alpha } from '@mui/material/styles';

interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  direction?: 'up' | 'right';
  variant?: 'fab' | 'menu';
}

// ── FAB variant ──────────────────────────────────────────────────────────────

function FabActions({
  actions,
  direction,
}: {
  actions: QuickAction[];
  direction: 'up' | 'right';
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleAction = useCallback(
    (action: QuickAction) => {
      action.onClick();
      setOpen(false);
    },
    [],
  );

  const isUp = direction === 'up';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUp ? 'column-reverse' : 'row',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {/* Action items */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isUp ? 'column-reverse' : 'row',
          alignItems: 'center',
          gap: 1,
          overflow: 'hidden',
          maxHeight: open ? 200 : 0,
          opacity: open ? 1 : 0,
          transition: 'all 0.25s ease',
        }}
      >
        {actions.map((action) => (
          <Tooltip key={action.label} title={action.label} placement="left">
            <span>
              <Fab
                size="small"
                disabled={action.disabled}
                onClick={() => handleAction(action)}
                sx={{
                  backgroundColor: action.color
                    ? alpha(action.color, 0.15)
                    : alpha(theme.palette.primary.main, 0.15),
                  color: action.color ?? theme.palette.primary.main,
                  boxShadow: 'none',
                  '&:hover': {
                    backgroundColor: action.color
                      ? alpha(action.color, 0.25)
                      : alpha(theme.palette.primary.main, 0.25),
                  },
                  '&.Mui-disabled': {
                    backgroundColor: theme.palette.action.disabledBackground,
                    color: theme.palette.action.disabled,
                  },
                }}
              >
                {action.icon}
              </Fab>
            </span>
          </Tooltip>
        ))}
      </Box>

      {/* Main toggle button */}
      <Fab
        color="primary"
        onClick={toggleOpen}
        sx={{
          boxShadow: `0 4px 12px ${theme.palette.custom.brand.alpha8}`,
          '&:hover': {
            boxShadow: `0 6px 16px ${theme.palette.custom.brand.alpha8}`,
          },
        }}
      >
        {open ? <CloseIcon /> : <AddIcon />}
      </Fab>
    </Box>
  );
}

// ── Menu variant ─────────────────────────────────────────────────────────────

function MenuActions({ actions }: { actions: QuickAction[] }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleOpen = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(e.currentTarget);
    },
    [],
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleAction = useCallback(
    (action: QuickAction) => {
      action.onClick();
      handleClose();
    },
    [handleClose],
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{
          color: theme.palette.text.secondary,
          '&:hover': {
            color: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: '12px',
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: `0 4px 12px ${theme.palette.custom.brand.alpha8}`,
              minWidth: 180,
            },
          },
        }}
      >
        {actions.map((action) => (
          <MenuItem
            key={action.label}
            onClick={() => handleAction(action)}
            disabled={action.disabled}
            sx={{
              py: 1.25,
              px: 2,
              fontSize: '0.875rem',
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: action.color ?? theme.palette.primary.main,
                minWidth: 36,
              }}
            >
              {action.icon}
            </ListItemIcon>
            <ListItemText
              primary={action.label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export const QuickActions = memo(function QuickActions({
  actions,
  direction = 'up',
  variant = 'menu',
}: QuickActionsProps) {
  if (variant === 'fab') {
    return <FabActions actions={actions} direction={direction} />;
  }

  return <MenuActions actions={actions} />;
});
