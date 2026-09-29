import { Inbox, SearchX } from 'lucide-react';

// FR-012: "this screen has no records" and "no records match the filter" are different facts and must
// never stand in for each other. The caller decides which one is true; this component only renders it.
export type TableEmptyVariant = 'empty' | 'noMatch';

interface TableEmptyStateProps {
  variant: TableEmptyVariant;
  /** Per-screen override; the defaults are deliberately generic. */
  message?: string;
}

const DEFAULTS: Record<TableEmptyVariant, string> = {
  empty: 'لا توجد سجلات في هذه الشاشة بعد',
  noMatch: 'لا توجد سجلات مطابقة للفلتر الحالي',
};

const HINTS: Record<TableEmptyVariant, string> = {
  empty: 'ستظهر السجلات هنا بمجرد إضافتها.',
  noMatch: 'جرّب تعديل كلمة البحث أو إعادة تعيين الفلاتر.',
};

export function TableEmptyState({ variant, message }: TableEmptyStateProps) {
  const Icon = variant === 'empty' ? Inbox : SearchX;
  return (
    <div className="py-12 px-6 text-center" dir="rtl">
      <Icon className="w-8 h-8 text-navy-500 mx-auto mb-3" aria-hidden="true" />
      <p className="text-xs font-semibold text-slate-500">{message ?? DEFAULTS[variant]}</p>
      <p className="text-[11px] text-muted mt-1">{HINTS[variant]}</p>
    </div>
  );
}
