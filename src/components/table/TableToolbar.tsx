'use client';

import { Search, X } from 'lucide-react';
import { useId } from 'react';

interface TableToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** Rows matching the current search. */
  filteredCount: number;
  /** Rows before the search, so the toolbar can say "12 of 62". */
  totalCount: number;
  placeholder?: string;
}

export function TableToolbar({ query, onQueryChange, filteredCount, totalCount, placeholder }: TableToolbarProps) {
  const inputId = useId();
  const filtering = query.trim() !== '';

  return (
    <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="relative flex-1 sm:max-w-sm">
        <label htmlFor={inputId} className="sr-only">
          بحث في السجلات
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder ?? 'بحث في السجلات...'}
          className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-muted focus:bg-white focus:ring-2 focus:ring-navy-600 focus:outline-none"
        />
        <Search className="w-3.5 h-3.5 text-muted absolute right-2.5 top-2.5 pointer-events-none" aria-hidden="true" />
        {filtering && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            title="إلغاء البحث"
            className="absolute left-2 top-2 p-0.5 text-muted hover:text-slate-700 rounded"
          >
            <X className="w-3.5 h-3.5" />
            <span className="sr-only">إلغاء البحث</span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500 shrink-0" aria-live="polite">
        {filtering ? (
          <>
            <span className="font-bold text-slate-700">{filteredCount}</span> سجل مطابق من أصل {totalCount}
          </>
        ) : (
          <>
            <span className="font-bold text-slate-700">{totalCount}</span> سجل
          </>
        )}
      </p>
    </div>
  );
}
