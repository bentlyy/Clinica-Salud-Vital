import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLabContextMenu, type ContextMenuItem } from '@/modules/laboratory/hooks/useLabContextMenu';

function makeItems(): ContextMenuItem[] {
  return [{ label: 'Ver', onClick: vi.fn() }];
}

function makeMouseEvent(overrides: Partial<MouseEventInit> = {}) {
  return new MouseEvent('contextmenu', {
    clientX: 120,
    clientY: 80,
    bubbles: true,
    cancelable: true,
    ...overrides,
  });
}

describe('useLabContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts closed with no items', () => {
    const { result } = renderHook(() => useLabContextMenu());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.anchorPosition).toBeNull();
    expect(result.current.items).toEqual([]);
  });

  it('show() opens the menu at the pointer position', () => {
    const { result } = renderHook(() => useLabContextMenu());
    const items = makeItems();

    act(() => {
      result.current.show(makeMouseEvent() as unknown as React.MouseEvent, items);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.anchorPosition).toEqual({ top: 80, left: 120 });
    expect(result.current.items).toBe(items);
  });

  it('show() prevents default and stops propagation', () => {
    const { result } = renderHook(() => useLabContextMenu());
    const event = makeMouseEvent();
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const stopPropagation = vi.spyOn(event, 'stopPropagation');

    act(() => {
      result.current.show(event as unknown as React.MouseEvent, makeItems());
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });

  it('hide() closes the menu and clears items', () => {
    const { result } = renderHook(() => useLabContextMenu());

    act(() => {
      result.current.show(makeMouseEvent() as unknown as React.MouseEvent, makeItems());
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.hide();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('closes on Escape key', () => {
    const { result } = renderHook(() => useLabContextMenu());

    act(() => {
      result.current.show(makeMouseEvent() as unknown as React.MouseEvent, makeItems());
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('closes on outside mousedown when the click target is not inside the menu ref', () => {
    const { result } = renderHook(() => useLabContextMenu());

    act(() => {
      result.current.show(makeMouseEvent() as unknown as React.MouseEvent, makeItems());
    });

    const menuDiv = document.createElement('div');
    act(() => {
      result.current.menuRef.current = menuDiv;
    });

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('stays open on mousedown inside the menu ref', () => {
    const { result } = renderHook(() => useLabContextMenu());

    act(() => {
      result.current.show(makeMouseEvent() as unknown as React.MouseEvent, makeItems());
    });

    const menuDiv = document.createElement('div');
    const child = document.createElement('button');
    menuDiv.appendChild(child);
    act(() => {
      result.current.menuRef.current = menuDiv;
    });

    act(() => {
      child.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('does not attach listeners until opened', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    renderHook(() => useLabContextMenu());
    // keydown/mousedown listeners are only added when the menu is open
    expect(addEventListener).not.toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
