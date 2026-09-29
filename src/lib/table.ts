// Shared presentation types and pure helpers for the record tables.
// No React, no server imports: the verification harness exercises the comparison and normalisation
// rules directly from here.

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ColumnValueType = 'text' | 'number' | 'date';

export interface ColumnDef<T> {
  /** Stable identifier, used for sort state and as the React key. */
  key: string;
  /** Arabic column heading; doubles as the field label in the stacked-card layout. */
  header: string;
  /** The sortable/searchable primitive for this cell. Return null when the record has no value. */
  value: (row: T) => string | number | null;
  /** Presentation when the cell is more than text. Defaults to the value, or a dash when null. */
  render?: (row: T) => ReactNode;
  /** Chooses the comparator. Defaults to 'text'. */
  type?: ColumnValueType;
  /** Defaults to true. */
  sortable?: boolean;
  /** Defaults to true for text columns, false for number/date columns. */
  searchable?: boolean;
  align?: 'start' | 'end';
  /** Omit this field from the stacked-card layout when it is noise on a phone. */
  hideBelowMd?: boolean;
}

export interface RowAction<T> {
  label: string;
  icon: LucideIcon;
  /** Calls the screen's existing handler; the table adds no behaviour of its own. */
  onSelect: (row: T) => void;
  /** Hide the action for rows that cannot accept it, e.g. an archived visit. */
  isAvailable?: (row: T) => boolean;
  tone?: 'default' | 'primary';
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/**
 * What a list remembers across a trip to a record page and back. Deliberately **not** carried in the
 * address: a list's URL stays constant as the user searches, sorts and pages, so a shared or bookmarked
 * list link opens the unfiltered list.
 *
 * The table owns `query`, `sort`, `page` and `pageSize`. `filters` belongs to the screen — its own
 * status/hospital/type selects — and is written by the list view, under the same key, so the two halves
 * cannot fall out of step.
 */
export interface ListViewState {
  query: string;
  sort: SortState | null;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
}

export interface TableStateOptions {
  initialSort?: SortState | null;
  pageSize?: number;
  /**
   * Opts this table instance into state restoration, keyed by this string. Inert when unset: no read,
   * no write, no store entry. Two tables must never share a key — a collision silently hands one
   * table's state to another.
   */
  stateKey?: string;
}

export function isColumnSearchable<T>(column: ColumnDef<T>): boolean {
  return column.searchable ?? (column.type ?? 'text') === 'text';
}

export function isColumnSortable<T>(column: ColumnDef<T>): boolean {
  return column.sortable ?? true;
}

// One collator for the whole module: constructing one per comparison is measurably slow on the
// 1,000-row target. The 'ar' locale orders Arabic alphabetically (raw code-unit comparison does not),
// and numeric:true keeps "9" before "10" inside mixed strings.
const arabicCollator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

const ARABIC_DIACRITICS = /[ً-ْٰـ]/g;
const ALEF_VARIANTS = /[أإآٱ]/g;

/**
 * Normalises text for substring matching: Arabic is typically typed without diacritics and with
 * inconsistent alef hamza, so a raw search misses values entered with them. Deliberately does NOT
 * fold ة→ه or ى→ي, which would broaden matching into genuinely different words.
 * Never used for display.
 */
export function normalizeForSearch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(ALEF_VARIANTS, 'ا');
}

/**
 * Compares two cell values. Absent values always sort last, in both directions, so toggling the
 * direction never scatters the dashes through the column.
 */
export function compareValues(
  a: string | number | null,
  b: string | number | null,
  type: ColumnValueType = 'text',
  direction: SortDirection = 'asc',
): number {
  const aMissing = a === null || a === '';
  const bMissing = b === null || b === '';
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  let result: number;
  if (type === 'number') {
    result = Number(a) - Number(b);
  } else if (type === 'date') {
    result = new Date(String(a)).getTime() - new Date(String(b)).getTime();
  } else {
    result = arabicCollator.compare(String(a), String(b));
  }

  return direction === 'asc' ? result : -result;
}

export function matchesQuery<T>(row: T, columns: ColumnDef<T>[], normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return columns.some((column) => {
    if (!isColumnSearchable(column)) return false;
    const value = column.value(row);
    if (value === null) return false;
    return normalizeForSearch(String(value)).includes(normalizedQuery);
  });
}

export interface TableState<T> {
  query: string;
  setQuery: (value: string) => void;
  sort: SortState | null;
  toggleSort: (key: string) => void;
  /** Returns to the order the rows arrived in — the screen's existing order. */
  clearSort: () => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  /** Every row matching the search, sorted — the set the audit export uses. */
  filteredRows: T[];
  /** The current page slice. */
  visibleRows: T[];
  /** `rows.length` before filtering; drives the "screen has no records" state. */
  totalCount: number;
  filteredCount: number;
  pageCount: number;
}
