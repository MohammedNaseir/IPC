'use client';

import { useState } from 'react';
import { GraduationCap, Plus, Clock, Search, Users, X, FileCheck, CheckCircle2, Paperclip } from 'lucide-react';
import type { HospitalDTO, PractitionerDTO, SessionUser, TrainingDTO } from '@/lib/types';
import { formatDate, todayInputValue } from '@/lib/format';
import { createInternalTraining, createTrainingTemplate, recordTrainingExecution } from '@/server/actions/trainings';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface TrainingsViewProps {
  user: SessionUser;
  trainings: TrainingDTO[];
  hospitals: HospitalDTO[];
  practitioners: PractitionerDTO[];
}

function statusBadgeClass(status: TrainingDTO['status']): string {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (status === 'late') return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
}

interface ExecutionFormProps {
  training: TrainingDTO;
  practitioners: PractitionerDTO[];
}

function ExecutionForm({ training, practitioners }: ExecutionFormProps) {
  const { run, isPending } = useActionRunner();
  const [execDate, setExecDate] = useState(training.date?.slice(0, 10) ?? todayInputValue());
  const [execDeliveredBy, setExecDeliveredBy] = useState(training.deliveredBy ?? '');
  const [execHeadcount, setExecHeadcount] = useState('');
  const [execSelectedPracIds, setExecSelectedPracIds] = useState<string[]>(training.attendeePractitionerIds);
  const [execNotes, setExecNotes] = useState(training.notes ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const relevantPractitioners = practitioners.filter((p) => p.hospitalId === training.hospitalId);

  const togglePractitionerSelection = (pracId: string) => {
    setExecSelectedPracIds((prev) => (prev.includes(pracId) ? prev.filter((id) => id !== pracId) : [...prev, pracId]));
  };

  const handleExecuteSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('trainingId', training.id);
    formData.append('date', execDate);
    formData.append('deliveredBy', execDeliveredBy);
    formData.append('notes', execNotes);
    execSelectedPracIds.forEach((id) => formData.append('practitionerIds', id));
    if (execSelectedPracIds.length === 0 && execHeadcount) formData.append('headcount', execHeadcount);
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
      <div className="grid grid-cols-2 gap-3">
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
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-700">تسجيل الحضور: (اختيار ممارسين بالاسم أو إدخال إجمالي العدد)</label>
          <span className="text-[11px] text-teal-700 font-bold">المحدد بالاسم: {execSelectedPracIds.length} ممارس</span>
        </div>

        {relevantPractitioners.length > 0 && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto space-y-1.5">
            <p className="text-[10px] text-slate-500 mb-1">
              انقر لاختيار الممارسين المسجلين بقاعدة البيانات الذين حضروا الدورة:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {relevantPractitioners.map((prac) => {
                const isChecked = execSelectedPracIds.includes(prac.id);
                return (
                  <div
                    key={prac.id}
                    onClick={() => togglePractitionerSelection(prac.id)}
                    className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                      isChecked ? 'bg-teal-100 border-teal-400 text-teal-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-[11px] truncate">
                      {prac.name} ({prac.role})
                    </span>
                    <input type="checkbox" checked={isChecked} readOnly className="accent-teal-600 mr-2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-1">
          <label className="block text-[11px] text-slate-600 mb-1">أو إدخال إجمالي عدد الحضور اليدوي (Headcount):</label>
          <input
            type="number"
            min="1"
            value={execHeadcount}
            disabled={execSelectedPracIds.length > 0}
            required={execSelectedPracIds.length === 0}
            onChange={(e) => setExecHeadcount(e.target.value)}
            className="w-full sm:w-48 p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
      </div>

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
          rows={2}
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
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-60"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>اعتماد توثيق التدريب وتحديث الحالة لمكتمل</span>
        </button>
      </div>
    </form>
  );
}

export function TrainingsView({ user, trainings, hospitals, practitioners }: TrainingsViewProps) {
  const isCentral = user.role === 'central';
  const { run, isPending } = useActionRunner();

  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterHospital, setFilterHospital] = useState<string>('');

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

  const filteredTrainings = trainings.filter((t) => {
    if (filterType === 'central' && t.isInternal) return false;
    if (filterType === 'internal' && !t.isInternal) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (isCentral && filterHospital && t.hospitalId !== filterHospital) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.hospitalName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedTraining = filteredTrainings.find((t) => t.id === selectedTrainingId) ?? filteredTrainings[0];

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
            <span className="text-teal-700 font-medium">وحدة التدريب والتعليم المستمر</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            إدارة البرامج والدورات التدريبية
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
              {filteredTrainings.length} دورة مسجلة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCentral
              ? 'إنشاء قوالب تدريبية مركزية وتوزيعها آلياً على كل المستشفيات مع مراقبة نسب الإنجاز'
              : 'توثيق التدريبات المركزية وتنظيم دورات داخلية مستقلة بمستشفاك مع رصد حضور الممارسين'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCentral && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
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
            <Plus className="w-4 h-4 text-teal-400" />
            <span>تدريب داخلي مستقل</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث في الدورات، المستشفيات، المحتوى..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded-lg p-1.5 flex-1"
              >
                <option value="all">كافة الحالات</option>
                <option value="pending">معلّق (pending)</option>
                <option value="late">متأخر (late)</option>
                <option value="completed">مكتمل (completed)</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded-lg p-1.5 flex-1"
              >
                <option value="all">كل الأنواع</option>
                <option value="central">تدريب مركزي</option>
                <option value="internal">تدريب داخلي</option>
              </select>

              {isCentral && (
                <select
                  value={filterHospital}
                  onChange={(e) => setFilterHospital(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded-lg p-1.5 flex-1"
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

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto">
            {filteredTrainings.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                لا توجد تدريبات مطابقة
              </div>
            ) : (
              filteredTrainings.map((t) => {
                const isSel = t.id === selectedTraining?.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTrainingId(t.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSel
                        ? 'bg-teal-50/50 border-teal-500 shadow-sm ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">{t.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass(t.status)}`}>
                        {t.status === 'completed' ? 'مكتمل وموثق' : t.status === 'late' ? 'متأخر (تجاوز الموعد)' : 'معلّق بالانتظار'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                      <span className="font-semibold text-slate-700">{t.hospitalName}</span>
                      <span>•</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {t.isInternal ? 'تدريب داخلي' : 'مركزي إلزامي'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{t.description}</p>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {t.attendeeCount} حاضر
                      </span>
                      {t.dueDate && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          الموعد: {formatDate(t.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          {selectedTraining ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-6 space-y-6">
              <div className="pb-5 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadgeClass(selectedTraining.status)}`}>
                    {selectedTraining.status === 'completed'
                      ? 'مكتمل وموثق رسمياً'
                      : selectedTraining.status === 'late'
                        ? 'متأخر عن الموعد المحدد'
                        : 'معلّق بانتظار تنفيذ المستشفى'}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {selectedTraining.isInternal ? 'برنامج داخلي مستقل' : 'قالب تدريبي مركزي'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{selectedTraining.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  المستشفى المعني: <strong className="text-slate-800 font-bold">{selectedTraining.hospitalName}</strong>
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-1.5">أهداف ومحاور التدريب:</h4>
                <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                  {selectedTraining.description}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ التنفيذ</span>
                  <strong className="font-bold text-slate-800">
                    {selectedTraining.date ? formatDate(selectedTraining.date) : 'لم يحدد بعد'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">المدرب المنفذ</span>
                  <strong className="font-bold text-slate-800 truncate block">{selectedTraining.deliveredBy || 'غير محدد'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">عدد الحضور الموثق</span>
                  <strong className="font-bold text-teal-700 font-mono text-sm">{selectedTraining.attendeeCount} كادر</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الموعد النهائي</span>
                  <strong className="font-bold text-slate-800">
                    {selectedTraining.dueDate ? formatDate(selectedTraining.dueDate) : 'مفتوح'}
                  </strong>
                </div>
              </div>

              {selectedTraining.attachments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                    مرفقات وصور توثيق التدريب
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedTraining.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs overflow-hidden hover:border-teal-400 transition-colors"
                      >
                        <div className="h-24 w-full rounded bg-slate-200 mb-2 overflow-hidden flex items-center justify-center">
                          {att.file.mimeType.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={att.file.url} alt={att.file.name} className="h-full w-full object-cover" />
                          ) : (
                            <FileCheck className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <p className="font-medium text-slate-800 text-[11px] truncate" title={att.file.name}>
                          {att.file.name}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{formatDate(att.uploadedAt)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-teal-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">توثيق تنفيذ التدريب ورصد الحضور</h4>
                      <p className="text-[11px] text-slate-400">
                        يقوم منسق المستشفى بتعبئة نسخته بالموعد والمدرب وقائمة الحضور والصور
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded">توثيق إلكتروني</span>
                </div>

                <ExecutionForm key={selectedTraining.id} training={selectedTraining} practitioners={practitioners} />
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              يرجى اختيار دورة تدريبية من القائمة
            </div>
          )}
        </div>
      </div>

      {showTemplateModal && isCentral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-teal-400" />
                إنشاء قالب تدريبي مركزي جديد
              </h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTemplateSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-teal-900 leading-relaxed text-[11px]">
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  اعتماد القالب وتوزيعه آلياً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInternalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                إنشاء تدريب داخلي مستقل للمستشفى
              </h3>
              <button onClick={() => setShowInternalModal(false)} className="text-slate-400 hover:text-white">
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
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
