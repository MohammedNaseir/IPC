// Route-level loading placeholder (research.md R-006): every record screen is a server component, so the
// only real wait is the route transition, which `loading.tsx` renders. No data, no hooks, no client JS.

interface TableSkeletonProps {
  /** Placeholder rows; defaults to a typical page. */
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 8, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="space-y-6 pb-12" dir="rtl" aria-busy="true" aria-live="polite">
      <span className="sr-only">جارٍ تحميل البيانات…</span>

      <div className="bg-white p-5 rounded-lg border border-slate-300 space-y-2">
        <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
        <div className="h-5 w-72 rounded bg-slate-200 animate-pulse" />
        <div className="h-3 w-96 max-w-full rounded bg-slate-100 animate-pulse" />
      </div>

      {/* Matches the printed-register chrome (item 7, T3): flat, bordered, no shadow, a heavier
          header rule instead of a tinted fill -- so the loading state previews what is coming. */}
      <div className="bg-white rounded-lg border border-slate-300 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="h-8 w-full max-w-xs rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
        </div>

        <div className="hidden md:block">
          <div className="flex bg-white border-b-2 border-slate-800">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex-1 py-3 px-4">
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-200">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex">
                {Array.from({ length: columns }).map((_, c) => (
                  <div key={c} className="flex-1 py-3.5 px-4">
                    <div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: `${55 + ((r + c) % 4) * 10}%` }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="md:hidden divide-y divide-slate-200">
          {Array.from({ length: Math.min(rows, 4) }).map((_, r) => (
            <div key={r} className="p-4 space-y-2">
              <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
