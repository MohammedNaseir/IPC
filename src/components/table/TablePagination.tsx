'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useId } from 'react';
import { PAGE_SIZE_OPTIONS } from '@/lib/table';

interface TablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// Icons follow reading order, not code order: in RTL "previous" sits on the right.
export function TablePagination({
  page,
  pageCount,
  pageSize,
  filteredCount,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const selectId = useId();
  const first = filteredCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, filteredCount);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  const button =
    'p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div className="p-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
      <div className="flex items-center gap-2 text-slate-500">
        <label htmlFor={selectId} className="font-medium">
          عدد السجلات في الصفحة
        </label>
        <select
          id={selectId}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="p-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-slate-500" aria-live="polite">
          {filteredCount === 0 ? 'لا سجلات' : `${first}–${last} من ${filteredCount}`}
          <span className="text-slate-400"> • صفحة {page} من {pageCount}</span>
        </span>

        <nav className="flex items-center gap-1" aria-label="تنقل بين صفحات الجدول">
          <button type="button" onClick={() => onPageChange(1)} disabled={atStart} className={button} title="الصفحة الأولى">
            <ChevronsRight className="w-3.5 h-3.5" />
            <span className="sr-only">الصفحة الأولى</span>
          </button>
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={atStart} className={button} title="الصفحة السابقة">
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="sr-only">الصفحة السابقة</span>
          </button>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={atEnd} className={button} title="الصفحة التالية">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="sr-only">الصفحة التالية</span>
          </button>
          <button type="button" onClick={() => onPageChange(pageCount)} disabled={atEnd} className={button} title="الصفحة الأخيرة">
            <ChevronsLeft className="w-3.5 h-3.5" />
            <span className="sr-only">الصفحة الأخيرة</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
