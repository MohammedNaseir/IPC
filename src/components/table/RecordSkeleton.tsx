// Route-level loading placeholder for a record page. Shaped like a record — a header bar, a couple of
// panels, a gallery row — rather than like a table, because a table skeleton would be a lie about what is
// coming (feature 003, SC-004).

interface RecordSkeletonProps {
  /** Placeholder panels below the header. */
  panels?: number;
  /** Render a thumbnail row, as the visit record's attachment gallery has. */
  gallery?: boolean;
}

export function RecordSkeleton({ panels = 3, gallery = true }: RecordSkeletonProps) {
  return (
    <div className="space-y-6 pb-12" dir="rtl" aria-busy="true" aria-live="polite">
      <span className="sr-only">جارٍ تحميل السجل…</span>

      <div className="h-8 w-48 rounded-lg bg-slate-100 animate-pulse" />

      {/* Matches the printed-register chrome (item 7, T3): flat, bordered, no shadow. */}
      <div className="bg-white rounded-lg border border-slate-300 p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-40 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-5 w-64 max-w-full rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-80 max-w-full rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-slate-100 animate-pulse shrink-0" />
        </div>

        {Array.from({ length: panels }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-36 rounded bg-slate-200 animate-pulse" />
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
              <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}

        {gallery && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                <div className="h-24 w-full rounded bg-slate-200 animate-pulse mb-2" />
                <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
