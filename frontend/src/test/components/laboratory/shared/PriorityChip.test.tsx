import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { PriorityChip } from '@/modules/laboratory/components/shared/PriorityChip';

function renderChip(props: React.ComponentProps<typeof PriorityChip>) {
  return render(
    <AppThemeProvider>
      <PriorityChip {...props} />
    </AppThemeProvider>,
  );
}

describe('PriorityChip', () => {
  it('renders the label for a known priority', () => {
    renderChip({ priority: 'urgent' });
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('renders emergency label', () => {
    renderChip({ priority: 'emergency' });
    expect(screen.getByText('Emergencia')).toBeInTheDocument();
  });

  it('falls back to the raw priority when unknown', () => {
    renderChip({ priority: 'custom' });
    expect(screen.getByText('custom')).toBeInTheDocument();
  });

  it('does not show a warning icon by default', () => {
    renderChip({ priority: 'emergency' });
    expect(screen.queryByTestId('WarningAmberIcon')).not.toBeInTheDocument();
  });

  it('shows the warning icon for emergencies when showIcon is enabled', () => {
    renderChip({ priority: 'emergency', showIcon: true });
    expect(document.querySelector('.MuiChip-icon')).toBeInTheDocument();
  });

  it('does not render the icon for non-emergency priorities', () => {
    renderChip({ priority: 'normal', showIcon: true });
    expect(document.querySelector('.MuiChip-icon')).not.toBeInTheDocument();
  });
});
