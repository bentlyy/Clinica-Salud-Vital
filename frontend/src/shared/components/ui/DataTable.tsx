import { useState, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Checkbox,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selected: (string | number)[]) => void;
  total?: number;
  page?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (limit: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (key: string, order: 'asc' | 'desc') => void;
  serverSide?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle,
  emptyMessage = '',
  emptyAction,
  onRowClick,
  selectable = false,
  onSelectionChange,
  total,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  sortBy: controlledSortBy,
  sortOrder: controlledSortOrder,
  onSortChange,
  serverSide = false,
}: DataTableProps<T>) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(10);
  const [internalSortBy, setInternalSortBy] = useState<string>('');
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const page = controlledPage ?? internalPage;
  const rowsPerPage = controlledRowsPerPage ?? internalRowsPerPage;
  const sortBy = controlledSortBy ?? internalSortBy;
  const sortOrder = controlledSortOrder ?? internalSortOrder;

  const sortedData = useMemo(() => {
    if (serverSide || !sortBy) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [data, sortBy, sortOrder, serverSide]);

  const pagedData = useMemo(() => {
    if (serverSide) return sortedData;
    const start = page * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, page, rowsPerPage, serverSide]);

  const totalPages = total !== undefined ? Math.ceil(total / rowsPerPage) : Math.ceil(data.length / rowsPerPage);

  const handleSort = (key: string) => {
    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    if (onSortChange) {
      onSortChange(key, newOrder);
    } else {
      setInternalSortBy(key);
      setInternalSortOrder(newOrder);
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    if (onPageChange) onPageChange(newPage);
    else setInternalPage(newPage);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    if (onRowsPerPageChange) onRowsPerPageChange(newLimit);
    else setInternalRowsPerPage(newLimit);
    if (onPageChange) onPageChange(0);
    else setInternalPage(0);
  };

  const handleSelectAll = () => {
    if (selected.size === pagedData.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const ids = pagedData.map(keyExtractor);
      setSelected(new Set(ids));
      onSelectionChange?.(ids);
    }
  };

  const handleSelectRow = (id: string | number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  return (
    <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.custom?.surface?.muted || theme.palette.background.default }}>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.size > 0 && selected.size < pagedData.length}
                    checked={pagedData.length > 0 && selected.size === pagedData.length}
                    onChange={handleSelectAll}
                    sx={{ '&.Mui-checked': { color: theme.palette.primary.main } }}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align || 'left'}
                  sx={{ fontWeight: 600, color: theme.palette.text.primary, width: col.width }}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortBy === col.key}
                      direction={sortBy === col.key ? sortOrder : 'asc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.header}
                    </TableSortLabel>
                  ) : (
                    col.header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <InboxOutlinedIcon sx={{ fontSize: 40, color: theme.palette.divider }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      {emptyTitle ?? t('noData')}
                    </Typography>
                    {emptyMessage && (
                      <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                        {emptyMessage}
                      </Typography>
                    )}
                    {emptyAction}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((item, idx) => {
                const id = keyExtractor(item);
                return (
                  <TableRow
                    key={id}
                    hover
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      '&:hover': onRowClick ? { backgroundColor: `${theme.palette.custom?.brand?.lightest || theme.palette.action.hover} !important` } : undefined,
                    }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.has(id)}
                          onChange={() => handleSelectRow(id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ '&.Mui-checked': { color: theme.palette.primary.main } }}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} align={col.align || 'left'}>
                        {col.render ? col.render(item, idx) : (item as Record<string, unknown>)[col.key] as ReactNode}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <TablePagination
          component="div"
          count={total ?? data.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage={t('rowsPerPage')}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} ${t('of')} ${count !== -1 ? count : `${t('moreThan')} ${to}`}`
          }
        />
      )}
    </Paper>
  );
}
