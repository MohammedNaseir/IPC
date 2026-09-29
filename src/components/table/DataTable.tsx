'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { isColumnSortable, type ColumnDef, type RowAction, type SortState } from '@/lib/table';
import { useTableState } from '@/components/table/useTableState';
import { TableToolbar } from '@/components/table/TableToolbar';
import { TablePagination } from '@/components/table/TablePagination';
import { TableEmptyState } from '@/components/table/TableEmptyState';
import { TableSkeleton } from '@/components/table/TableSkeleton';

export interface DataTableProps<T> {
  /** Already-scoped records from the screen's props. The table never fetches and never filters by role. */
  rows: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T) => string;
  actions?: RowAction<T>[];
  /** Makes the whole row activatable; used by the master-detail screens. */
  onRowSelect?: (row: T) => void;
  /** Owned by the parent screen, never by the table. */
  selectedRowKey?: string | null;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noMatchMessage?: string;
  initialSort?: SortState;
  pageSize?: number;
  isLoading?: boolean;
  onStateChange?: (state: { filteredRows: T[]; filteredCount: number }) => void;
  /** Accessible name for the table element. */
  caption?: string;
  /**
   * Opts this instance into list-state restoration, keyed by this string (feature 003). The table's
   * search, sort, page and page size are restored when it remounts — after a trip to a record page and
   * back — instead of resetting. Inert when unset; two tables must never share a key.
   */
  stateKey?: string;
}

