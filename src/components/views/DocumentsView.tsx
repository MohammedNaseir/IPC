'use client';

import { useMemo, useState } from 'react';
import { Upload, Download, Filter, Network, FileArchive, X } from 'lucide-react';
import type {
  DocumentCenterFileDTO,
  OrgDocType,
  OrgDocumentDTO,
  PolicyCategory,
  PolicyDTO,
  SessionUser,
} from '@/lib/types';
import type { ColumnDef } from '@/lib/table';
import { DataTable } from '@/components/table/DataTable';
import { formatDate, formatFileSize } from '@/lib/format';
import { createPolicy } from '@/server/actions/policies';
import { createOrgDocument } from '@/server/actions/org-documents';
import { createDocumentCenterFile } from '@/server/actions/document-center';
import { useActionRunner } from '@/components/hooks/useActionRunner';

type ModuleType = 'policies' | 'orgDocs' | 'docCenter';

interface DocumentsViewProps {
  user: SessionUser;
  moduleType: ModuleType;
  policies?: PolicyDTO[];
  orgDocs?: OrgDocumentDTO[];
  docCenterItems?: DocumentCenterFileDTO[];
}

const FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.pptx,.csv';

const POLICY_CATEGORY_LABELS: Record<PolicyCategory, string> = {
  policy: 'سياسة',
  procedure: 'إجراء',
  form: 'نموذج',
};

const ORG_DOC_TYPE_LABELS: Record<OrgDocType, string> = {
  org_structure: 'هيكل تنظيمي',
  job_description: 'وصف وظيفي',
};

const META = {
  policies: {
    title: 'مكتبة السياسات والإجراءات والنماذج',
    srsRule: 'دليل معتمد',
    desc: 'الدليل المعتمد لسياسات مكافحة العدوى ونماذج التقييم (رفع للإدارة المركزية، قراءة وتحميل للمستشفيات).',
    btnText: 'رفع سياسة / نموذج جديد',
  },
  orgDocs: {
    title: 'الهيكل التنظيمي والوصف الوظيفي',
    srsRule: 'هيكل معتمد',
    desc: 'ملفات PDF للهياكل التنظيمية وتوصيف مهام منسقي وممارسي مكافحة العدوى بالتجمع الصحي.',
    btnText: 'رفع وثيقة تنظيمية',
  },
  docCenter: {
    title: 'مركز الوثائق العام',
    srsRule: 'مستودع إداري',
    desc: 'مستودع الوثائق والتعاميم الإدارية العامة غير المصنفة التابعة للإدارة المركزية.',
    btnText: 'إضافة ملف للمستودع العام',
  },
} as const;

