import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable, type DataTableColumn } from '@/shared/components/ui/DataTable';

interface Row {
  id: number;
  name: string;
  age: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Nombre', sortable: true },
  { key: 'age', header: 'Edad' },
];

const data: Row[] = [
  { id: 1, name: 'Ana', age: 30 },
  { id: 2, name: 'Luis', age: 25 },
  { id: 3, name: 'Beto', age: 40 },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={data}
      keyExtractor={(item) => item.id}
      {...props}
    />,
  );
}

describe('DataTable', () => {
  it('renders column headers', () => {
    renderTable();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Edad')).toBeInTheDocument();
  });

  it('renders one row per item', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4); // header + 3 data rows
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
  });

  it('uses a custom render function for cells', () => {
    const customColumns: DataTableColumn<Row>[] = [
      { key: 'name', header: 'Nombre', render: (item) => <strong>{item.name.toUpperCase()}</strong> },
    ];
    render(<DataTable columns={customColumns} data={data} keyExtractor={(r) => r.id} />);
    expect(screen.getByText('ANA')).toBeInTheDocument();
  });

  it('shows a spinner while loading', () => {
    const { container } = renderTable({ loading: true });
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is no data', () => {
    renderTable({ data: [], emptyTitle: 'Sin registros', emptyMessage: 'No hay nada aún' });
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('No hay nada aún')).toBeInTheDocument();
  });

  it('uses the translated default empty title', () => {
    renderTable({ data: [] });
    expect(screen.getByText('noData')).toBeInTheDocument();
  });

  it('renders and triggers the empty action', () => {
    const onAction = vi.fn();
    renderTable({ data: [], emptyAction: <button onClick={onAction}>Crear</button> });
    fireEvent.click(screen.getByRole('button', { name: /crear/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('triggers onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    fireEvent.click(screen.getByText('Luis'));
    expect(onRowClick).toHaveBeenCalledWith({ id: 2, name: 'Luis', age: 25 });
  });

  it('sorts client-side when a sortable header is clicked', () => {
    renderTable();
    const rows = () => screen.getAllByRole('row');
    expect(rows()[2].textContent).toContain('Luis'); // initial: Ana, Luis, Beto
    fireEvent.click(screen.getByRole('button', { name: /nombre/i }));
    // ascending sort: Ana, Beto, Luis
    expect(rows()[1].textContent).toContain('Ana');
    expect(rows()[2].textContent).toContain('Beto');
    expect(rows()[3].textContent).toContain('Luis');
    fireEvent.click(screen.getByRole('button', { name: /nombre/i }));
    // descending sort: Luis, Beto, Ana
    expect(rows()[1].textContent).toContain('Luis');
    expect(rows()[3].textContent).toContain('Ana');
  });

  it('reports sort changes when onSortChange is provided', () => {
    const onSortChange = vi.fn();
    renderTable({ onSortChange });
    fireEvent.click(screen.getByRole('button', { name: /nombre/i }));
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('shows pagination and notifies page changes', () => {
    const onPageChange = vi.fn();
    renderTable({ onPageChange, rowsPerPage: 2 });
    fireEvent.click(screen.getByRole('button', { name: /go to next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('notifies rows-per-page changes', () => {
    const onRowsPerPageChange = vi.fn();
    const onPageChange = vi.fn();
    renderTable({ onRowsPerPageChange, onPageChange, rowsPerPage: 2, page: 1 });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText('25'));
    expect(onRowsPerPageChange).toHaveBeenCalledWith(25);
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('selects all rows on the page with the header checkbox', () => {
    const onSelectionChange = vi.fn();
    renderTable({ selectable: true, onSelectionChange });
    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(headerCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('toggles individual row selection', () => {
    const onSelectionChange = vi.fn();
    renderTable({ selectable: true, onSelectionChange });
    const rowCheckbox = screen.getAllByRole('checkbox')[1];
    fireEvent.click(rowCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith([1]);
  });

  it('does not slice data in server-side mode', () => {
    const manyRows = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `P${i + 1}`, age: i }));
    renderTable({ data: manyRows, serverSide: true });
    expect(screen.getAllByRole('row')).toHaveLength(16); // header + 15 rows
  });

  it('renders pagination based on the total prop in server-side mode', () => {
    const onPageChange = vi.fn();
    renderTable({ serverSide: true, total: 100, page: 0, rowsPerPage: 10, onPageChange });
    fireEvent.click(screen.getByRole('button', { name: /go to next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
