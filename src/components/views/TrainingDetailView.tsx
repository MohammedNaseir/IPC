'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  X,
  FileCheck,
  CheckCircle2,
  Paperclip,
  Download,
  Upload,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import type { TrainingDTO } from '@/lib/types';
import { formatDate, todayInputValue } from '@/lib/format';
import { statusBadgeClass, statusDetailLabel } from '@/lib/training-status';
import { ATTENDEE_NAME_MAX_LENGTH, MAX_ATTENDEE_NAMES, type ImportSummary } from '@/lib/attendance';
import { deleteTraining, importAttendanceNames, recordTrainingExecution } from '@/server/actions/trainings';
import { notify } from '@/lib/notify';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface ExecutionFormProps {
  training: TrainingDTO;
}

function ExecutionForm({ training }: ExecutionFormProps) {
  const { run, isPending } = useActionRunner();
  const [execDate, setExecDate] = useState(training.date?.slice(0, 10) ?? todayInputValue());
  const [execDeliveredBy, setExecDeliveredBy] = useState(training.deliveredBy ?? '');
  const [execNotes, setExecNotes] = useState(training.notes ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Attendance is a name list XOR a headcount; the toggle picks which one this training carries.
  const [mode, setMode] = useState<'names' | 'headcount'>(training.attendeeNames.length > 0 ? 'names' : 'headcount');
  const [names, setNames] = useState<string[]>(training.attendeeNames);
  const [nameDraft, setNameDraft] = useState('');
  const [headcount, setHeadcount] = useState(
    training.attendeeNames.length === 0 && training.attendeeCount > 0 ? String(training.attendeeCount) : '',
  );

  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importKey, setImportKey] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const switchMode = async (next: 'names' | 'headcount') => {
    if (next === mode) return;
    const losingNames = next === 'headcount' && names.length > 0;
    const losingHeadcount = next === 'names' && headcount.trim() !== '';
    if (losingNames) {
      const proceed = await notify.confirm({
        title: 'استبدال قائمة الأسماء',
        body: `سيتم استبدال قائمة الأسماء (${names.length} اسماً) بإجمالي العدد. هل تريد المتابعة؟`,
        confirmText: 'استبدال',
      });
      if (!proceed) return;
    }
    if (losingHeadcount) {
      const proceed = await notify.confirm({
        title: 'استبدال إجمالي العدد',
        body: 'سيتم استبدال إجمالي العدد بقائمة أسماء الحاضرين. هل تريد المتابعة؟',
        confirmText: 'استبدال',
      });
      if (!proceed) return;
    }
    if (next === 'headcount') setNames([]);
    if (next === 'names') setHeadcount('');
    setSummary(null);
    setMode(next);
  };

  const addName = () => {
    const name = nameDraft.trim();
    if (!name) return;
    if (names.length >= MAX_ATTENDEE_NAMES) {
      void notify.info(`لا يمكن إضافة أكثر من ${MAX_ATTENDEE_NAMES} اسماً. يمكن تسجيل إجمالي العدد بدل الأسماء.`);
      return;
    }
    setNames((prev) => [...prev, name]);
    setNameDraft('');
  };

  const removeName = (index: number) => setNames((prev) => prev.filter((_, i) => i !== index));

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    const formData = new FormData();
    formData.append('trainingId', training.id);
    formData.append('file', importFile);
    run(
      () => importAttendanceNames(formData),
      (result) => {
        setSummary(result);
        setMode('names');
        setHeadcount('');
        setImportFile(null);
        setImportKey((k) => k + 1);
        setShowImport(false);
      },
    );
  };

  const handleExecuteSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('trainingId', training.id);
    formData.append('date', execDate);
    formData.append('deliveredBy', execDeliveredBy);
    formData.append('notes', execNotes);
    formData.append('mode', mode);
    if (mode === 'names') names.forEach((name) => formData.append('attendeeNames', name));
    else formData.append('headcount', headcount);
    if (photo) formData.append('photo', photo);
    run(
      () => recordTrainingExecution(formData),
      () => {
        setPhoto(null);
        setFileInputKey((k) => k + 1);
      },
    );
  };

  return (
    <form onSubmit={handleExecuteSave} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-bold text-slate-700 mb-1">تاريخ إقامة الدورة</label>
          <input
            type="date"
            required
            value={execDate}
            onChange={(e) => setExecDate(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">اسم المدرب / المنفذ</label>
          <input
            type="text"
            required
            placeholder="أخصائي مكافحة العدوى فلان..."
            value={execDeliveredBy}
            onChange={(e) => setExecDeliveredBy(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="font-bold text-slate-700">تسجيل الحضور: أسماء الحاضرين أو إجمالي العدد</label>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => switchMode('names')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                mode === 'names' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              أسماء الحاضرين
            </button>
            <button
              type="button"
              onClick={() => switchMode('headcount')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                mode === 'headcount' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              إجمالي العدد فقط
            </button>
          </div>
        </div>

        {mode === 'names' ? (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-500">
                أدخل اسم كل حاضر على حدة، أو استورد قائمة الأسماء من ملف. الأسماء نص حر وغير مرتبطة بسجل الممارسين.
              </p>
              <span className="text-[11px] text-navy-700 font-bold shrink-0">{names.length} اسماً</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={nameDraft}
                maxLength={ATTENDEE_NAME_MAX_LENGTH}
                placeholder="اسم الحاضر"
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addName();
                  }
                }}
                className="flex-1 min-w-[12rem] p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
              />
              <button
                type="button"
                onClick={addName}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-navy-400" />
                <span>إضافة</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="px-3 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد من Excel</span>
              </button>
            </div>

            {summary && (
              <div className="bg-white border border-navy-200 rounded-lg p-2.5 text-[11px] text-slate-700 space-y-1">
                <p className="font-bold text-navy-800">
                  تم استيراد {summary.imported} اسماً، وتم تجاوز {summary.skipped} صفاً.
                </p>
                {summary.skippedReasons.blank > 0 && <p>الصفوف الفارغة المتجاوزة: {summary.skippedReasons.blank}</p>}
                {summary.skippedReasons.tooLong.length > 0 && (
                  <p>
                    أسماء تجاوزت {ATTENDEE_NAME_MAX_LENGTH} حرفاً (الصفوف):{' '}
                    {summary.skippedReasons.tooLong.map((r) => r.row).join('، ')}
                  </p>
                )}
                {summary.sheetName && <p className="text-slate-500">تمت قراءة الورقة الأولى فقط: {summary.sheetName}</p>}
              </div>
            )}

            {names.length === 0 ? (
              <p className="text-[11px] text-muted text-center py-3">لم يتم إدخال أي اسم بعد</p>
            ) : (
              <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {names.map((name, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="p-2 rounded border border-slate-200 bg-white flex items-center justify-between gap-2"
                  >
                    <span className="text-[11px] text-slate-800 truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeName(index)}
                      title="إزالة"
                      className="text-muted hover:text-danger-700 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-1">
            <label className="block text-[11px] text-slate-600 mb-1">إجمالي عدد الحضور بدون أسماء (Headcount):</label>
            <input
              type="number"
              min="1"
              required
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              className="w-full sm:w-48 p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
            />
          </div>
        )}
      </div>

      {showImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-navy-400" />
                استيراد أسماء الحاضرين
              </h3>
              <button type="button" onClick={() => setShowImport(false)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  استخدم القالب: عمود واحد بعنوان &quot;الاسم&quot; مع صف العنوان، واسم واحد في كل صف. تُتجاهل الصفوف
                  الفارغة، وتُقرأ الورقة الأولى والعمود الأول فقط.
                </p>
                <a
                  href="/api/templates/attendance-names"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-navy-200 text-navy-700 rounded-lg font-bold text-[11px] hover:bg-navy-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل القالب (CSV يفتح في Excel)</span>
                </a>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملف الأسماء</label>
                <input
                  key={importKey}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
                <p className="text-[10px] text-muted mt-1">
                  الأنواع المدعومة: xlsx أو csv — الحد الأقصى 8 ميجابايت و {MAX_ATTENDEE_NAMES} اسماً.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowImport(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg">
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isPending || !importFile}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  استيراد الأسماء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block font-bold text-slate-700 mb-1">صور / مرفق توثيق الدورة التدريبية (اختياري)</label>
        <input
          key={fileInputKey}
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
        />
      </div>

      <div>
        <label className="block font-bold text-slate-700 mb-1">ملاحظات ونتائج الاختبار القبلي والبعدي</label>
        <textarea
          rows={3}
          placeholder="ملاحظات حول نسبة الاستيعاب وتفاعل المتدربين..."
          value={execNotes}
          onChange={(e) => setExecNotes(e.target.value)}
          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-60"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>اعتماد توثيق التدريب وتحديث الحالة لمكتمل</span>
        </button>
      </div>
    </form>
  );
}

interface TrainingDetailViewProps {
  training: TrainingDTO;
}

/**
 * One training, in full, on its own page. Moved out of the split panel in `TrainingsView` unchanged in
 * function, execution form and all (feature 003, FR-012).
 */
export function TrainingDetailView({ training }: TrainingDetailViewProps) {
  const router = useRouter();
  const { run } = useActionRunner();

  // Soft delete (005-soft-delete, US3). No completed-training exception (spec Assumptions).
  const handleDelete = async () => {
    const confirmed = await notify.confirm({
      title: 'حذف التدريب',
      body: `سيتم حذف "${training.title}". يمكن استعادته لاحقاً من سجل المحذوفات.`,
      confirmText: 'حذف',
      danger: true,
    });
    if (!confirmed) return;
    run(() => deleteTraining(training.id), () => router.push('/trainings'));
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      <div className="no-print flex items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link
            href="/trainings"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-navy-700 hover:border-navy-300 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
            <span>العودة لسجل التدريب</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-navy-700 font-medium truncate">{training.title}</span>
        </div>
        <button
          onClick={handleDelete}
          className="px-3.5 py-2 border border-danger-200 text-danger-800 hover:bg-danger-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
          title="حذف التدريب"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">حذف التدريب</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-6 space-y-6">
        <div className="pb-5 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadgeClass(training.status)}`}>
              {statusDetailLabel(training.status)}
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              {training.isInternal ? 'برنامج داخلي مستقل' : 'قالب تدريبي مركزي'}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900">{training.title}</h2>
          <p className="text-xs text-slate-500 mt-1">
            المستشفى المعني: <strong className="text-slate-800 font-bold">{training.hospitalName}</strong>
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold text-slate-700 mb-1.5">أهداف ومحاور التدريب:</h3>
          <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
            {training.description}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-muted block text-[10px]">تاريخ التنفيذ</span>
            <strong className="font-bold text-slate-800">
              {training.date ? formatDate(training.date) : 'لم يحدد بعد'}
            </strong>
          </div>
          <div>
            <span className="text-muted block text-[10px]">المدرب المنفذ</span>
            <strong className="font-bold text-slate-800 truncate block">{training.deliveredBy || 'غير محدد'}</strong>
          </div>
          <div>
            <span className="text-muted block text-[10px]">عدد الحضور الموثق</span>
            <strong className="font-bold text-navy-700 font-mono text-sm">{training.attendeeCount} حاضر</strong>
            <span className="text-[10px] text-muted block mt-0.5">
              {training.attendeeNames.length > 0 ? 'مسجل بالأسماء' : 'إجمالي العدد بدون أسماء'}
            </span>
          </div>
          <div>
            <span className="text-muted block text-[10px]">الموعد النهائي</span>
            <strong className="font-bold text-slate-800">
              {training.dueDate ? formatDate(training.dueDate) : 'مفتوح'}
            </strong>
          </div>
        </div>

        {training.attachments.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-navy-700" />
              مرفقات وصور توثيق التدريب
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {training.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs overflow-hidden hover:border-navy-400 transition-colors"
                >
                  <div className="h-24 w-full rounded bg-slate-200 mb-2 overflow-hidden flex items-center justify-center">
                    {att.file.mimeType.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.file.url} alt={att.file.name} className="h-full w-full object-cover" />
                    ) : (
                      <FileCheck className="w-8 h-8 text-muted" />
                    )}
                  </div>
                  <p className="font-medium text-slate-800 text-[11px] truncate" title={att.file.name}>
                    {att.file.name}
                  </p>
                  <span className="text-[10px] text-muted block mt-0.5">{formatDate(att.uploadedAt)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-navy-700 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-slate-800">توثيق تنفيذ التدريب ورصد الحضور</h3>
                <p className="text-[11px] text-muted">
                  يقوم منسق المستشفى بتعبئة نسخته بالموعد والمدرب وقائمة الحضور والصور
                </p>
              </div>
            </div>
            <span className="text-[11px] bg-navy-50 text-navy-700 font-bold px-2 py-0.5 rounded shrink-0">
              توثيق إلكتروني
            </span>
          </div>

          <ExecutionForm key={training.id} training={training} />
        </div>
      </div>
    </div>
  );
}
