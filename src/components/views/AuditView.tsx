'use client';

import { useMemo, useState } from 'react';
import { Filter, FileSpreadsheet } from 'lucide-react';
import type { AuditLogDTO } from '@/lib/types';
import type { ColumnDef } from '@/lib/table';
import { DataTable } from '@/components/table/DataTable';
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
  const [filterEntity, setFilterEntity] = useState('all');

  // The entity select keeps narrowing the log as before; the table adds search, sort and paging.
  const scopedLogs = useMemo(
    () => auditLogs.filter((log) => filterEntity === 'all' || log.entityType === filterEntity),
    [auditLogs, filterEntity],
  );

  // R-007: export the filtered-and-sorted set the user is looking at — not the raw array, and not just
  // the current page. Mirrored from the table so the two can never disagree.
  const [filteredLogs, setFilteredLogs] = useState<AuditLogDTO[]>(scopedLogs);

  const auditColumns: ColumnDef<AuditLogDTO>[] = [
    {
      key: 'entityType',
      header: 'نوع الكيان',
      value: (log) => log.entityType,
      render: (log) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
          {log.entityType}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'الإجراء المنفذ',
      value: (log) => log.action,
      render: (log) => <span className="font-medium text-slate-900">{log.action}</span>,
    },
    {
      key: 'performedBy',
      header: 'المنفذ',
      value: (log) => log.performedBy,
      render: (log) => <span className="font-semibold text-navy-800">{log.performedBy}</span>,
    },
    {
      key: 'timestamp',
      header: 'التاريخ والتوقيت',
      type: 'date',
      value: (log) => log.timestamp,
      render: (log) => <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">{formatDateTime(log.timestamp)}</span>,
    },
    {
      key: 'entityId',
      header: 'معرف الكيان',
      value: (log) => log.entityId,
      render: (log) => <span className="font-mono text-[10px] text-muted">#{log.entityId.slice(0, 10)}</span>,
      hideBelowMd: true,
    },
  ];

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
            <span className="text-navy-700 font-medium">سجل التدقيق والتتبع التلقائي المعتمد</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            سجل تدقيق العمليات الرقابية والتوثيق
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 font-bold border border-navy-200">
              {filteredLogs.length} عملية معروضة
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
          <FileSpreadsheet className="w-4 h-4 text-navy-400" />
          <span>تصدير السجل (CSV)</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted" />
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

      <DataTable
        rows={scopedLogs}
        columns={auditColumns}
        rowKey={(log) => log.id}
        onStateChange={({ filteredRows }) => setFilteredLogs(filteredRows)}
        searchPlaceholder="بحث في الإجراءات، أسماء المستخدمين، نوع الكيان..."
        emptyMessage="لا توجد عمليات مسجلة في سجل التدقيق"
        noMatchMessage="لا توجد سجلات مطابقة للفلتر المحدد"
        caption="سجل تدقيق العمليات"
      />
    </div>
  );
}
