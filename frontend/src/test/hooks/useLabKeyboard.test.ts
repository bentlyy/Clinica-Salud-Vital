import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLabKeyboard, LAB_KEYBOARD_SHORTCUTS } from '@/modules/laboratory/hooks/useLabKeyboard';

describe('useLabKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.removeEventListener('keydown', (window as unknown as { __kbHandler?: EventListener }).__kbHandler);
    delete (window as unknown as { __kbHandler?: EventListener }).__kbHandler;
  });

  function fireKey(key: string, opts: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: !!opts.ctrl,
      metaKey: false,
      shiftKey: !!opts.shift,
      altKey: !!opts.alt,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event;
  }

  it('calls the handler when the matching key + modifier is pressed', () => {
    const handler = vi.fn();
    renderHook(() =>
      useLabKeyboard([{ ...LAB_KEYBOARD_SHORTCUTS.refresh, handler }]),
    );

    fireKey('r', { ctrl: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the modifier is missing', () => {
    const handler = vi.fn();
    renderHook(() =>
      useLabKeyboard([{ ...LAB_KEYBOARD_SHORTCUTS.refresh, handler }]),
    );

    fireKey('r');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire for an unrelated key', () => {
    const handler = vi.fn();
    renderHook(() =>
      useLabKeyboard([{ ...LAB_KEYBOARD_SHORTCUTS.refresh, handler }]),
    );

    fireKey('x', { ctrl: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('matches shift+ctrl shortcuts (kanban)', () => {
    const handler = vi.fn();
    renderHook(() =>
      useLabKeyboard([{ ...LAB_KEYBOARD_SHORTCUTS.kanban, handler }]),
    );

    fireKey('k', { ctrl: true, shift: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches by lowercase regardless of keyboard case', () => {
    const handler = vi.fn();
    renderHook(() =>
      useLabKeyboard([{ key: 'f', ctrl: true, handler }]),
    );

    fireKey('F', { ctrl: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('prevents default on matched shortcuts', () => {
    const handler = vi.fn();
    renderHook(() =>
      useLabKeyboard([{ ...LAB_KEYBOARD_SHORTCUTS.refresh, handler }]),
    );

    const event = fireKey('r', { ctrl: true });
    expect(event.defaultPrevented).toBe(true);
  });

  it('removes the listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() =>
      useLabKeyboard([{ ...LAB_KEYBOARD_SHORTCUTS.refresh, handler }]),
    );

    unmount();
    fireKey('r', { ctrl: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('only fires the first matching action', () => {
    const first = vi.fn();
    const second = vi.fn();
    renderHook(() =>
      useLabKeyboard([
        { key: 'n', ctrl: true, handler: first },
        { key: 'n', ctrl: true, handler: second },
      ]),
    );

    fireKey('n', { ctrl: true });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });

  it('exposes the documented shortcuts', () => {
    expect(LAB_KEYBOARD_SHORTCUTS.refresh.key).toBe('r');
    expect(LAB_KEYBOARD_SHORTCUTS.kanban).toMatchObject({ key: 'k', ctrl: true, shift: true });
    expect(LAB_KEYBOARD_SHORTCUTS.metrics).toMatchObject({ key: 'm', ctrl: true, shift: true });
  });
});
