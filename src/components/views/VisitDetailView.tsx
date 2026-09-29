'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Paperclip,
  MessageSquare,
  History,
  Lock,
  Calendar,
  Users,
  Download,
  Upload,
  Send,
  Printer,
  ArrowLeft,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { AuditLogDTO, SessionUser, VisitDTO } from '@/lib/types';
import { formatDate, formatDateTime, formatFileSize } from '@/lib/format';
import { addVisitAttachment, addVisitResponse, completeVisit, uploadVisitReport } from '@/server/actions/visits';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface VisitDetailViewProps {
  user: SessionUser;
  visit: VisitDTO;
  /** Already scoped to this visit by the page's query. */
  auditLogs: AuditLogDTO[];
}

const FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.pptx,.csv';

/**
 * One visit, in full, on its own page. Moved out of the split panel in `VisitsView` unchanged in
 * function: the same content, the same actions, the same Server Action calls (feature 003, FR-012).
 */
export function VisitDetailView({ user, visit, auditLogs }: VisitDetailViewProps) {
  const isCentral = user.role === 'central';
  const { run, isPending } = useActionRunner();

  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showReportUploadModal, setShowReportUploadModal] = useState(false);

  const [responseNote, setResponseNote] = useState('');
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [responseFileKey, setResponseFileKey] = useState(0);

  const [attFile, setAttFile] = useState<File | null>(null);
  const [repFile, setRepFile] = useState<File | null>(null);

  const isCompleted = visit.status === 'completed';

  const handleResponseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseNote.trim()) return;
    const formData = new FormData();
    formData.set('visitId', visit.id);
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
    if (!attFile) return;
    const formData = new FormData();
    formData.set('visitId', visit.id);
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
    if (!repFile) return;
    const formData = new FormData();
    formData.set('visitId', visit.id);
    formData.set('file', repFile);
    run(
      () => uploadVisitReport(formData),
      () => {
        setShowReportUploadModal(false);
        setRepFile(null);
      },
    );
  };

  const handleComplete = () => {
    if (!window.confirm('هل تريد اعتماد الزيارة وإغلاقها نهائياً؟ لن يمكن تعديلها بعد الأرشفة.')) return;
    run(() => completeVisit(visit.id));
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Breadcrumb and back path (FR-004). Excluded from print, like every other control. */}
      <div className="no-print flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/visits"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-navy-700 hover:border-navy-300 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
          <span>العودة لسجل الزيارات</span>
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-navy-700 font-medium truncate">{visit.hospitalName}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isCompleted
                    ? 'bg-navy-50 text-navy-700 border border-navy-200'
                    : 'bg-attn-50 text-attn-700 border border-attn-200'
                }`}
              >
                {isCompleted ? 'زيارة مكتملة ومؤرشفة' : 'زيارة قيد المتابعة والتنفيذ'}
              </span>
              <span className="text-xs text-muted font-mono">#{visit.id}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{visit.hospitalName}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted" />
                تاريخ الزيارة: {formatDate(visit.visitDate)}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-muted" />
                الفريق الزائر: {visit.team}
              </span>
              {visit.complianceScore !== null && (
                <span className="font-mono font-bold text-navy-700 bg-navy-50 px-1.5 py-0.5 rounded">
                  {visit.complianceScore}% امتثال
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
              /* The one irreversible act in the product. Red and a lock, never green and a checkmark:
                 emerald plus CheckCircle is the grammar of reversible success, and this button forecloses
                 every subsequent write. Red is reserved for exactly this and for failure states. */
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="px-3.5 py-2 bg-danger-800 hover:bg-danger-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                title="اعتماد الزيارة وإغلاقها نهائياً"
              >
                <Lock className="w-4 h-4" />
                <span>اعتماد واكتمال الزيارة</span>
              </button>
            )}
          </div>
        </div>

        {isCompleted && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted shrink-0" />
            <span>هذه الزيارة مكتملة ومؤرشفة نهائياً ولا يمكن إجراء تعديلات أو إضافة ردود عليها.</span>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold text-slate-800 mb-2">تفاصيل وملاحظات الزيارة العامة:</h3>
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-700 leading-relaxed border border-slate-100 whitespace-pre-wrap">
            {visit.details}
          </div>
        </div>

        {/* Official Report */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-navy-700" />
              <h3 className="text-xs font-bold text-slate-800">تقرير الزيارة الرسمي</h3>
            </div>
            {isCentral && !isCompleted && (
              <button
                onClick={() => {
                  setRepFile(null);
                  setShowReportUploadModal(true);
                }}
                className="no-print text-xs font-bold text-navy-700 hover:text-navy-900 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{visit.report ? 'تحديث التقرير' : 'رفع تقرير الزيارة'}</span>
              </button>
            )}
          </div>

          {visit.report ? (
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-navy-700 shrink-0" />
                <span className="font-bold text-slate-800 font-mono text-[11px] truncate">{visit.report.name}</span>
                <span className="text-[10px] text-muted font-mono shrink-0">
                  {formatFileSize(visit.report.size)}
                </span>
              </div>
              <a
                href={visit.report.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-navy-700 hover:text-navy-900 font-semibold shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل التقرير</span>
              </a>
            </div>
          ) : (
            <p className="text-muted text-xs py-2 text-center">
              لم يتم رفع تقرير الزيارة بعد من قِبل الإدارة المركزية
            </p>
          )}
        </div>

        {/* Attachments & Photos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-navy-700" />
              <h3 className="text-xs font-bold text-slate-800">الصور والمرفقات الميدانية</h3>
            </div>
            {!isCompleted && (
              <button
                onClick={() => {
                  setAttFile(null);
                  setShowAttachmentModal(true);
                }}
                className="no-print text-xs font-bold text-navy-700 hover:text-navy-900 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إرفاق صورة / ملف</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visit.attachments.length === 0 ? (
              <div className="col-span-full py-4 text-center text-muted text-xs bg-slate-50 rounded-lg">
                لا توجد صور أو مرفقات لهذه الزيارة
              </div>
            ) : (
              visit.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs overflow-hidden hover:border-navy-400 transition-colors"
                >
                  <div className="h-24 w-full rounded bg-slate-200 mb-2 overflow-hidden flex items-center justify-center">
                    {att.file.mimeType.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.file.url} alt={att.file.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted" />
                    )}
                  </div>
                  <p className="font-medium text-slate-800 text-[11px] truncate" title={att.file.name}>
                    {att.file.name}
                  </p>
                  <span className="text-[10px] text-muted block mt-0.5">
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
            <MessageSquare className="w-4 h-4 text-navy-700" />
            <h3 className="text-xs font-bold text-slate-800">سجل ردود وتحديثات المستشفى</h3>
          </div>

          <div className="space-y-2.5">
            {visit.responses.length === 0 ? (
              <div className="bg-slate-50 p-4 rounded-lg text-muted text-xs text-center">
                لم يتم تسجيل ردود من المستشفى على هذه الزيارة بعد
              </div>
            ) : (
              visit.responses.map((resp) => (
                <div key={resp.id} className="p-3.5 bg-navy-50/40 border border-navy-100 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-bold text-navy-900">{resp.respondentName}</span>
                    <span className="text-[10px] text-muted">{formatDateTime(resp.respondedAt)}</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{resp.note}</p>
                  {resp.attachment && (
                    <a
                      href={resp.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-navy-200 rounded text-[11px] text-navy-800 hover:bg-navy-50"
                    >
                      <FileText className="w-3.5 h-3.5 text-navy-700" />
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
                rows={3}
                placeholder="اكتب ملاحظة أو توضيح المستشفى بشأن ملاحظات الزيارة..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-navy-600 focus:outline-none text-slate-800"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  key={responseFileKey}
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(e) => setResponseFile(e.target.files?.[0] ?? null)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex-1 min-w-0 text-slate-800"
                  title="تقرير رد مرفق (اختياري، بحد أقصى 8 ميجابايت)"
                />
                <button
                  type="submit"
                  disabled={!responseNote.trim() || isPending}
                  className="px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال الرد</span>
                </button>
              </div>
              <p className="text-[10px] text-muted">المرفق اختياري (PDF، صور، مستندات Office) بحد أقصى 8 ميجابايت.</p>
            </form>
          )}
        </div>

        {/* Audit Log Timeline */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-navy-700" />
            <h3 className="text-xs font-bold text-slate-800">سجل التدقيق والتتبع التلقائي للزيارة</h3>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 divide-y divide-slate-100 text-xs">
            {auditLogs.length === 0 ? (
              <p className="text-muted text-center py-2">لا توجد سجلات تدقيق مسجلة للزيارة</p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-[11px]">{log.action}</p>
                    <span className="text-[10px] text-navy-700 font-medium">بواسطة: {log.performedBy}</span>
                  </div>
                  <span className="text-[10px] text-muted font-mono shrink-0">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Attach Photo/File Modal */}
      {showAttachmentModal && !isCompleted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">إرفاق صورة / مستند بالزيارة</h3>
              <button onClick={() => setShowAttachmentModal(false)} className="text-muted hover:text-white">
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
                <p className="text-[11px] text-muted mt-1">
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
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  إضافة المرفق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Report Modal */}
      {isCentral && showReportUploadModal && !isCompleted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in no-print"
          dir="rtl"
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white">رفع تقرير الزيارة الرسمي</h3>
              <button onClick={() => setShowReportUploadModal(false)} className="text-muted hover:text-white">
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
                <p className="text-[11px] text-muted mt-1">يُفضّل PDF أو صور عالية الدقة — بحد أقصى 8 ميجابايت.</p>
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
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
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
