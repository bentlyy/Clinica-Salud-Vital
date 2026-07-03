import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import CoreModal from '../../components/CoreModal';

function renderModal({
  isOpen = true,
  onClose = vi.fn(),
  title = 'Modal Title',
  children = <div>Modal content</div>,
} = {}) {
  return render(
    <CoreModal isOpen={isOpen} onClose={onClose} title={title}>
      {children}
    </CoreModal>
  );
}

describe('CoreModal', () => {
  describe('rendering', () => {
    it('renders content when open', () => {
      renderModal();
      expect(screen.getByText('Modal Title')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByText('Modal Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('renders with aria attributes', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Modal Title');
    });

    it('renders close button with aria-label', () => {
      renderModal();
      expect(screen.getByLabelText('Cerrar')).toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('calls onClose when clicking close button', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByLabelText('Cerrar'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when pressing Escape', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking overlay background', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      const overlay = document.querySelector('.modal-overlay');
      expect(overlay).toBeInTheDocument();
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside modal content', () => {
      const onClose = vi.fn();
      renderModal({ onClose });
      const content = document.querySelector('.modal-content');
      expect(content).toBeInTheDocument();
      fireEvent.click(content);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('focus trap', () => {
    it('focuses first focusable element (close button) on open', async () => {
      renderModal({
        children: (
          <>
            <input data-testid="my-input" />
            <button data-testid="last-btn">OK</button>
          </>
        ),
      });
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByLabelText('Cerrar'));
      });
    });

    it('wraps Tab from last to first focusable (close button)', () => {
      renderModal({
        children: (
          <>
            <input data-testid="my-input" />
            <button data-testid="last-btn">OK</button>
          </>
        ),
      });
      const closeBtn = screen.getByLabelText('Cerrar');
      const lastBtn = screen.getByTestId('last-btn');
      lastBtn.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(document.activeElement).toBe(closeBtn);
    });

    it('wraps Shift+Tab from first (close button) to last element', () => {
      renderModal({
        children: (
          <>
            <input data-testid="my-input" />
            <button data-testid="last-btn">OK</button>
          </>
        ),
      });
      const closeBtn = screen.getByLabelText('Cerrar');
      const lastBtn = screen.getByTestId('last-btn');
      closeBtn.focus();
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(lastBtn);
    });
  });

  describe('body scroll lock', () => {
    it('sets overflow hidden on body when open', () => {
      renderModal({ isOpen: true });
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores overflow on unmount', () => {
      const { unmount } = renderModal({ isOpen: true });
      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });
});
