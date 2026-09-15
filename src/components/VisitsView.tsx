import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  FileText,
  Paperclip,
  MessageSquare,
  History,
  Lock,
  Calendar,
  Building2,
  Users,
  Search,
  CheckCircle,
  Clock,
  Download,
  Upload,
  Send,
  Sparkles,
  Printer,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { Visit, Hospital, User, AuditLog } from '../types/ipc';

interface VisitsViewProps {
  currentUser: User;
  visits: Visit[];
  hospitals: Hospital[];
  auditLogs: AuditLog[];
  onCreateVisit: (data: { hospitalId: string; visitDate: string; team: string; details: string; complianceScore?: number }) => void;
  onUploadVisitReport: (visitId: string, reportUrl: string, reportName: string) => void;
  onAddVisitAttachment: (visitId: string, fileName: string, fileUrl: string) => void;
  onAddVisitResponse: (visitId: string, note: string, attachmentUrl?: string, attachmentName?: string) => void;
  onCompleteVisit: (visitId: string) => void;
}

export const VisitsView: React.FC<VisitsViewProps> = ({
  currentUser,
  visits,
  hospitals,
  auditLogs,
  onCreateVisit,
  onUploadVisitReport,
  onAddVisitAttachment,
  onAddVisitResponse,
  onCompleteVisit,
}) => {
  const isCentral = currentUser.role === 'central' || currentUser.isDevAdmin;

  // Strict initial list based on role
  const userInitialVisits = isCentral
    ? visits
    : visits.filter((v) => v.hospitalId === currentUser.hospitalId);

  // Selected visit in List & Detail pattern
  const [selectedVisitId, setSelectedVisitId] = useState<string>(userInitialVisits[0]?.id || '');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterHospital, setFilterHospital] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showReportUploadModal, setShowReportUploadModal] = useState(false);

  // New Visit form
  const [newHospId, setNewHospId] = useState(hospitals[0]?.id || '');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newTeam, setNewTeam] = useState('اسم عضو الفريق');
  const [newDetails, setNewDetails] = useState('');
  const [newCompliance, setNewCompliance] = useState<number>(85);

  // Response form (FR-12)
  const [responseNote, setResponseNote] = useState('');
  const [responseAttachName, setResponseAttachName] = useState('');
  const [responseAttachUrl, setResponseAttachUrl] = useState('');

  // Attachment form (FR-11)
  const [attFileName, setAttFileName] = useState('');
  const [attFileUrl, setAttFileUrl] = useState('');

  // Report form (FR-10)
  const [repName, setRepName] = useState('');
  const [repUrl, setRepUrl] = useState('');

  // Filtered visits - strictly isolated
  const filteredVisits = visits.filter((v) => {
    if (!isCentral && v.hospitalId !== currentUser.hospitalId) return false;
    if (filterStatus !== 'all' && v.status !== filterStatus) return false;
    if (isCentral && filterHospital && v.hospitalId !== filterHospital) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (v.hospitalName && v.hospitalName.toLowerCase().includes(q)) ||
        v.team.toLowerCase().includes(q) ||
        v.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedVisit = filteredVisits.find((v) => v.id === selectedVisitId) || filteredVisits[0];

  // Specific audit logs for this visit (FR-13)
  const visitAuditLogs = auditLogs.filter(
    (log) => log.entityType === 'Visit' && log.entityId === selectedVisit?.id
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospId || !newDetails.trim()) return;
    onCreateVisit({
      hospitalId: newHospId,
      visitDate: new Date(newDate).toISOString(),
      team: newTeam.trim(),
      details: newDetails.trim(),
      complianceScore: Number(newCompliance) || 85,
    });
    setShowCreateModal(false);
    setNewDetails('');
  };

  const handleResponseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !responseNote.trim()) return;
    onAddVisitResponse(
      selectedVisit.id,
      responseNote.trim(),
      responseAttachUrl.trim() || undefined,
      responseAttachName.trim() || undefined
    );
    setResponseNote('');
    setResponseAttachName('');
    setResponseAttachUrl('');
  };

  const handleAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !attFileName.trim()) return;
    onAddVisitAttachment(
      selectedVisit.id,
      attFileName.trim(),
      attFileUrl.trim() || 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80'
    );
    setShowAttachmentModal(false);
    setAttFileName('');
    setAttFileUrl('');
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit || !repName.trim()) return;
    onUploadVisitReport(
      selectedVisit.id,
      repUrl.trim() || '/reports/audit-official-report.pdf',
      repName.trim()
    );
    setShowReportUploadModal(false);
    setRepName('');
    setRepUrl('');
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

        {/* Only central creates visit */}
        {isCentral && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء زيارة رقابية جديدة</span>
          </button>
        )}
      </div>

      {/* Master-Detail Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (List of Visits): 5 columns */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filters Bar */}
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

          {/* Visits Cards List */}
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
                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                        {v.hospitalName || 'مستشفى'}
                      </h4>
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
                      <span>{new Date(v.visitDate).toLocaleDateString('ar-SA')}</span>
                    </p>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {v.details}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        {v.attachments?.length || 0} مرفق
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-400" />
                        {v.responses?.length || 0} رد من المستشفى
                      </span>
                      {v.complianceScore && (
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

        {/* Right Column (Detail View): 7 columns */}
        <div className="lg:col-span-7">
          {selectedVisit ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-6 p-6">
              {/* Visit Header */}
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
                    <span className="text-xs text-slate-400 font-mono">
                      #{selectedVisit.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedVisit.hospitalName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      تاريخ الزيارة: {new Date(selectedVisit.visitDate).toLocaleDateString('ar-SA')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      الفريق الزائر: {selectedVisit.team}
                    </span>
                  </div>
                </div>

                {/* Actions: Mark Completed or PDF Export */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs flex items-center gap-1"
                    title="تصدير تقرير الزيارة بصيغة PDF"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">طباعة PDF</span>
                  </button>

                  {isCentral && selectedVisit.status !== 'completed' && (
                    <button
                      onClick={() => onCompleteVisit(selectedVisit.id)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                      title="اعتماد الزيارة وإغلاقها نهائياً"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>اعتماد واكتمال الزيارة</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status Notice if Completed */}
              {isCompleted && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    هذه الزيارة مكتملة ومؤرشفة نهائياً ولا يمكن إجراء تعديلات أو إضافة ردود عليها.
                  </span>
                </div>
              )}

              {/* Visit Details Box */}
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
                      onClick={() => setShowReportUploadModal(true)}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{selectedVisit.reportUrl ? 'تحديث التقرير' : 'رفع تقرير الزيارة'}</span>
                    </button>
                  )}
                </div>

                {selectedVisit.reportUrl ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span className="font-bold text-slate-800 font-mono text-[11px]">
                        {selectedVisit.reportName || 'تقرير_الزيارة_الرسمي.pdf'}
                      </span>
                    </div>
                    <a
                      href={selectedVisit.reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-teal-700 hover:text-teal-900 font-semibold"
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
                    <h4 className="text-xs font-bold text-slate-800">
                      الصور والمرفقات الميدانية
                    </h4>
                  </div>
                  {!isCompleted && (
                    <button
                      onClick={() => setShowAttachmentModal(true)}
                      className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إرفاق صورة / ملف</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {!selectedVisit.attachments || selectedVisit.attachments.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg">
                      لا توجد صور أو مرفقات لهذه الزيارة
                    </div>
                  ) : (
                    selectedVisit.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs overflow-hidden"
                      >
                        <div className="h-24 w-full rounded bg-slate-200 mb-2 overflow-hidden flex items-center justify-center">
                          {att.fileUrl.startsWith('http') ? (
                            <img
                              src={att.fileUrl}
                              alt={att.fileName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <p className="font-medium text-slate-800 text-[11px] truncate" title={att.fileName}>
                          {att.fileName}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(att.uploadedAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Hospital Response / Reply Thread */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    سجل ردود وتحديثات المستشفى
                  </h4>
                </div>

                {/* Conversation timeline */}
                <div className="space-y-2.5">
                  {!selectedVisit.responses || selectedVisit.responses.length === 0 ? (
                    <div className="bg-slate-50 p-4 rounded-lg text-slate-400 text-xs text-center">
                      لم يتم تسجيل ردود من المستشفى على هذه الزيارة بعد
                    </div>
                  ) : (
                    selectedVisit.responses.map((resp) => (
                      <div
                        key={resp.id}
                        className="p-3.5 bg-teal-50/40 border border-teal-100 rounded-xl space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-bold text-teal-900">{resp.respondentName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(resp.respondedAt).toLocaleString('ar-SA')}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-relaxed">{resp.note}</p>
                        {resp.attachmentUrl && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-teal-200 rounded text-[11px] text-teal-800">
                            <FileText className="w-3.5 h-3.5 text-teal-600" />
                            <span>{resp.attachmentName || 'مرفق الرد.pdf'}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Response Input Form (if not completed) */}
                {!isCompleted && (
                  <form onSubmit={handleResponseSubmit} className="pt-2 space-y-2 text-xs">
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
                        type="text"
                        placeholder="اسم التقرير المرفق (اختياري)"
                        value={responseAttachName}
                        onChange={(e) => setResponseAttachName(e.target.value)}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex-1 text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="رابط الملف المرفق (اختياري)"
                        value={responseAttachUrl}
                        onChange={(e) => setResponseAttachUrl(e.target.value)}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex-1 text-slate-800"
                      />
                      <button
                        type="submit"
                        disabled={!responseNote.trim()}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>إرسال الرد</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Audit Log Timeline for this visit */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    سجل التدقيق والتتبع التلقائي للزيارة
                  </h4>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 divide-y divide-slate-100 text-xs">
                  {visitAuditLogs.length === 0 ? (
                    <p className="text-slate-400 text-center py-2">لا توجد سجلات تدقيق مسجلة للزيارة</p>
                  ) : (
                    visitAuditLogs.map((log) => (
                      <div key={log.id} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800 text-[11px]">{log.action}</p>
                          <span className="text-[10px] text-teal-700 font-medium">
                            بواسطة: {log.performedBy}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(log.timestamp).toLocaleString('ar-SA')}
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
      {showCreateModal && (
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
                  <label className="block font-bold text-slate-700 mb-1">نسبة الامتثال المقدرة %</label>
                  <input
                    type="number"
                    min="40"
                    max="100"
                    value={newCompliance}
                    onChange={(e) => setNewCompliance(Number(e.target.value))}
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  حفظ وتوثيق الزيارة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Photo/File Modal */}
      {showAttachmentModal && (
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
                <label className="block font-bold text-slate-700 mb-1">اسم المرفق أو وصف الصورة</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: توثيق_غرفة_العزل_الرئيسية.jpg"
                  value={attFileName}
                  onChange={(e) => setAttFileName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رابط الملف / الصورة (URL)</label>
                <input
                  type="text"
                  placeholder="https://... أو مسار الملف"
                  value={attFileUrl}
                  onChange={(e) => setAttFileUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  إضافة المرفق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Report Modal */}
      {showReportUploadModal && (
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
                <label className="block font-bold text-slate-700 mb-1">عنوان ملف التقرير</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تقرير_الزيارة_الميدانية_الربع_الثالث.pdf"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رابط ملف التقرير (URL)</label>
                <input
                  type="text"
                  placeholder="/reports/visit-report-2026.pdf"
                  value={repUrl}
                  onChange={(e) => setRepUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
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
};
