import { type ReactNode, useState, useMemo, useCallback, type CSSProperties } from 'react';
import './DataTable.css';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  loading?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: ReactNode;
  onRowClick?: (item: T) => void;
  selectedId?: string | number | null;
  sortable?: boolean;
  pageSize?: number;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  total?: number;
  className?: string;
  style?: CSSProperties;
  stickyHeader?: boolean;
}

function DataTable<T>({
  columns, data, keyExtractor,
  loading = false,
  emptyIcon = '📋', emptyTitle = 'No hay datos', emptyText = '',
  emptyAction, onRowClick, selectedId = null,
  sortable = false, pageSize = 0, showPagination = false,
  currentPage: controlledPage, totalPages: controlledTotalPages,
  onPageChange, total, className = '', style, stickyHeader = true,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const isControlled = controlledPage !== undefined;
  const page = isControlled ? controlledPage : internalPage;
  const totalPages = isControlled ? (controlledTotalPages || 1) : Math.ceil(data.length / (pageSize || data.length));

  const handleSort = (key: string) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const pagedData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return sortedData;
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (onPageChange) onPageChange(newPage);
    else setInternalPage(newPage);
  };

  const renderSortIndicator = (col: Column<T>) => {
    if (!sortable || !col.sortable) return null;
    const active = sortKey === col.key;
    const arrow = active ? (sortDir === 'asc' ? '↑' : '↓') : '↕';
    return <span className={`ds-table-sort-icon${active ? ' ds-table-sort-icon--active' : ''}`}>{arrow}</span>;
  };

  if (loading) {
    return (
      <div className={`ds-table-wrapper ${className}`} style={style}>
        <div className="ds-table-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ds-table-loading-row">
              {columns.map((col) => (
                <div key={col.key} className="ds-table-loading-cell" style={{ width: col.width || '100%' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`ds-table-wrapper ${className}`} style={style}>
      <table className="ds-table">
        {stickyHeader && <colgroup>{columns.map((col) => (<col key={col.key} style={{ width: col.width }} />))}</colgroup>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${sortable && col.sortable ? 'ds-table-th--sortable' : ''} ${col.className || ''}`}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{ textAlign: col.align || 'left' }}
              >
                <span className="ds-table-th-content">
                  {col.header}
                  {renderSortIndicator(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="ds-table-empty">
                  <div className="ds-table-empty-icon">{emptyIcon}</div>
                  <div className="ds-table-empty-title">{emptyTitle}</div>
                  {emptyText && <div className="ds-table-empty-text">{emptyText}</div>}
                  {emptyAction && <div>{emptyAction}</div>}
                </div>
              </td>
            </tr>
          ) : (
            pagedData.map((item, idx) => {
              const id = keyExtractor(item);
              return (
                <tr
                  key={id}
                  className={`${onRowClick ? 'ds-table-row--clickable' : ''}${selectedId === id ? ' ds-table-row--selected' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(item, idx) : (item as Record<string, unknown>)[col.key] as ReactNode}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {showPagination && totalPages > 1 && (
        <div className="ds-table-pagination">
          <div className="ds-table-pagination-info">
            Página {page} de {totalPages}{total !== undefined ? ` · ${total} registros` : ''}
          </div>
          <div className="ds-table-pagination-buttons">
            <button className="ds-table-pagination-btn" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>←</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const start = Math.max(1, page - 3);
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  className={`ds-table-pagination-btn${p === page ? ' ds-table-pagination-btn--active' : ''}`}
                  onClick={() => handlePageChange(p)}
                >{p}</button>
              );
            })}
            <button className="ds-table-pagination-btn" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
