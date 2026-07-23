import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuState {
  anchorPosition: { top: number; left: number } | null;
  items: ContextMenuItem[];
}

export function useLabContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    anchorPosition: null,
    items: [],
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setState({ anchorPosition: { top: e.clientY, left: e.clientX }, items });
  }, []);

  const hide = useCallback(() => {
    setState({ anchorPosition: null, items: [] });
  }, []);

  useEffect(() => {
    if (!state.anchorPosition) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hide();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [state.anchorPosition, hide]);

  return {
    isOpen: state.anchorPosition !== null,
    anchorPosition: state.anchorPosition,
    items: state.items,
    show,
    hide,
    menuRef,
  };
}
