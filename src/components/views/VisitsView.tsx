'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import type { HospitalDTO, SessionUser, VisitDTO } from '@/lib/types';
import type { ColumnDef } from '@/lib/table';
import { DataTable } from '@/components/table/DataTable';
import { readListFilters, writeListFilters } from '@/components/table/listStateStore';
import { formatDate, todayInputValue } from '@/lib/format';
import { createVisit } from '@/server/actions/visits';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface VisitsViewProps {
  user: SessionUser;
  visits: VisitDTO[];
  hospitals: HospitalDTO[];
}

// One key for this screen's table and its filter selects, so the two halves of the list's place cannot
// fall out of step when the user comes back from a record page.
const LIST_KEY = 'visits';

export function VisitsView({ user, visits, hospitals }: VisitsViewProps) {
  const isCentral = user.role === 'central';
  const router = useRouter();
  const { run, isPending } = useActionRunner();

  // Restored from the list store on mount, so returning from a record page lands where the user left.
  const [filterStatus, setFilterStatus] = useState<string>(() => readListFilters(LIST_KEY)?.status ?? 'all');
  const [filterHospital, setFilterHospital] = useState<string>(() => readListFilters(LIST_KEY)?.hospital ?? '');
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHospId, setNewHospId] = useState(hospitals[0]?.id ?? '');
  const [newDate, setNewDate] = useState(todayInputValue());
  const [newTeam, setNewTeam] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCompliance, setNewCompliance] = useState('');

  const rememberFilters = (next: { status?: string; hospital?: string }) => {
    writeListFilters(LIST_KEY, {
      status: next.status ?? filterStatus,
      hospital: next.hospital ?? filterHospital,
    });
  };

  // The two selects keep filtering here, exactly as before; the table adds search, sort and paging on top.
  const scopedVisits = useMemo(
    () =>
      visits.filter((v) => {
        if (filterStatus !== 'all' && v.status !== filterStatus) return false;
        if (isCentral && filterHospital && v.hospitalId !== filterHospital) return false;
        return true;
      }),
    [visits, filterStatus, filterHospital, isCentral],
  );

  const visitColumns = useMemo<ColumnDef<VisitDTO>[]>(
    () => [
      {
        key: 'hospitalName',
        header: 'المستشفى',
        value: (v) => v.hospitalName,
        // A real link, not just a clickable row: the destination needs link semantics so it is announced
        // as a navigation and supports middle-click and "open in new tab" (FR-005).
        render: (v) => (
          <Link
            href={`/visits/${v.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-slate-900 hover:text-teal-700 hover:underline"
          >
            {v.hospitalName}
          </Link>
        ),
      },
      {
        key: 'visitDate',
        header: 'تاريخ الزيارة',
        type: 'date',
        value: (v) => v.visitDate,
        render: (v) => <span className="whitespace-nowrap">{formatDate(v.visitDate)}</span>,
      },
      { key: 'team', header: 'الفريق الزائر', value: (v) => v.team },
      {
        key: 'status',
        header: 'الحالة',
        value: (v) => (v.status === 'completed' ? 'مكتمل ومؤرشف' : 'قيد المتابعة'),
        render: (v) => (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
              v.status === 'completed'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {v.status === 'completed' ? 'مكتمل ومؤرشف' : 'قيد المتابعة'}
          </span>
        ),
      },
      {
        key: 'complianceScore',
        header: 'الامتثال',
        type: 'number',
        align: 'end',
        value: (v) => v.complianceScore,
        render: (v) =>
          v.complianceScore === null ? (
            <span className="text-slate-300">—</span>
          ) : (
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded whitespace-nowrap">
              {v.complianceScore}%
            </span>
          ),
        hideBelowMd: true,
      },
      {
        key: 'attachments',
        header: 'المرفقات',
        type: 'number',
        align: 'end',
        value: (v) => v.attachments.length,
        hideBelowMd: true,
      },
      {
        key: 'responses',
        header: 'ردود المستشفى',
        type: 'number',
        align: 'end',
        value: (v) => v.responses.length,
        hideBelowMd: true,
      },
      {
        // The cards showed the details text, so it stays visible and searchable (FR-023).
        key: 'details',
        header: 'التفاصيل',
        sortable: false,
        value: (v) => v.details,
        render: (v) => (
          <span className="block max-w-[26rem] truncate text-slate-600" title={v.details}>
            {v.details}
          </span>
        ),
        hideBelowMd: true,
      },
    ],
    [],
  );

  const handleTableState = useCallback(
    ({ filteredCount }: { filteredRows: VisitDTO[]; filteredCount: number }) => setVisibleCount(filteredCount),
    [],
  );

  const openCreateModal = () => {
    setNewHospId(hospitals[0]?.id ?? '');
    setNewDate(todayInputValue());
    setNewTeam('');
    setNewDetails('');
    setNewCompliance('');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      hospitalId: newHospId,
      visitDate: newDate,
      team: newTeam,
      details: newDetails,
      complianceScore: newCompliance.trim() === '' ? null : Number(newCompliance),
    };
    run(
      () => createVisit(payload),
      (data) => {
        setShowCreateModal(false);
        router.push(`/visits/${data.id}`);
      },
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>العمليات الرقابية</span>
            <span>/</span>
            <span className="text-teal-700 font-medium">وحدة الزيارات الرقابية الميدانية</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            سجل الزيارات والتدقيق الميداني
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
              {visibleCount ?? scopedVisits.length} زيارة مسجلة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق تقارير الزيارات، إرفاق الصور، ردود منسقي المستشفيات، وسجل تدقيق تفصيلي معتمد.
          </p>
        </div>

        {isCentral && (
          <button
            onClick={openCreateModal}
            disabled={hospitals.length === 0}
            className="no-print flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء زيارة رقابية جديدة</span>
          </button>
        )}
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              rememberFilters({ status: e.target.value });
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded-lg p-1.5 flex-1 min-w-[10rem]"
          >
            <option value="all">كافة الحالات</option>
            <option value="in_progress">قيد المتابعة (in_progress)</option>
            <option value="completed">مكتمل ومؤرشف (completed)</option>
          </select>

          {isCentral && (
            <select
              value={filterHospital}
              onChange={(e) => {
                setFilterHospital(e.target.value);
                rememberFilters({ hospital: e.target.value });
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded-lg p-1.5 flex-1 min-w-[10rem]"
            >
              <option value="">كافة المستشفيات</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <DataTable
        rows={scopedVisits}
        columns={visitColumns}
        rowKey={(v) => v.id}
        onRowSelect={(v) => router.push(`/visits/${v.id}`)}
        onStateChange={handleTableState}
        stateKey={LIST_KEY}
        searchPlaceholder="بحث في الزيارات، المستشفيات، الفريق..."
        emptyMessage="لا توجد زيارات رقابية مسجلة بعد"
        noMatchMessage="لا توجد زيارات مطابقة للفلتر المحدد"
        caption="سجل الزيارات الرقابية"
      />

      {/* Create Visit Modal (Central only) */}
      {isCentral && showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                إنشاء زيارة رقابية جديدة
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">المستشفى المستهدف</label>
                <select
                  required
                  value={newHospId}
                  onChange={(e) => setNewHospId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ تنفيذ الزيارة</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نسبة الامتثال % (اختياري)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="—"
                    value={newCompliance}
                    onChange={(e) => setNewCompliance(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الفريق الزائر (الأسماء والمسميات)</label>
                <input
                  type="text"
                  required
                  placeholder="أعضاء الفريق"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تفاصيل وملاحظات الزيارة</label>
                <textarea
                  rows={4}
                  required
                  placeholder="ملاحظات التدقيق، الأقسام التي تمت زيارتها، والتوصيات الأولية..."
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  حفظ وتوثيق الزيارة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
