'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Plus, X } from 'lucide-react';
import type { HospitalDTO, SessionUser, TrainingDTO } from '@/lib/types';
import type { ColumnDef } from '@/lib/table';
import { DataTable } from '@/components/table/DataTable';
import { readListFilters, writeListFilters } from '@/components/table/listStateStore';
import { formatDate, todayInputValue } from '@/lib/format';
import { statusBadgeClass, statusLabel } from '@/lib/training-status';
import { createInternalTraining, createTrainingTemplate } from '@/server/actions/trainings';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface TrainingsViewProps {
  user: SessionUser;
  trainings: TrainingDTO[];
  hospitals: HospitalDTO[];
}

// One key for this screen's table and its three filter selects.
const LIST_KEY = 'trainings';

export function TrainingsView({ user, trainings, hospitals }: TrainingsViewProps) {
  const isCentral = user.role === 'central';
  const router = useRouter();
  const { run, isPending } = useActionRunner();

  const [filterType, setFilterType] = useState<string>(() => readListFilters(LIST_KEY)?.type ?? 'all');
  const [filterStatus, setFilterStatus] = useState<string>(() => readListFilters(LIST_KEY)?.status ?? 'all');
  const [filterHospital, setFilterHospital] = useState<string>(() => readListFilters(LIST_KEY)?.hospital ?? '');
  const [visibleCount, setVisibleCount] = useState<number | null>(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showInternalModal, setShowInternalModal] = useState(false);

  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplDesc, setTmplDesc] = useState('');
  const [tmplDeadline, setTmplDeadline] = useState(todayInputValue(14));

  const [internalHospId, setInternalHospId] = useState(user.hospitalId ?? hospitals[0]?.id ?? '');
  const [internalTitle, setInternalTitle] = useState('');
  const [internalDesc, setInternalDesc] = useState('');
  const [internalDate, setInternalDate] = useState(todayInputValue());
  const [internalDeliveredBy, setInternalDeliveredBy] = useState('');
  const [internalCount, setInternalCount] = useState('');

  const rememberFilters = (next: { type?: string; status?: string; hospital?: string }) => {
    writeListFilters(LIST_KEY, {
      type: next.type ?? filterType,
      status: next.status ?? filterStatus,
      hospital: next.hospital ?? filterHospital,
    });
  };

  // The three selects keep filtering here exactly as before; the table adds search, sort and paging.
  const scopedTrainings = useMemo(
    () =>
      trainings.filter((t) => {
        if (filterType === 'central' && t.isInternal) return false;
        if (filterType === 'internal' && !t.isInternal) return false;
        if (filterStatus !== 'all' && t.status !== filterStatus) return false;
        if (isCentral && filterHospital && t.hospitalId !== filterHospital) return false;
        return true;
      }),
    [trainings, filterType, filterStatus, filterHospital, isCentral],
  );

  const trainingColumns = useMemo<ColumnDef<TrainingDTO>[]>(
    () => [
      {
        key: 'title',
        header: 'عنوان الدورة',
        value: (t) => t.title,
        // A real link so the destination is announced as a navigation (FR-005).
        render: (t) => (
          <Link
            href={`/trainings/${t.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-slate-900 hover:text-navy-700 hover:underline"
          >
            {t.title}
          </Link>
        ),
      },
      { key: 'hospitalName', header: 'المستشفى', value: (t) => t.hospitalName },
      {
        key: 'kind',
        header: 'النوع',
        value: (t) => (t.isInternal ? 'تدريب داخلي' : 'مركزي إلزامي'),
        render: (t) => (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 whitespace-nowrap">
            {t.isInternal ? 'تدريب داخلي' : 'مركزي إلزامي'}
          </span>
        ),
        hideBelowMd: true,
      },
      {
        key: 'status',
        header: 'الحالة',
        value: (t) => statusLabel(t.status),
        render: (t) => (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadgeClass(t.status)}`}>
            {statusLabel(t.status)}
          </span>
        ),
      },
      {
        key: 'attendeeCount',
        header: 'الحاضرون',
        type: 'number',
        align: 'end',
        value: (t) => t.attendeeCount,
        render: (t) => <span className="font-mono whitespace-nowrap">{t.attendeeCount} حاضر</span>,
      },
      {
        key: 'dueDate',
        header: 'الموعد النهائي',
        type: 'date',
        value: (t) => t.dueDate,
        render: (t) => <span className="whitespace-nowrap">{t.dueDate ? formatDate(t.dueDate) : 'مفتوح'}</span>,
        hideBelowMd: true,
      },
      {
        // The cards showed the description, so it stays visible and searchable (FR-023).
        key: 'description',
        header: 'المحتوى',
        sortable: false,
        value: (t) => t.description,
        render: (t) => (
          <span className="block max-w-[26rem] truncate text-slate-600" title={t.description}>
            {t.description}
          </span>
        ),
        hideBelowMd: true,
      },
    ],
    [],
  );

  const handleTableState = useCallback(
    ({ filteredCount }: { filteredRows: TrainingDTO[]; filteredCount: number }) => setVisibleCount(filteredCount),
    [],
  );

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => createTrainingTemplate({ title: tmplTitle, description: tmplDesc, dueDate: tmplDeadline }),
      () => {
        setShowTemplateModal(false);
        setTmplTitle('');
        setTmplDesc('');
        setTmplDeadline(todayInputValue(14));
      },
    );
  };

  const handleInternalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () =>
        createInternalTraining({
          hospitalId: isCentral ? internalHospId : (user.hospitalId ?? ''),
          title: internalTitle,
          description: internalDesc,
          date: internalDate,
          deliveredBy: internalDeliveredBy,
          attendeeCount: Number(internalCount),
        }),
      () => {
        setShowInternalModal(false);
        setInternalTitle('');
        setInternalDesc('');
        setInternalDeliveredBy('');
        setInternalCount('');
      },
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>التطوير والتدريب</span>
            <span>/</span>
            <span className="text-navy-700 font-medium">وحدة التدريب والتعليم المستمر</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            إدارة البرامج والدورات التدريبية
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 font-bold border border-navy-200">
              {visibleCount ?? scopedTrainings.length} دورة مسجلة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCentral
              ? 'إنشاء قوالب تدريبية مركزية وتوزيعها آلياً على كل المستشفيات مع مراقبة نسب الإنجاز'
              : 'توثيق التدريبات المركزية وتنظيم دورات داخلية مستقلة بمستشفاك مع رصد حضور الممارسين'}
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          {isCentral && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>قالب تدريبي مركزي</span>
            </button>
          )}

          <button
            onClick={() => setShowInternalModal(true)}
            disabled={hospitals.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-navy-400" />
            <span>تدريب داخلي مستقل</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Three selects cannot shrink below their intrinsic width, so they wrap instead of pushing the
            page into a horizontal scroll at phone widths (FR-015). */}
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
            <option value="pending">معلّق (pending)</option>
            <option value="late">متأخر (late)</option>
            <option value="completed">مكتمل (completed)</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              rememberFilters({ type: e.target.value });
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded-lg p-1.5 flex-1 min-w-[10rem]"
          >
            <option value="all">كل الأنواع</option>
            <option value="central">تدريب مركزي</option>
            <option value="internal">تدريب داخلي</option>
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
        rows={scopedTrainings}
        columns={trainingColumns}
        rowKey={(t) => t.id}
        onRowSelect={(t) => router.push(`/trainings/${t.id}`)}
        onStateChange={handleTableState}
        stateKey={LIST_KEY}
        searchPlaceholder="بحث في الدورات، المستشفيات، المحتوى..."
        emptyMessage="لا توجد دورات تدريبية مسجلة بعد"
        noMatchMessage="لا توجد تدريبات مطابقة"
        caption="سجل الدورات التدريبية"
      />

      {showTemplateModal && isCentral && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-navy-400" />
                إنشاء قالب تدريبي مركزي جديد
              </h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTemplateSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-navy-50 border border-navy-200 rounded-lg p-3 text-navy-900 leading-relaxed text-[11px]">
                <strong className="block font-bold mb-1">آلية التوزيع والتعميم المعتمدة:</strong>
                عند اعتماد هذا القالب، سيقوم النظام تلقائياً بتوليد نسخة فارغة مخصصة لكل مستشفى من مستشفيات التجمع ليقوم منسق كل مستشفى بتعبئة تفاصيل التنفيذ الخاصة به.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الدورة التدريبية</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ورشة إدارة النفايات الطبية الخطرة ومعايير السلامة"
                  value={tmplTitle}
                  onChange={(e) => setTmplTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الموعد النهائي للإنجاز (Deadline)</label>
                <input
                  type="date"
                  required
                  value={tmplDeadline}
                  onChange={(e) => setTmplDeadline(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">أهداف ومحتوى الدورة</label>
                <textarea
                  rows={4}
                  required
                  placeholder="المحاور الرئيسية المطلوب تغطيتها، الفئات المستهدفة، ومعايير التقييم..."
                  value={tmplDesc}
                  onChange={(e) => setTmplDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  اعتماد القالب وتوزيعه آلياً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInternalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-navy-400" />
                إنشاء تدريب داخلي مستقل للمستشفى
              </h3>
              <button onClick={() => setShowInternalModal(false)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInternalSubmit} className="p-6 space-y-4 text-xs">
              {isCentral && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المستشفى المنفذ</label>
                  <select
                    value={internalHospId}
                    onChange={(e) => setInternalHospId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان التدريب الداخلي</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تدريب قسم الطوارئ على بروتوكول غسيل الأيدي الموسع"
                  value={internalTitle}
                  onChange={(e) => setInternalTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ التنفيذ</label>
                  <input
                    type="date"
                    required
                    value={internalDate}
                    onChange={(e) => setInternalDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">عدد المتدربين</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={internalCount}
                    onChange={(e) => setInternalCount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المدرب</label>
                <input
                  type="text"
                  placeholder="ممارس أو أخصائي مكافحة العدوى"
                  value={internalDeliveredBy}
                  onChange={(e) => setInternalDeliveredBy(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">التفاصيل والأهداف</label>
                <textarea
                  rows={3}
                  required
                  placeholder="وصف تفصيلي للتدريب الداخلي وأثره على الامتثال..."
                  value={internalDesc}
                  onChange={(e) => setInternalDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowInternalModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  حفظ التدريب الداخلي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
