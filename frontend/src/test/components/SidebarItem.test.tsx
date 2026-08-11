import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { SidebarItem } from '@/shared/components/layout/SidebarItem';

function renderSidebarItem(props: {
  icon?: React.ReactNode;
  label?: string;
  path?: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: (path: string) => void;
  subItems?: { label: string; icon: React.ReactNode; path: string }[];
  locked?: boolean;
}) {
  return render(
    <AppThemeProvider>
      <SidebarItem
        icon={props.icon ?? <span>icon</span>}
        label={props.label ?? 'Dashboard'}
        path={props.path ?? '/dashboard'}
        active={props.active ?? false}
        collapsed={props.collapsed ?? false}
        onClick={props.onClick ?? vi.fn()}
        subItems={props.subItems}
        locked={props.locked}
      />
    </AppThemeProvider>,
  );
}

describe('SidebarItem', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the label and calls onClick with the path', () => {
    const onClick = vi.fn();
    renderSidebarItem({ label: 'Dashboard', path: '/dashboard', onClick });
    const item = screen.getByRole('button', { name: /dashboard/i });
    expect(item).toBeInTheDocument();
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledWith('/dashboard');
  });

  it('marks the item as selected when active', () => {
    renderSidebarItem({ active: true });
    expect(screen.getByRole('button', { name: /dashboard/i })).toHaveClass('Mui-selected');
  });

  it('does not mark the item as selected when not active', () => {
    renderSidebarItem({ active: false });
    expect(screen.getByRole('button', { name: /dashboard/i })).not.toHaveClass('Mui-selected');
  });

  it('hides the label and keeps the click behavior when collapsed', () => {
    const onClick = vi.fn();
    renderSidebarItem({ collapsed: true, onClick });
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    const item = screen.getByRole('button');
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledWith('/dashboard');
  });

  it('renders a lock icon and ignores clicks when locked', () => {
    const onClick = vi.fn();
    const { container } = renderSidebarItem({ locked: true, onClick });
    expect(container.querySelector('[data-testid="LockIcon"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('expands children on click and navigates when a child is clicked', () => {
    const onClick = vi.fn();
    renderSidebarItem({
      label: 'Laboratory',
      path: '/laboratory',
      onClick,
      subItems: [
        { label: 'Sub A', icon: <span>a</span>, path: '/laboratory/a' },
        { label: 'Sub B', icon: <span>b</span>, path: '/laboratory/b' },
      ],
    });
    expect(screen.queryByText('Sub A')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /laboratory/i }));
    expect(screen.getByText('Sub A')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sub B'));
    expect(onClick).toHaveBeenCalledWith('/laboratory/b');
  });

  it('auto-expands when a child route is active', () => {
    window.history.pushState({}, '', '/laboratory/a');
    renderSidebarItem({
      label: 'Laboratory',
      path: '/laboratory',
      subItems: [{ label: 'Sub A', icon: <span>a</span>, path: '/laboratory/a' }],
    });
    expect(screen.getByText('Sub A')).toBeInTheDocument();
  });

  it('renders collapsed children as icon-only buttons without labels', () => {
    renderSidebarItem({
      label: 'Laboratory',
      path: '/laboratory',
      collapsed: true,
      subItems: [{ label: 'Sub A', icon: <span>a</span>, path: '/laboratory/a' }],
    });
    expect(screen.queryByText('Sub A')).not.toBeInTheDocument();
  });
});
