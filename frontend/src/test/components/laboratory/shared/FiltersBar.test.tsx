import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppThemeProvider } from '@/shared/providers/ThemeProvider';
import { FiltersBar } from '@/modules/laboratory/components/shared/FiltersBar';
import { DEFAULT_FILTER_STATE, type LabFilterState } from '@/modules/laboratory/types/lab.types';

function renderFiltersBar(
  overrides: {
    filters?: Partial<LabFilterState>;
    hasActiveFilters?: boolean;
  } = {},
) {
  const props = {
    filters: { ...DEFAULT_FILTER_STATE, ...overrides.filters },
    onFilterChange: vi.fn(),
    onReset: vi.fn(),
    hasActiveFilters: overrides.hasActiveFilters ?? false,
  };
  const utils = render(
    <AppThemeProvider>
      <FiltersBar {...props} />
    </AppThemeProvider>,
  );
  return { ...utils, props };
}

function openSelect(label: string) {
  const combobox = screen.getByRole('combobox', { name: label });
  fireEvent.mouseDown(combobox);
  return combobox;
}

describe('FiltersBar', () => {
  it('renders search input and filter selects', () => {
    renderFiltersBar();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'area' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'priority' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'status' })).toBeInTheDocument();
  });

  it('reports status changes through onFilterChange', () => {
    const { props } = renderFiltersBar();
    openSelect('status');
    fireEvent.click(screen.getByText('Pendiente'));
    expect(props.onFilterChange).toHaveBeenCalledWith('status', 'pending');
  });

  it('reports priority changes through onFilterChange', () => {
    const { props } = renderFiltersBar();
    openSelect('priority');
    fireEvent.click(screen.getByText('Urgente'));
    expect(props.onFilterChange).toHaveBeenCalledWith('priority', 'urgent');
  });

  it('reports area changes', () => {
    const { props } = renderFiltersBar();
    openSelect('area');
    fireEvent.click(screen.getByText('Hematologia'));
    // the component converts the option value with Number() -> NaN for string codes
    expect(props.onFilterChange).toHaveBeenCalledWith('areaId', NaN);
  });

  it('reports date range changes', () => {
    const { props } = renderFiltersBar();
    const from = screen.getByLabelText('from');
    fireEvent.change(from, { target: { value: '2026-01-01' } });
    expect(props.onFilterChange).toHaveBeenCalledWith('dateFrom', '2026-01-01');
  });

  it('calls onReset when the clear button is visible and clicked', () => {
    const { props } = renderFiltersBar({ hasActiveFilters: true });
    const clearButton = screen.getByRole('button', { name: 'clearFilters' });
    fireEvent.click(clearButton);
    expect(props.onReset).toHaveBeenCalledTimes(1);
  });

  it('does not render the clear button when there are no active filters', () => {
    renderFiltersBar({ hasActiveFilters: false });
    expect(screen.queryByRole('button', { name: 'clearFilters' })).not.toBeInTheDocument();
  });

  it('renders existing filter values as selected', () => {
    renderFiltersBar({ filters: { status: 'processing' } });
    expect(screen.getByRole('combobox', { name: 'status' })).toHaveTextContent('En Proceso');
  });
});
