import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Plus,
  Network,
  FileArchive,
  BookOpen,
  X,
  Sparkles,
} from 'lucide-react';
import { PolicyItem, OrgDocument, DocumentCenterItem, User } from '../types/ipc';

interface DocumentsViewProps {
  currentUser: User;
  moduleType: 'policies' | 'orgDocs' | 'docCenter';
  policies: PolicyItem[];
  orgDocs: OrgDocument[];
  docCenterItems: DocumentCenterItem[];
  onAddPolicy: (data: Omit<PolicyItem, 'id' | 'createdAt'>) => void;
  onAddOrgDoc: (data: Omit<OrgDocument, 'id' | 'uploadedAt'>) => void;
  onAddDocCenterItem: (data: Omit<DocumentCenterItem, 'id' | 'uploadedAt'>) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  currentUser,
  moduleType,
  policies,
  orgDocs,
  docCenterItems,
  onAddPolicy,
  onAddOrgDoc,
  onAddDocCenterItem,
}) => {
  const isCentral = currentUser.role === 'central' || currentUser.isDevAdmin;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(
    moduleType === 'policies' ? 'سياسات وقائية' : moduleType === 'orgDocs' ? 'هيكل تنظيمي' : 'تعاميم وزارية'
  );
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');

  // Titles and descriptions based on moduleType
  const meta = {
    policies: {
      title: 'مكتبة السياسات والإجراءات والنماذج',
      srsRule: 'دليل معتمد',
      desc: 'الدليل المعتمد لسياسات مكافحة العدوى ونماذج التقييم (رفع للإدارة المركزية، قراءة وتحميل للمستشفيات).',
      icon: BookOpen,
      btnText: 'رفع سياسة / نموذج جديد',
    },
    orgDocs: {
      title: 'الهيكل التنظيمي والوصف الوظيفي',
      srsRule: 'هيكل معتمد',
      desc: 'ملفات PDF للهياكل التنظيمية وتوصيف مهام منسقي وممارسي مكافحة العدوى بالتجمع الصحي.',
      icon: Network,
      btnText: 'رفع وثيقة تنظيمية',
    },
    docCenter: {
      title: 'مركز الوثائق العام',
      srsRule: 'مستودع إداري',
      desc: 'مستودع الوثائق والتعاميم الإدارية العامة غير المصنفة التابعة للإدارة المركزية.',
      icon: FileArchive,
      btnText: 'إضافة ملف للمستودع العام',
    },
  }[moduleType];

  const IconComponent = meta.icon;

  // Filtered files
  const filteredPolicies = policies.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredOrgDocs = orgDocs.filter((o) => {
    if (searchQuery && !o.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredDocCenter = docCenterItems.filter((d) => {
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (moduleType === 'policies') {
      onAddPolicy({
        title: title.trim(),
        category: category.trim(),
        fileUrl: fileUrl.trim() || '/documents/sample-policy.pdf',
        fileSize: fileSize || '2.1 MB',
        version: '1.0',
      });
    } else if (moduleType === 'orgDocs') {
      onAddOrgDoc({
        title: title.trim(),
        fileUrl: fileUrl.trim() || '/documents/org-chart.pdf',
        fileSize: fileSize || '1.8 MB',
        uploadedBy: currentUser.name,
      });
    } else {
      onAddDocCenterItem({
        title: title.trim(),
        fileUrl: fileUrl.trim() || '/documents/circular.pdf',
        fileSize: fileSize || '950 KB',
        uploadedBy: currentUser.name,
        description: 'وثيقة رسمية معتمدة من الإدارة المركزية لمكافحة العدوى',
      });
    }

    setShowUploadModal(false);
    setTitle('');
    setFileUrl('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Header */}
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

        {/* FR-27, FR-29, FR-30: Central only uploads */}
        {isCentral && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>{meta.btnText}</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
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
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
            >
              <option value="all">كافة التصنيفات</option>
              <option value="سياسات وقائية">سياسات وقائية</option>
              <option value="نماذج تقييم وتدقيق">نماذج تقييم وتدقيق</option>
              <option value="أدلة إرشادية">أدلة إرشادية</option>
              <option value="معايير اعتماد">معايير اعتماد</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Lists */}
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
                      {p.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      إصدار {p.version || '1.0'}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 leading-snug">{p.title}</h3>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">{p.fileSize}</span>
                  <a
                    href={p.fileUrl}
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
                    <h3 className="font-bold text-xs text-slate-900 leading-snug">{o.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      تم الرفع بواسطة: {o.uploadedBy || 'الإدارة المركزية'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">{o.fileSize}</span>
                  <a
                    href={o.fileUrl}
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
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{d.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">{d.fileSize}</span>
                  <a
                    href={d.fileUrl}
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

      {/* Upload Modal (FR-27, 29, 30) */}
      {showUploadModal && (
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
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value="سياسات وقائية">سياسات وقائية</option>
                    <option value="نماذج تقييم وتدقيق">نماذج تقييم وتدقيق</option>
                    <option value="أدلة إرشادية">أدلة إرشادية</option>
                    <option value="معايير اعتماد">معايير اعتماد</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">مسار أو رابط الملف المرفوع</label>
                <input
                  type="text"
                  placeholder="/policies/document.pdf"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">حجم الملف التقديري</label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  تأكيد الرفع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
