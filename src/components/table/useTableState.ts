'use client';

import { useMemo, useState } from 'react';
import {
  DEFAULT_PAGE_SIZE,
  compareValues,
  matchesQuery,
  normalizeForSearch,
  type ColumnDef,
  type SortState,
  type TableState,
} from '@/lib/table';

interface UseTableStateOptions {
  initialSort?: SortState | null;
  pageSize?: number;
}

/**
 * Sort/search/page state for one table instance (research.md R-005). A screen with two independent
 * sub-sections calls this twice, so state cannot leak between them. Selection is deliberately absent:
 * master-detail screens own the selected record so a filtered-out selection can still be reported.
 */
export function useTableState<T>(
  rows: T[],
  columns: ColumnDef<T>[],
  options: UseTableStateOptions = {},
): TableState<T> {
  const [query, setQueryRaw] = useState('');
  const [sort, setSort] = useState<SortState | null>(options.initialSort ?? null);
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(options.pageSize ?? DEFAULT_PAGE_SIZE);

  const filteredRows = useMemo(() => {
    const normalized = normalizeForSearch(query);
    const matched = normalized ? rows.filter((row) => matchesQuery(row, columns, normalized)) : rows.slice();
    if (!sort) return matched;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return matched;
    // Sorting a copy: the table never mutates the array the screen passed in.
    return matched
      .slice()
      .sort((a, b) => compareValues(column.value(a), column.value(b), column.type ?? 'text', sort.direction));
  }, [rows, columns, query, sort]);

  const filteredCount = filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(filteredCount / pageSize));
  // Clamp rather than store a corrected page: a filter that shrinks the set must never leave a blank page
  // on screen, and correcting state during render would be a second render pass for nothing.
  const currentPage = Math.min(Math.max(page, 1), pageCount);

  const visibleRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredRows, currentPage, pageSize],
  );

  return {
    query,
    setQuery: (value: string) => {
      setQueryRaw(value);
      setPageRaw(1); // FR-009
    },
    sort,
    toggleSort: (key: string) => {
      setSort((current) =>
        current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
      );
      // A new sort column can move the wanted row anywhere, so start from page 1; reversing the
      // direction of the current column keeps the page the user is on.
      if (sort?.key !== key) setPageRaw(1);
    },
    clearSort: () => setSort(null),
    page: currentPage,
    setPage: (value: number) => setPageRaw(Math.min(Math.max(value, 1), pageCount)),
    pageSize,
    setPageSize: (value: number) => {
      setPageSizeRaw(value);
      setPageRaw(1);
    },
    filteredRows,
    visibleRows,
    totalCount: rows.length,
    filteredCount,
    pageCount,
  };
}
