import { useState, useCallback, useRef, useEffect } from 'react';

export interface ContextMenuAction {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuAction[];
  visible: boolean;
}

export function useLabContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({ x: 0, y: 0, items: [], visible: false });
  const menuRef = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent, items: ContextMenuAction[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items, visible: true });
  }, []);

  const hide = useCallback(() => {
    setMenu(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    if (!menu.visible) return;

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
  }, [menu.visible, hide]);

  const contextMenu = menu.visible ? (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '4px 0',
        minWidth: 180,
      }}
    >
      {menu.items.map((item, i) => (
        item.divider ? (
          <div key={i} style={{ height: 1, background: '#e5e7eb', margin: '4px 8px' }} />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.onClick(); hide(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 16px',
              fontSize: 13,
              border: 'none',
              background: 'transparent',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              color: item.danger ? '#ef4444' : item.disabled ? '#d1d5db' : '#374151',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {item.icon && <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>}
            {item.label}
          </button>
        )
      ))}
    </div>
  ) : null;

  return { show, hide, contextMenu };
}
