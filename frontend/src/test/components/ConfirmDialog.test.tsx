import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        processing: 'Procesando...',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'es' },
  }),
}));

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete item',
    message: 'Are you sure you want to delete this item?',
  };

  it('renders title and message', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows processing text when loading is true', () => {
    render(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.getByText('Procesando...')).toBeInTheDocument();
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
  });

  it('does not call onConfirm when loading is true', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} loading />);
    fireEvent.click(screen.getByText('Procesando...'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons when loading is true', () => {
    render(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.getByText('Procesando...')).toBeDisabled();
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });

  it('uses custom confirmLabel and cancelLabel when provided', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Yes, delete it"
        cancelLabel="No, keep it"
      />,
    );
    expect(screen.getByText('Yes, delete it')).toBeInTheDocument();
    expect(screen.getByText('No, keep it')).toBeInTheDocument();
  });

  it('does not render dialog content when open is false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete item')).not.toBeInTheDocument();
  });

  it('renders with warning variant without errors', () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />);
    expect(screen.getByText('Delete item')).toBeInTheDocument();
  });

  it('renders with primary variant without errors', () => {
    render(<ConfirmDialog {...defaultProps} variant="primary" />);
    expect(screen.getByText('Delete item')).toBeInTheDocument();
  });
});
