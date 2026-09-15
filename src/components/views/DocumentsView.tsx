'use client';

import { useState } from 'react';
import { Upload, Download, Search, Filter, Network, FileArchive, X } from 'lucide-react';
import type {
  DocumentCenterFileDTO,
  OrgDocType,
  OrgDocumentDTO,
  PolicyCategory,
  PolicyDTO,
  SessionUser,
} from '@/lib/types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | PolicyCategory>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PolicyCategory>('policy');
  const [orgDocType, setOrgDocType] = useState<OrgDocType>('org_structure');
  const [version, setVersion] = useState('1.0');
  const [file, setFile] = useState<File | null>(null);

  const meta = META[moduleType];
  const q = searchQuery.toLowerCase();

  const filteredPolicies = policies.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    return !q || p.title.toLowerCase().includes(q);
  });
  const filteredOrgDocs = orgDocs.filter((o) => !q || o.title.toLowerCase().includes(q));
  const filteredDocCenter = docCenterItems.filter((d) => !q || d.title.toLowerCase().includes(q));

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
            <span className="text-teal-700 font-medium">{meta.title}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {meta.title}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
              {meta.srsRule}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
        </div>

        {isCentral && (
          <button
            onClick={openUploadModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>{meta.btnText}</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="بحث في أسماء الملفات، التصنيفات، العناوين..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>

        {moduleType === 'policies' && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
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
        )}
      </div>

      {moduleType === 'policies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              لا توجد سياسات مطابقة للبحث
            </div>
          ) : (
            filteredPolicies.map((p) => (
              <div
                key={p.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {POLICY_CATEGORY_LABELS[p.category]}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">إصدار {p.version}</span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-900 leading-snug">{p.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">تاريخ الرفع: {formatDate(p.uploadedAt)}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">{formatFileSize(p.file.size)}</span>
                  <a
                    href={p.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-teal-50 text-teal-700 rounded-lg font-bold transition-colors text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الوثيقة</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {moduleType === 'orgDocs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgDocs.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              لا توجد وثائق تنظيمية مطابقة
            </div>
          ) : (
            filteredOrgDocs.map((o) => (
              <div
                key={o.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {ORG_DOC_TYPE_LABELS[o.type]}
                    </span>
                    <h3 className="font-bold text-xs text-slate-900 leading-snug mt-1.5">{o.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      تم الرفع بواسطة: {o.uploadedBy ?? 'الإدارة المركزية'} • {formatDate(o.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">{formatFileSize(o.file.size)}</span>
                  <a
                    href={o.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-indigo-700 rounded-lg font-bold transition-colors text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>استعراض وتحميل</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {moduleType === 'docCenter' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocCenter.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              لا توجد ملفات في المستودع العام
            </div>
          ) : (
            filteredDocCenter.map((d) => (
              <div
                key={d.id}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    <FileArchive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 leading-snug">{d.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      تم الرفع بواسطة: {d.uploadedBy ?? 'الإدارة المركزية'} • {formatDate(d.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">{formatFileSize(d.file.size)}</span>
                  <a
                    href={d.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg font-bold transition-colors text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل الملف</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isCentral && showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-400" />
                {meta.btnText}
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
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
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 file:ml-3 file:px-3 file:py-1 file:rounded-md file:border-0 file:bg-teal-50 file:text-teal-700 file:font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
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
