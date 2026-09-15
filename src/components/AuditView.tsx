import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AuditLog, User } from '../types/ipc';

interface AuditViewProps {
  currentUser: User;
  auditLogs: AuditLog[];
}

export const AuditView: React.FC<AuditViewProps> = ({ currentUser, auditLogs }) => {
  const isCentral = currentUser.role === 'central';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntity, setFilterEntity] = useState('all');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterEntity !== 'all' && log.entityType !== filterEntity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.performedBy.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportLogs = () => {
    const headers = ['المعرف', 'نوع الكيان', 'معرف الكيان', 'الإجراء المنفذ', 'المستخدم', 'التاريخ والوقت'];
    const rows = filteredLogs.map((l) =>
      [l.id, l.entityType, l.entityId, `"${l.action}"`, l.performedBy, l.timestamp].join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IPC_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>التدقيق والأمان</span>
            <span>/</span>
            <span className="text-teal-700 font-medium">سجل التدقيق والتتبع التلقائي المعتمد</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            سجل تدقيق العمليات الرقابية والتوثيق
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
              {auditLogs.length} عملية مسجلة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل غير قابل للتعديل يوثق هوية المنفذ وتاريخ وتفاصيل كل إجراء رقابي أو تدريبي تم في النظام.
          </p>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExportLogs}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-teal-400" />
          <span>تصدير السجل (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="بحث في الإجراءات، أسماء المستخدمين، نوع الكيان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
          >
            <option value="all">كافة الكيانات</option>
            <option value="Visit">الزيارات الرقابية (Visit)</option>
            <option value="Training">التدريب والتعليم (Training)</option>
            <option value="Hospital">إدارة المستشفيات (Hospital)</option>
            <option value="Policy">السياسات والنماذج (Policy)</option>
            <option value="Program">البرامج الاستراتيجية (Program)</option>
            <option value="Practitioner">الممارسون الصحيون (Practitioner)</option>
            <option value="Equipment">الأجهزة الطبية (Equipment)</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">نوع الكيان</th>
                <th className="py-3.5 px-4">الإجراء المنفذ</th>
                <th className="py-3.5 px-4">المنفذ</th>
                <th className="py-3.5 px-4">التاريخ والتوقيت</th>
                <th className="py-3.5 px-4">معرف الكيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    لا توجد سجلات مطابقة للفلتر المحدد
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{log.action}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-teal-800">{log.performedBy}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString('ar-SA')}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      #{log.entityId.slice(0, 10)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
