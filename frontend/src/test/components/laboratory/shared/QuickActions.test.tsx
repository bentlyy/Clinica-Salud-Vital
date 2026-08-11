import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { QuickActions } from '@/modules/laboratory/components/shared/QuickActions';
import AddIcon from '@mui/icons-material/Add';

const actions = [
  { label: 'Nueva Solicitud', icon: <AddIcon />, onClick: vi.fn() },
  { label: 'Nuevo Paciente', icon: <AddIcon />, onClick: vi.fn() },
];

function renderQuickActions(props: Partial<React.ComponentProps<typeof QuickActions>> = {}) {
  return render(
    <AppThemeProvider>
      <QuickActions actions={actions} {...props} />
    </AppThemeProvider>,
  );
}

describe('QuickActions (menu variant)', () => {
  it('renders the trigger button and hides actions until opened', () => {
    renderQuickActions();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByText('Nueva Solicitud')).not.toBeInTheDocument();
  });

  it('shows actions after opening the menu', () => {
    renderQuickActions();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Nueva Solicitud')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Paciente')).toBeInTheDocument();
  });

  it('executes the action when clicked', () => {
    const onClick = vi.fn();
    render(
      <AppThemeProvider>
        <QuickActions actions={[{ label: 'Accion', icon: <AddIcon />, onClick }]} />
      </AppThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Accion'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables an action when flagged as disabled', () => {
    render(
      <AppThemeProvider>
        <QuickActions
          actions={[{ label: 'Bloqueada', icon: <AddIcon />, onClick: vi.fn(), disabled: true }]}
        />
      </AppThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('menuitem', { name: 'Bloqueada' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});

describe('QuickActions (fab variant)', () => {
  it('toggles the main fab icon between Add and Close', () => {
    const { container } = renderQuickActions({ variant: 'fab' });
    const buttons = () => container.querySelectorAll('button');
    // action fabs are always rendered (hidden via CSS), main toggle is the last one
    expect(buttons()).toHaveLength(3);
    const mainIcon = () => buttons()[buttons().length - 1].querySelector('path');
    const initialPath = mainIcon()!.getAttribute('d');

    fireEvent.click(buttons()[buttons().length - 1]);
    const toggledPath = mainIcon()!.getAttribute('d');

    // AddIcon and CloseIcon render different paths
    expect(toggledPath).not.toBe(initialPath);
    expect(toggledPath).not.toBeNull();
  });

  it('executes fab actions when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(
      <AppThemeProvider>
        <QuickActions variant="fab" actions={[{ label: 'Crear', icon: <AddIcon />, onClick }]} />
      </AppThemeProvider>,
    );

    const buttons = () => container.querySelectorAll('button');
    fireEvent.click(buttons()[buttons().length - 1]); // open
    fireEvent.click(buttons()[0]); // first action fab

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports the right direction', () => {
    const { container } = renderQuickActions({ variant: 'fab', direction: 'right' });
    const buttons = () => container.querySelectorAll('button');
    fireEvent.click(buttons()[buttons().length - 1]);
    expect(container.querySelectorAll('button')).toHaveLength(3);
  });
});
