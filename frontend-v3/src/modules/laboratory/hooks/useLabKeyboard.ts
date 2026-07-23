import { useEffect, useCallback } from 'react';

type KeyAction = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
};

export function useLabKeyboard(actions: KeyAction[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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
    },
    [actions],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const LAB_KEYBOARD_SHORTCUTS = {
  refresh: { key: 'r', ctrl: true, description: 'Refrescar dashboard' },
  search: { key: 'f', ctrl: true, description: 'Buscar (enfocar busqueda)' },
  newRequest: { key: 'n', ctrl: true, description: 'Nueva solicitud' },
  kanban: { key: 'k', ctrl: true, shift: true, description: 'Vista Kanban' },
  table: { key: 't', ctrl: true, shift: true, description: 'Vista Tabla' },
  metrics: { key: 'm', ctrl: true, shift: true, description: 'Vista Metricas' },
} as const;