const DASH = '—';

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  actions,
  onRowSelect,
  selectedRowKey = null,
  searchPlaceholder,
  emptyMessage,
  noMatchMessage,
  initialSort,
  pageSize,
  isLoading = false,
  onStateChange,
  caption,
  stateKey,
}: DataTableProps<T>) {
  const instanceId = useId();
  const state = useTableState(rows, columns, { initialSort: initialSort ?? null, pageSize, stateKey });
  const { visibleRows, filteredRows, filteredCount, totalCount } = state;

  const visibleActions = actions?.length ? actions : null;
  const columnCount = columns.length + (visibleActions ? 1 : 0);

  // Reporting the filtered set lets a screen mirror the count in its heading and lets the audit screen
  // export what the user sees. Guarded by a signature so a caller that rebuilds `columns` inline on every
  // render cannot drive an update loop through its own state.
  const signature = useMemo(() => `${filteredCount}:${filteredRows.map(rowKey).join('|')}`, [filteredRows, filteredCount, rowKey]);
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!onStateChange || reported.current === signature) return;
    reported.current = signature;
    onStateChange({ filteredRows, filteredCount });
    // filteredRows/filteredCount are captured by the signature; depending on them directly would fire the
    // effect for identity changes that carry no new information.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, onStateChange]);

  if (isLoading) return <TableSkeleton columns={Math.min(columnCount, 6)} />;

  const emptyVariant = totalCount === 0 ? 'empty' : filteredCount === 0 ? 'noMatch' : null;

  function cellContent(column: ColumnDef<T>, row: T) {
    if (column.render) return column.render(row);
    const value = column.value(row);
    return value === null || value === '' ? <span className="text-muted">{DASH}</span> : value;
  }

  function rowActionsFor(row: T) {
    return (visibleActions ?? []).filter((action) => action.isAvailable?.(row) ?? true);
  }

  return (
    // A labelled region, so a screen with two tables announces which one the focus is in.
    <section aria-label={caption ?? 'جدول السجلات'} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden" dir="rtl">
      <TableToolbar
        query={state.query}
        onQueryChange={state.setQuery}
        filteredCount={filteredCount}
        totalCount={totalCount}
        placeholder={searchPlaceholder}
      />

      {emptyVariant ? (
        <TableEmptyState variant={emptyVariant} message={emptyVariant === 'empty' ? emptyMessage : noMatchMessage} />
      ) : (
        <>
        {/* Wide layout: a real table from the md breakpoint up (research.md R-004). Both layouts are
            rendered and chosen by CSS, so the first paint is correct and server and client markup agree. */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-right text-xs">
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                {columns.map((column) => {
                  const sortable = isColumnSortable(column);
                  const active = state.sort?.key === column.key;
                  const ariaSort = active ? (state.sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined;
                  const Icon = active ? (state.sort!.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={ariaSort}
                      className={`py-3 px-4 whitespace-nowrap ${column.align === 'end' ? 'text-left' : ''}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => state.toggleSort(column.key)}
                          className={`inline-flex items-center gap-1.5 rounded hover:text-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 ${
                            active ? 'text-navy-800' : ''
                          }`}
                          title={`ترتيب حسب ${column.header}`}
                        >
                          <span>{column.header}</span>
                          <Icon className={`w-3 h-3 ${active ? 'text-navy-700' : 'text-muted'}`} aria-hidden="true" />
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
                {visibleActions && (
                  <th scope="col" className="py-3 px-4 text-left whitespace-nowrap">
                    إجراءات
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {visibleRows.map((row) => {
                const key = rowKey(row);
                const selected = selectedRowKey !== null && key === selectedRowKey;
                const selectable = Boolean(onRowSelect);
                return (
                  <tr
                    key={key}
                    onClick={selectable ? () => onRowSelect!(row) : undefined}
                    onKeyDown={
                      selectable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowSelect!(row);
                            }
                          }
                        : undefined
                    }
                    tabIndex={selectable ? 0 : undefined}
                    aria-current={selected ? true : undefined}
                    className={`transition-colors ${selectable ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-600' : ''} ${
                      selected ? 'bg-navy-50/60 ring-1 ring-inset ring-navy-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={`py-3 px-4 align-top ${column.align === 'end' ? 'text-left' : ''}`}>
                        {cellContent(column, row)}
                      </td>
                    ))}

                    {visibleActions && (
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center gap-1 justify-end">
                          {rowActionsFor(row).map((action) => {
                            const Icon = action.icon;
                            return (
                              <button
                                key={action.label}
                                type="button"
                                title={action.label}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onSelect(row);
                                }}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  action.tone === 'primary'
                                    ? 'border-navy-200 text-navy-700 hover:bg-navy-50'
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                                <span className="sr-only">{action.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Narrow layout: one card per record, each field a label/value pair so no value loses its label
            (FR-022). Columns marked hideBelowMd are omitted (FR-015). No horizontal page scrolling. */}
        {/* There are no column headers to activate on a card, so sorting gets its own control here. */}
        <div className="md:hidden px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2 text-[11px]">
          <label htmlFor={`${instanceId}-sort`} className="text-slate-500 shrink-0">
            ترتيب حسب
          </label>
          <select
            id={`${instanceId}-sort`}
            value={state.sort?.key ?? ''}
            onChange={(e) => (e.target.value ? state.toggleSort(e.target.value) : state.clearSort())}
            className="flex-1 min-w-0 p-1 bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="">الترتيب الافتراضي</option>
            {columns.filter(isColumnSortable).map((column) => (
              <option key={column.key} value={column.key}>
                {column.header}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!state.sort}
            onClick={() => state.sort && state.toggleSort(state.sort.key)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 bg-white disabled:opacity-40"
            title={state.sort?.direction === 'desc' ? 'ترتيب تنازلي — اضغط للتصاعدي' : 'ترتيب تصاعدي — اضغط للتنازلي'}
          >
            {state.sort?.direction === 'desc' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
            <span className="sr-only">عكس اتجاه الترتيب</span>
          </button>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {visibleRows.map((row) => {
            const key = rowKey(row);
            const selected = selectedRowKey !== null && key === selectedRowKey;
            const selectable = Boolean(onRowSelect);
            const cardActions = rowActionsFor(row);
            const [first, ...rest] = columns.filter((column) => !column.hideBelowMd);
            return (
              <div
                key={key}
                onClick={selectable ? () => onRowSelect!(row) : undefined}
                onKeyDown={
                  selectable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowSelect!(row);
                        }
                      }
                    : undefined
                }
                tabIndex={selectable ? 0 : undefined}
                aria-current={selected ? true : undefined}
                className={`p-4 text-xs ${selectable ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-600' : ''} ${
                  selected ? 'bg-navy-50/60 ring-1 ring-inset ring-navy-600' : ''
                }`}
              >
                {first && (
                  <p className="font-bold text-slate-900 leading-snug mb-2">
                    <span className="sr-only">{first.header}: </span>
                    {cellContent(first, row)}
                  </p>
                )}

                <dl className="space-y-1.5">
                  {rest.map((column) => (
                    <div key={column.key} className="flex items-start justify-between gap-3">
                      <dt className="text-[11px] text-muted shrink-0">{column.header}</dt>
                      <dd className="text-slate-700 text-left min-w-0">{cellContent(column, row)}</dd>
                    </div>
                  ))}
                </dl>

                {cardActions.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                    {cardActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onSelect(row);
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                            action.tone === 'primary'
                              ? 'border-navy-200 text-navy-700 hover:bg-navy-50'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {!emptyVariant && (
        <TablePagination
          page={state.page}
          pageCount={state.pageCount}
          pageSize={state.pageSize}
          filteredCount={filteredCount}
          onPageChange={state.setPage}
          onPageSizeChange={state.setPageSize}
        />
      )}
    </section>
  );
}
