import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        cancel: 'Anuler',
        confirm: 'Confirmer',
        processing: 'Traitement en cours...',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'fr' },
  }),
}));

describe('ConfirmDialog i18n', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete user',
    message: 'This action cannot be undone.',
  };

  it('renders translated confirm label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Confirmer')).toBeInTheDocument();
  });

  it('renders translated cancel label', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Anuler')).toBeInTheDocument();
  });

  it('renders translated processing text when loading', () => {
    render(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.getByText('Traitement en cours...')).toBeInTheDocument();
  });

  it('calls onConfirm with translated button', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirmer'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose with translated button', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Anuler'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not show translated confirm when loading', () => {
    render(<ConfirmDialog {...defaultProps} loading />);
    expect(screen.queryByText('Confirmer')).not.toBeInTheDocument();
    expect(screen.getByText('Traitement en cours...')).toBeInTheDocument();
  });
});
