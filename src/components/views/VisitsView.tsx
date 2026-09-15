'use client';

import { useState } from 'react';
import {
  Plus,
  FileText,
  Paperclip,
  MessageSquare,
  History,
  Lock,
  Calendar,
  Users,
  Search,
  CheckCircle,
  Download,
  Upload,
  Send,
  Printer,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { AuditLogDTO, HospitalDTO, SessionUser, VisitDTO } from '@/lib/types';
import { formatDate, formatDateTime, formatFileSize, todayInputValue } from '@/lib/format';
import {
  addVisitAttachment,
  addVisitResponse,
  completeVisit,
  createVisit,
  uploadVisitReport,
} from '@/server/actions/visits';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface VisitsViewProps {
  user: SessionUser;
  visits: VisitDTO[];
  hospitals: HospitalDTO[];
  auditLogs: AuditLogDTO[];
}

const FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.pptx,.csv';

export function VisitsView({ user, visits, hospitals, auditLogs }: VisitsViewProps) {
  const isCentral = user.role === 'central';
  const { run, isPending } = useActionRunner();

  const [selectedVisitId, setSelectedVisitId] = useState<string>(visits[0]?.id ?? '');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterHospital, setFilterHospital] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showReportUploadModal, setShowReportUploadModal] = useState(false);

  const [newHospId, setNewHospId] = useState(hospitals[0]?.id ?? '');
  const [newDate, setNewDate] = useState(todayInputValue());
  const [newTeam, setNewTeam] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newCompliance, setNewCompliance] = useState('');

  const [responseNote, setResponseNote] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [responseFileKey, setResponseFileKey] = useState(0);

  const [attFile, setAttFile] = useState<File | null>(null);
  const [repFile, setRepFile] = useState<File | null>(null);

  const filteredVisits = visits.filter((v) => {
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (isCentral && filterHospital && v.hospitalId !== filterHospital) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.hospitalName.toLowerCase().includes(q) ||
        v.team.toLowerCase().includes(q) ||
        v.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedVisit = filteredVisits.find((v) => v.id === selectedVisitId) ?? filteredVisits[0];

  const visitAuditLogs = auditLogs.filter(
    (log) => log.entityType === 'Visit' && log.entityId === selectedVisit?.id,
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
        setSelectedVisitId(data.id);
      },
    );
  };

  const handleResponseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !responseNote.trim()) return;
    const formData = new FormData();
    formData.set('visitId', selectedVisit.id);
    formData.set('note', responseNote);
    if (responseFile) formData.set('file', responseFile);
    run(
      () => addVisitResponse(formData),
      () => {
        setResponseNote('');
        setResponseFile(null);
        setResponseFileKey((k) => k + 1);
      },
    );
  };

  const handleAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !attFile) return;
    const formData = new FormData();
    formData.set('visitId', selectedVisit.id);
    formData.set('file', attFile);
    run(
      () => addVisitAttachment(formData),
      () => {
        setShowAttachmentModal(false);
        setAttFile(null);
      },
    );
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !repFile) return;
    const formData = new FormData();
    formData.set('visitId', selectedVisit.id);
    formData.set('file', repFile);
    run(
      () => uploadVisitReport(formData),
      () => {
        setShowReportUploadModal(false);
        setRepFile(null);
      },
    );
  };

  const handleComplete = (visitId: string) => {
    if (!window.confirm('هل تريد اعتماد الزيارة وإغلاقها نهائياً؟ لن يمكن تعديلها بعد الأرشفة.')) return;
    run(() => completeVisit(visitId));
  };

  const isCompleted = selectedVisit?.status === 'completed';

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
              {filteredVisits.length} زيارة مسجلة
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

      {/* Master-Detail Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Visits */}
        <div className="lg:col-span-5 space-y-3 no-print">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث في الزيارات، المستشفيات، الفريق..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white text-slate-800"
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
                <option value="in_progress">قيد المتابعة (in_progress)</option>
                <option value="completed">مكتمل ومؤرشف (completed)</option>
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
            {filteredVisits.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                لا توجد زيارات مطابقة للفلتر المحدد
              </div>
            ) : (
              filteredVisits.map((v) => {
                const isSel = v.id === selectedVisit?.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVisitId(v.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSel
                        ? 'bg-teal-50/50 border-teal-500 shadow-sm ring-1 ring-teal-500'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">{v.hospitalName}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          v.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {v.status === 'completed' ? 'مكتمل ومؤرشف' : 'قيد المتابعة'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-2">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(v.visitDate)}</span>
                    </p>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{v.details}</p>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        {v.attachments.length} مرفق
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        {v.responses.length} رد من المستشفى
                      </span>
                      {v.complianceScore !== null && (
                        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                          {v.complianceScore}% امتثال
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-7">
          {selectedVisit ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-6 p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedVisit.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {selectedVisit.status === 'completed' ? 'زيارة مكتملة ومؤرشفة' : 'زيارة قيد المتابعة والتنفيذ'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{selectedVisit.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedVisit.hospitalName}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      تاريخ الزيارة: {formatDate(selectedVisit.visitDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      الفريق الزائر: {selectedVisit.team}
                    </span>
                    {selectedVisit.complianceScore !== null && (
                      <span className="font-mono font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                        {selectedVisit.complianceScore}% امتثال
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={() => window.print()}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1"
                    title="تصدير تقرير الزيارة بصيغة PDF"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">طباعة PDF</span>
                  </button>

                  {isCentral && !isCompleted && (
                    <button
                      onClick={() => handleComplete(selectedVisit.id)}
                      disabled={isPending}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                      title="اعتماد الزيارة وإغلاقها نهائياً"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>اعتماد واكتمال الزيارة</span>
                    </button>
                  )}
                </div>
              </div>

              {isCompleted && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>هذه الزيارة مكتملة ومؤرشفة نهائياً ولا يمكن إجراء تعديلات أو إضافة ردود عليها.</span>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">تفاصيل وملاحظات الزيارة العامة:</h4>
                <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                  {selectedVisit.details}
                </div>
              </div>

              {/* Official Report */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <h4 className="text-xs font-bold text-slate-800">تقرير الزيارة الرسمي</h4>
                  </div>
                  {isCentral && !isCompleted && (
                    <button
                      onClick={() => {
                        setRepFile(null);
                        setShowReportUploadModal(true);
                      }}
                      className="no-print text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{selectedVisit.report ? 'تحديث التقرير' : 'رفع تقرير الزيارة'}</span>
                    </button>
                  )}
                </div>

                {selectedVisit.report ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-bold text-slate-800 font-mono text-[11px] truncate">
                        {selectedVisit.report.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {formatFileSize(selectedVisit.report.size)}
                      </span>
                    </div>
                    <a
                      href={selectedVisit.report.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل التقرير</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-2 text-center">
                    لم يتم رفع تقرير الزيارة بعد من قِبل الإدارة المركزية
                  </p>
                )}
              </div>

              {/* Attachments & Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-teal-600" />
                    <h4 className="text-xs font-bold text-slate-800">الصور والمرفقات الميدانية</h4>
                  </div>
                  {!isCompleted && (
                    <button
                      onClick={() => {
                        setAttFile(null);
                        setShowAttachmentModal(true);
                      }}
                      className="no-print text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إرفاق صورة / ملف</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedVisit.attachments.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                      لا توجد صور أو مرفقات لهذه الزيارة
                    </div>
                  ) : (
                    selectedVisit.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs overflow-hidden hover:border-teal-400 transition-colors"
                      >
                        <div className="h-24 w-full rounded bg-slate-200 mb-2 overflow-hidden flex items-center justify-center">
                          {att.file.mimeType.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={att.file.url} alt={att.file.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <p className="font-medium text-slate-800 text-[11px] truncate" title={att.file.name}>
                          {att.file.name}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {formatDate(att.uploadedAt)} • {formatFileSize(att.file.size)}
                        </span>
                      </a>
                    ))
                  )}
                </div>
              </div>

              {/* Hospital Response Thread */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-bold text-slate-800">سجل ردود وتحديثات المستشفى</h4>
                </div>

                <div className="space-y-2.5">
                  {selectedVisit.responses.length === 0 ? (
                    <div className="bg-slate-50 p-4 rounded-lg text-slate-400 text-xs text-center">
                      لم يتم تسجيل ردود من المستشفى على هذه الزيارة بعد
                    </div>
                  ) : (
                    selectedVisit.responses.map((resp) => (
                      <div key={resp.id} className="p-3.5 bg-teal-50/40 border border-teal-100 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-bold text-teal-900">{resp.respondentName}</span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(resp.respondedAt)}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{resp.note}</p>
                        {resp.attachment && (
                          <a
                            href={resp.attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-teal-200 rounded text-[11px] text-teal-800 hover:bg-teal-50"
                          >
                            <FileText className="w-3.5 h-3.5 text-teal-600" />
                            <span>{resp.attachment.name}</span>
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {!isCompleted && (
                  <form onSubmit={handleResponseSubmit} className="no-print pt-2 space-y-2 text-xs">
                    <label className="block font-bold text-slate-700">
                      إضافة رد / تحديث إجراءات تصحيحية من المستشفى:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="اكتب ملاحظة أو توضيح المستشفى بشأن ملاحظات الزيارة..."
                      value={responseNote}
                      onChange={(e) => setResponseNote(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-800"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        key={responseFileKey}
                        type="file"
                        accept={FILE_ACCEPT}
                        onChange={(e) => setResponseFile(e.target.files?.[0] ?? null)}
                        className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex-1 text-slate-800"
                        title="تقرير رد مرفق (اختياري، بحد أقصى 8 ميجابايت)"
                      />
                      <button
                        type="submit"
                        disabled={!responseNote.trim() || isPending}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال الرد</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">المرفق اختياري (PDF، صور، مستندات Office) بحد أقصى 8 ميجابايت.</p>
                  </form>
                )}
              </div>

              {/* Audit Log Timeline */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800">سجل التدقيق والتتبع التلقائي للزيارة</h4>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 divide-y divide-slate-100 text-xs">
                  {visitAuditLogs.length === 0 ? (
                    <p className="text-slate-400 text-center py-2">لا توجد سجلات تدقيق مسجلة للزيارة</p>
                  ) : (
                    visitAuditLogs.map((log) => (
                      <div key={log.id} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800 text-[11px]">{log.action}</p>
                          <span className="text-[10px] text-teal-700 font-medium">بواسطة: {log.performedBy}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              يرجى اختيار زيارة من القائمة لاستعراض التفاصيل الكاملة
            </div>
          )}
        </div>
      </div>

      {/* Create Visit Modal (Central only) */}
      {isCentral && showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
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

      {/* Attach Photo/File Modal */}
      {showAttachmentModal && selectedVisit && !isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">إرفاق صورة / مستند بالزيارة</h3>
              <button onClick={() => setShowAttachmentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAttachmentSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الصورة أو الملف</label>
                <input
                  type="file"
                  required
                  accept={FILE_ACCEPT}
                  onChange={(e) => setAttFile(e.target.files?.[0] ?? null)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  الأنواع المسموحة: PDF، الصور، مستندات Office، CSV — بحد أقصى 8 ميجابايت.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAttachmentModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!attFile || isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  إضافة المرفق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Report Modal */}
      {isCentral && showReportUploadModal && selectedVisit && !isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">رفع تقرير الزيارة الرسمي</h3>
              <button onClick={() => setShowReportUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ملف التقرير</label>
                <input
                  type="file"
                  required
                  accept={FILE_ACCEPT}
                  onChange={(e) => setRepFile(e.target.files?.[0] ?? null)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  يُفضّل PDF أو صور عالية الدقة — بحد أقصى 8 ميجابايت.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReportUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!repFile || isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  تأكيد ورفع التقرير
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
