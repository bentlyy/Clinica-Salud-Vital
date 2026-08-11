import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { StatusBadge } from '@/modules/laboratory/components/shared/StatusBadge';

function renderBadge(props: React.ComponentProps<typeof StatusBadge>) {
  return render(
    <AppThemeProvider>
      <StatusBadge {...props} />
    </AppThemeProvider>,
  );
}

describe('StatusBadge', () => {
  it('renders the translated label for a known status', () => {
    renderBadge({ status: 'pending' });
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders the label for a validated status', () => {
    renderBadge({ status: 'validated_doctor' });
    // LAB_STATUS_LABELS in the source file is ASCII-encoded
    expect(screen.getByText('Validado Medico')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    renderBadge({ status: 'delivered', label: 'Entregado al paciente' });
    expect(screen.getByText('Entregado al paciente')).toBeInTheDocument();
  });

  it('falls back to the raw status when unknown', () => {
    renderBadge({ status: 'unknown_state' });
    expect(screen.getByText('unknown_state')).toBeInTheDocument();
  });

  it('supports the medium size', () => {
    renderBadge({ status: 'rejected', size: 'medium' });
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });
});