export function DocumentsView({ user, moduleType, policies = [], orgDocs = [], docCenterItems = [] }: DocumentsViewProps) {
  const isCentral = user.role === 'central';
  const { run, isPending } = useActionRunner();
  const [selectedCategory, setSelectedCategory] = useState<'all' | PolicyCategory>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PolicyCategory>('policy');
  const [orgDocType, setOrgDocType] = useState<OrgDocType>('org_structure');
  const [version, setVersion] = useState('1.0');
  const [file, setFile] = useState<File | null>(null);

  const meta = META[moduleType];

  // The category select keeps narrowing the policy list as before; the table adds search, sort and paging.
  const scopedPolicies = useMemo(
    () => policies.filter((p) => selectedCategory === 'all' || p.category === selectedCategory),
    [policies, selectedCategory],
  );

  // The download stays a real link, exactly as the cards had it, so target/middle-click behaviour and the
  // browser's own download handling are unchanged. It therefore lives in a column, not in `actions`.
  function downloadColumn<T extends { file: { url: string } }>(label: string, tone: string): ColumnDef<T> {
    return {
      key: 'download',
      header: 'الملف',
      sortable: false,
      searchable: false,
      align: 'end',
      value: () => null,
      render: (row) => (
        <a
          href={row.file.url}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg font-bold transition-colors text-[11px] ${tone}`}
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{label}</span>
        </a>
      ),
    };
  }

  const sizeColumn = <T extends { file: { size: number } }>(): ColumnDef<T> => ({
    key: 'size',
    header: 'حجم الملف',
    type: 'number',
    align: 'end',
    value: (row) => row.file.size,
    render: (row) => <span className="font-mono text-muted">{formatFileSize(row.file.size)}</span>,
    hideBelowMd: true,
  });

  const uploadedAtColumn = <T extends { uploadedAt: string }>(header: string): ColumnDef<T> => ({
    key: 'uploadedAt',
    header,
    type: 'date',
    value: (row) => row.uploadedAt,
    render: (row) => <span className="whitespace-nowrap text-slate-500">{formatDate(row.uploadedAt)}</span>,
  });

  const policyColumns: ColumnDef<PolicyDTO>[] = [
    { key: 'title', header: 'عنوان الوثيقة', value: (p) => p.title, render: (p) => <span className="font-bold text-slate-900">{p.title}</span> },
    {
      key: 'category',
      header: 'التصنيف',
      value: (p) => POLICY_CATEGORY_LABELS[p.category],
      render: (p) => (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 border border-navy-200 whitespace-nowrap">
          {POLICY_CATEGORY_LABELS[p.category]}
        </span>
      ),
    },
    { key: 'version', header: 'الإصدار', value: (p) => p.version, render: (p) => <span className="font-mono text-slate-500">إصدار {p.version}</span> },
    sizeColumn<PolicyDTO>(),
    uploadedAtColumn<PolicyDTO>('تاريخ الرفع'),
    downloadColumn<PolicyDTO>('تحميل الوثيقة', 'hover:bg-navy-50 text-navy-700'),
  ];

  const orgDocColumns: ColumnDef<OrgDocumentDTO>[] = [
    {
      key: 'title',
      header: 'عنوان الوثيقة',
      value: (o) => o.title,
      render: (o) => (
        <span className="flex items-center gap-2">
          <Network className="w-3.5 h-3.5 text-navy-700 shrink-0" aria-hidden="true" />
          <span className="font-bold text-slate-900">{o.title}</span>
        </span>
      ),
    },
    {
      key: 'type',
      header: 'النوع',
      value: (o) => ORG_DOC_TYPE_LABELS[o.type],
      render: (o) => (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 border border-navy-200 whitespace-nowrap">
          {ORG_DOC_TYPE_LABELS[o.type]}
        </span>
      ),
    },
    { key: 'uploadedBy', header: 'تم الرفع بواسطة', value: (o) => o.uploadedBy ?? 'الإدارة المركزية' },
    sizeColumn<OrgDocumentDTO>(),
    uploadedAtColumn<OrgDocumentDTO>('تاريخ الرفع'),
    downloadColumn<OrgDocumentDTO>('استعراض وتحميل', 'hover:bg-navy-50 text-navy-700'),
  ];

  const docCenterColumns: ColumnDef<DocumentCenterFileDTO>[] = [
    {
      key: 'title',
      header: 'عنوان الملف',
      value: (d) => d.title,
      render: (d) => (
        <span className="flex items-center gap-2">
          <FileArchive className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <span className="font-bold text-slate-900">{d.title}</span>
        </span>
      ),
    },
    { key: 'uploadedBy', header: 'تم الرفع بواسطة', value: (d) => d.uploadedBy ?? 'الإدارة المركزية' },
    sizeColumn<DocumentCenterFileDTO>(),
    uploadedAtColumn<DocumentCenterFileDTO>('تاريخ الإضافة'),
    downloadColumn<DocumentCenterFileDTO>('تحميل الملف', 'hover:bg-slate-100 text-slate-700'),
  ];

  const openUploadModal = () => {
    setTitle('');
    setCategory('policy');
    setOrgDocType('org_structure');
    setVersion('1.0');
    setFile(null);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      window.alert('يرجى اختيار ملف لرفعه.');
      return;
    }
    const formData = new FormData();
    formData.set('title', title);
    formData.set('file', file);

    let action;
    if (moduleType === 'policies') {
      formData.set('category', category);
      formData.set('version', version);
      action = () => createPolicy(formData);
    } else if (moduleType === 'orgDocs') {
      formData.set('type', orgDocType);
      action = () => createOrgDocument(formData);
    } else {
      action = () => createDocumentCenterFile(formData);
    }
    run(action, () => setShowUploadModal(false));
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>المستودع المعرفي</span>
            <span>/</span>
            <span className="text-navy-700 font-medium">{meta.title}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {meta.title}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 font-bold border border-navy-200">
              {meta.srsRule}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
        </div>

        {isCentral && (
          <button
            onClick={openUploadModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>{meta.btnText}</span>
          </button>
        )}
      </div>

      {moduleType === 'policies' && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as 'all' | PolicyCategory)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">كافة التصنيفات</option>
              {(Object.keys(POLICY_CATEGORY_LABELS) as PolicyCategory[]).map((c) => (
                <option key={c} value={c}>
                  {POLICY_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {moduleType === 'policies' && (
        <DataTable
          rows={scopedPolicies}
          columns={policyColumns}
          rowKey={(p) => p.id}
          searchPlaceholder="بحث في عناوين السياسات والتصنيفات..."
          emptyMessage="لا توجد سياسات مرفوعة بعد"
          noMatchMessage="لا توجد سياسات مطابقة للبحث"
          caption="مكتبة السياسات والإجراءات والنماذج"
        />
      )}

      {moduleType === 'orgDocs' && (
        <DataTable
          rows={orgDocs}
          columns={orgDocColumns}
          rowKey={(o) => o.id}
          searchPlaceholder="بحث في عناوين الوثائق التنظيمية..."
          emptyMessage="لا توجد وثائق تنظيمية مرفوعة بعد"
          noMatchMessage="لا توجد وثائق تنظيمية مطابقة"
          caption="الهيكل التنظيمي والوصف الوظيفي"
        />
      )}

      {moduleType === 'docCenter' && (
        <DataTable
          rows={docCenterItems}
          columns={docCenterColumns}
          rowKey={(d) => d.id}
          searchPlaceholder="بحث في عناوين ملفات المستودع..."
          emptyMessage="لا توجد ملفات في المستودع العام"
          noMatchMessage="لا توجد ملفات مطابقة للبحث"
          caption="مركز الوثائق العام"
        />
      )}

      {isCentral && showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-navy-400" />
                {meta.btnText}
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الوثيقة أو الملف</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سياسة الوقاية من عدوى مجرى الدم المرتبطة بالقساطر"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              {moduleType === 'policies' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">التصنيف</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PolicyCategory)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    >
                      {(Object.keys(POLICY_CATEGORY_LABELS) as PolicyCategory[]).map((c) => (
                        <option key={c} value={c}>
                          {POLICY_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الإصدار</label>
                    <input
                      type="text"
                      required
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  </div>
                </div>
              )}

              {moduleType === 'orgDocs' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الوثيقة</label>
                  <select
                    value={orgDocType}
                    onChange={(e) => setOrgDocType(e.target.value as OrgDocType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  >
                    {(Object.keys(ORG_DOC_TYPE_LABELS) as OrgDocType[]).map((t) => (
                      <option key={t} value={t}>
                        {ORG_DOC_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">الملف المرفوع</label>
                <input
                  type="file"
                  required
                  accept={FILE_ACCEPT}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 file:ml-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:bg-navy-50 file:text-navy-700 file:font-bold"
                />
                <p className="text-[11px] text-muted mt-1">
                  PDF، صور، مستندات Office أو CSV — الحد الأقصى 8 ميجابايت
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  {isPending ? 'جاري الرفع...' : 'تأكيد الرفع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
