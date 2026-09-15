'use client';

import { Fragment, useState } from 'react';
import { FolderPlus, Folder, FileText, Upload, Download, ChevronRight, ArrowLeft, X } from 'lucide-react';
import type { ProgramFileDTO, ProgramNodeDTO, SessionUser } from '@/lib/types';
import { formatDate, formatFileSize } from '@/lib/format';
import { createProgramNode, uploadProgramFile } from '@/server/actions/programs';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface ProgramsViewProps {
  user: SessionUser;
  nodes: ProgramNodeDTO[];
  files: ProgramFileDTO[];
}

const FILE_ACCEPT = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.pptx,.csv';

export function ProgramsView({ user, nodes, files }: ProgramsViewProps) {
  const isCentral = user.role === 'central';
  const { run, isPending } = useActionRunner();

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);

  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const currentNode = nodes.find((n) => n.id === currentNodeId);
  // If the current node disappeared (e.g. stale state), fall back to root.
  const activeNodeId = currentNode ? currentNode.id : null;

  const breadcrumbs: ProgramNodeDTO[] = [];
  let cursor = currentNode;
  while (cursor) {
    breadcrumbs.unshift(cursor);
    const parentId: string | null = cursor.parentId;
    cursor = parentId ? nodes.find((n) => n.id === parentId) : undefined;
  }

  const subNodes = nodes.filter((n) => n.parentId === activeNodeId);
  const currentFiles = activeNodeId ? files.filter((f) => f.parentId === activeNodeId) : [];

  const openFolderModal = () => {
    setFolderName('');
    setFolderDesc('');
    setShowFolderModal(true);
  };

  const openFileModal = () => {
    setFileTitle('');
    setFile(null);
    setShowFileModal(true);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: folderName, description: folderDesc, parentId: activeNodeId };
    run(() => createProgramNode(payload), () => setShowFolderModal(false));
  };

  const handleUploadFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNodeId) return;
    if (!file) {
      window.alert('يرجى اختيار ملف لرفعه.');
      return;
    }
    const formData = new FormData();
    formData.set('parentId', activeNodeId);
    formData.set('title', fileTitle);
    formData.set('file', file);
    run(() => uploadProgramFile(formData), () => setShowFileModal(false));
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>المستودع المعرفي</span>
            <span>/</span>
            <span className="text-teal-700 font-medium">البرامج والمشاريع الاستراتيجية</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            مستودع البرامج الاستراتيجية الشاملة
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
              مستودع معتمد
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            هيكلية مجلدات متعددة المستويات (Root & Subfolders) لملفات المشاريع ومؤشرات البرامج النوعية.
          </p>
        </div>

        {isCentral && (
          <div className="flex items-center gap-2">
            <button
              onClick={openFolderModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-teal-400" />
              <span>{activeNodeId ? 'إنشاء مجلد فرعي' : 'إنشاء برنامج رئيسي'}</span>
            </button>

            {activeNodeId && (
              <button
                onClick={openFileModal}
                className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>رفع ملف هنا</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
          <button
            onClick={() => setCurrentNodeId(null)}
            className={`font-bold transition-colors ${
              activeNodeId === null ? 'text-teal-700 underline' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            البرامج الرئيسية (Root)
          </button>

          {breadcrumbs.map((crumb, idx) => (
            <Fragment key={crumb.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-180 shrink-0" />
              <button
                onClick={() => setCurrentNodeId(crumb.id)}
                className={`font-medium transition-colors ${
                  idx === breadcrumbs.length - 1 ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {crumb.name}
              </button>
            </Fragment>
          ))}
        </div>

        {currentNode && (
          <button
            onClick={() => setCurrentNodeId(currentNode.parentId)}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded bg-slate-50 hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            <span>رجوع للمستوى السابق</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
            المجلدات والبرامج ({subNodes.length})
          </h4>

          {subNodes.length === 0 && currentFiles.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              هذا المجلد فارغ حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subNodes.map((node) => {
                const childFiles = files.filter((f) => f.parentId === node.id);
                const childNodes = nodes.filter((n) => n.parentId === node.id);

                return (
                  <div
                    key={node.id}
                    onClick={() => setCurrentNodeId(node.id)}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 group-hover:bg-teal-600 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:text-white transition-colors shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-teal-800 transition-colors truncate">
                          {node.name}
                        </h4>
                        {node.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{node.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{childNodes.length} مجلد فرعي</span>
                      <span>{childFiles.length} ملف</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {currentFiles.length > 0 && (
          <div className="pt-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
              الملفات والمستندات في هذا المجلد ({currentFiles.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentFiles.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h5 className="font-bold text-xs text-slate-900 leading-snug truncate">{item.name}</h5>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {formatFileSize(item.file.size)} • {formatDate(item.uploadedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <a
                      href={item.file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-teal-50 text-teal-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isCentral && showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-teal-400" />
                {activeNodeId ? 'إنشاء مجلد فرعي للبرنامج' : 'إنشاء برنامج استراتيجي رئيسي'}
              </h3>
              <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolderSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المجلد / البرنامج</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: برنامج ترصد العدوى المكتسبة (HAI Surveillance)"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف أو الهدف (اختياري)</label>
                <textarea
                  rows={3}
                  placeholder="وصف محاور البرنامج وأهدافه ومؤشراته..."
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  إنشاء المجلد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCentral && showFileModal && activeNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-400" />
                رفع ملف داخل مجلد: {currentNode?.name}
              </h3>
              <button onClick={() => setShowFileModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadFileSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عنوان الملف</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: النموذج الشهري لترصد العدوى"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

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
                  onClick={() => setShowFileModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold disabled:opacity-60"
                >
                  {isPending ? 'جاري الرفع...' : 'رفع وتأكيد الحفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
