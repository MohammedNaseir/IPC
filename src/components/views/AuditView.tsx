'use client';

import { useState } from 'react';
import { Search, Filter, FileSpreadsheet } from 'lucide-react';
import type { AuditLogDTO } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

interface AuditViewProps {
  auditLogs: AuditLogDTO[];
}

const ENTITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Visit', label: 'الزيارات الرقابية (Visit)' },
  { value: 'Training', label: 'التدريب والتعليم (Training)' },
  { value: 'Hospital', label: 'إدارة المستشفيات (Hospital)' },
  { value: 'Policy', label: 'السياسات والنماذج (Policy)' },
  { value: 'Document', label: 'الوثائق التنظيمية ومركز الوثائق (Document)' },
  { value: 'Program', label: 'البرامج الاستراتيجية (Program)' },
  { value: 'Practitioner', label: 'الممارسون الصحيون (Practitioner)' },
  { value: 'Equipment', label: 'الأجهزة الطبية (Equipment)' },
  { value: 'User', label: 'المستخدمون وتسجيل الدخول (User)' },
];

// Quotes every cell and neutralises spreadsheet formula injection.
function csvCell(value: string): string {
  let text = value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function AuditView({ auditLogs }: AuditViewProps) {
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
    const rows = filteredLogs.map((l) => [l.id, l.entityType, l.entityId, l.action, l.performedBy, l.timestamp]);
    const csv = '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IPC_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
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
              {auditLogs.length} عملية معروضة
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل غير قابل للتعديل يوثق هوية المنفذ وتاريخ وتفاصيل كل إجراء رقابي أو تدريبي تم في النظام.
            يعرض آخر 500 عملية مسجلة.
          </p>
        </div>

        <button
          onClick={handleExportLogs}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-teal-400" />
          <span>تصدير السجل (CSV)</span>
        </button>
      </div>

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
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{formatDateTime(log.timestamp)}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">#{log.entityId.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
