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
  type TableStateOptions,
} from '@/lib/table';
import { readListState, writeListState } from '@/components/table/listStateStore';

/**
 * Sort/search/page state for one table instance (research.md R-005). A screen with two independent
 * sub-sections calls this twice, so state cannot leak between them. Selection is deliberately absent:
 * master-detail screens own the selected record so a filtered-out selection can still be reported.
 *
 * When `stateKey` is set, the state is restored from the client-side list store on mount and written
 * back as the user interacts, so a list keeps its place across a trip to a record page and back
 * (feature 003, FR-016). When it is unset the hook behaves exactly as it always has: no read, no write,
 * no store entry.
 */
export function useTableState<T>(
  rows: T[],
  columns: ColumnDef<T>[],
  options: TableStateOptions = {},
): TableState<T> {
  const { stateKey } = options;

  // Read once, in the initialiser. On a full page load the store is empty on both the server and the
  // client, so both render the default state and nothing mismatches; on a client-side back-navigation
  // this component mounts rather than hydrates, so there is no comparison to fail.
  const [query, setQueryRaw] = useState(() => readListState(stateKey)?.query ?? '');
  const [sort, setSortRaw] = useState<SortState | null>(
    () => readListState(stateKey)?.sort ?? options.initialSort ?? null,
  );
  const [page, setPageRaw] = useState(() => readListState(stateKey)?.page ?? 1);
  const [pageSize, setPageSizeRaw] = useState(
    () => readListState(stateKey)?.pageSize ?? options.pageSize ?? DEFAULT_PAGE_SIZE,
  );

  // Every setter below runs from an event handler, never during a render, which is what keeps the store
  // from ever being written on the server.
  const setQueryStored = (value: string) => {
    setQueryRaw(value);
    setPageRaw(1); // FR-009
    writeListState(stateKey, { query: value, page: 1 });
  };
  const setSortStored = (next: SortState | null, resetPage: boolean) => {
    setSortRaw(next);
    if (resetPage) setPageRaw(1);
    writeListState(stateKey, resetPage ? { sort: next, page: 1 } : { sort: next });
  };

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
    setQuery: setQueryStored,
    sort,
    toggleSort: (key: string) => {
      const next: SortState =
        sort?.key === key ? { key, direction: sort.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' };
      // A new sort column can move the wanted row anywhere, so start from page 1; reversing the
      // direction of the current column keeps the page the user is on.
      setSortStored(next, sort?.key !== key);
    },
    clearSort: () => setSortStored(null, false),
    page: currentPage,
    setPage: (value: number) => {
      const next = Math.min(Math.max(value, 1), pageCount);
      setPageRaw(next);
      writeListState(stateKey, { page: next });
    },
    pageSize,
    setPageSize: (value: number) => {
      setPageSizeRaw(value);
      setPageRaw(1);
      writeListState(stateKey, { pageSize: value, page: 1 });
    },
    filteredRows,
    visibleRows,
    totalCount: rows.length,
    filteredCount,
    pageCount,
  };
}
