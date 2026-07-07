import { useEffect, useCallback } from 'react';

type KeyAction = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
};

const registeredActions = new Map<string, KeyAction>();

export function useLabKeyboard(actions: KeyAction[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const action of actions) {
      const keyMatch = e.key.toLowerCase() === action.key.toLowerCase();
      const ctrlMatch = !!action.ctrl === (e.ctrlKey || e.metaKey);
      const shiftMatch = !!action.shift === e.shiftKey;
      const altMatch = !!action.alt === e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        e.stopPropagation();
        action.handler();
        return;
      }
    }
  }, [actions]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const LAB_KEYBOARD_SHORTCUTS = {
  refresh: { key: 'r', ctrl: true, description: 'Refrescar dashboard' },
  search: { key: 'f', ctrl: true, description: 'Buscar (enfocar búsqueda)' },
  newRequest: { key: 'n', ctrl: true, description: 'Nueva solicitud' },
  kanban: { key: 'k', ctrl: true, shift: true, description: 'Vista Kanban' },
  dashboard: { key: 'd', ctrl: true, shift: true, description: 'Vista Dashboard' },
  fullscreen: { key: 'f11', description: 'Pantalla completa' },
  quickReceive: { key: 'r', description: 'Recibir muestra seleccionada' },
} as const;
