import React, { useState } from 'react';
import {
  FolderKanban,
  FolderPlus,
  Folder,
  FileText,
  Upload,
  Download,
  ChevronRight,
  Plus,
  ArrowLeft,
  X,
  Sparkles,
} from 'lucide-react';
import { ProgramFolder, ProgramFile, User } from '../types/ipc';

interface ProgramsViewProps {
  currentUser: User;
  folders: ProgramFolder[];
  files: ProgramFile[];
  onCreateFolder: (data: { name: string; parentId: string | null; description?: string }) => void;
  onUploadFile: (data: { folderId: string; title: string; fileUrl: string; fileSize?: string }) => void;
}

export const ProgramsView: React.FC<ProgramsViewProps> = ({
  currentUser,
  folders,
  files,
  onCreateFolder,
  onUploadFile,
}) => {
  const isCentral = currentUser.role === 'central' || currentUser.isDevAdmin;

  // Current navigation level (null = root programs)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);

  // Form states
  const [folderName, setFolderName] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [fileTitle, setFileTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('2.4 MB');

  // Breadcrumbs calculation
  const getBreadcrumbs = () => {
    const crumbs: ProgramFolder[] = [];
    let curr = folders.find((f) => f.id === currentFolderId);
    while (curr) {
      crumbs.unshift(curr);
      curr = folders.find((f) => f.id === curr?.parentId);
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const currentFolder = folders.find((f) => f.id === currentFolderId);

  // Items in the current level
  const subFolders = folders.filter((f) => f.parentId === currentFolderId);
  const currentFiles = files.filter((f) => f.folderId === currentFolderId);

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    onCreateFolder({
      name: folderName.trim(),
      parentId: currentFolderId,
      description: folderDesc.trim() || undefined,
    });
    setShowFolderModal(false);
    setFolderName('');
    setFolderDesc('');
  };

  const handleUploadFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileTitle.trim() || !currentFolderId) return;
    onUploadFile({
      folderId: currentFolderId,
      title: fileTitle.trim(),
      fileUrl: fileUrl.trim() || '/programs/program-document.pdf',
      fileSize: fileSize.trim() || '2.4 MB',
    });
    setShowFileModal(false);
    setFileTitle('');
    setFileUrl('');
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in" dir="rtl">
      {/* Top Banner */}
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

        {/* Buttons */}
        {isCentral && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <FolderPlus className="w-4 h-4 text-teal-400" />
              <span>{currentFolderId ? 'إنشاء مجلد فرعي' : 'إنشاء برنامج رئيسي'}</span>
            </button>

            {currentFolderId && (
              <button
                onClick={() => setShowFileModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>رفع ملف هنا</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`font-bold transition-colors ${
              currentFolderId === null
                ? 'text-teal-700 underline'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            البرامج الرئيسية (Root)
          </button>

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-180 shrink-0" />
              <button
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`font-medium transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? 'text-teal-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {currentFolderId && (
          <button
            onClick={() => {
              const parent = folders.find((f) => f.id === currentFolderId)?.parentId;
              setCurrentFolderId(parent || null);
            }}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-teal-700 font-medium px-2 py-1 rounded bg-slate-50 hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            <span>رجوع للمستوى السابق</span>
          </button>
        )}
      </div>

      {/* Explorer Content */}
      <div className="space-y-4">
        {/* Sub-Folders Section */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
            المجلدات والبرامج ({subFolders.length})
          </h4>

          {subFolders.length === 0 && currentFiles.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              هذا المجلد فارغ حالياً
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subFolders.map((folder) => {
                const childFiles = files.filter((f) => f.folderId === folder.id);
                const childFolders = folders.filter((f) => f.parentId === folder.id);

                return (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 group-hover:bg-teal-600 border border-teal-100 flex items-center justify-center text-teal-600 group-hover:text-white transition-colors shrink-0">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-teal-800 transition-colors truncate">
                          {folder.name}
                        </h4>
                        {folder.description && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                            {folder.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{childFolders.length} مجلد فرعي</span>
                      <span>{childFiles.length} ملف</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Files Section (FR-33) */}
        {currentFolderId && currentFiles.length > 0 && (
          <div className="pt-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
              الملفات والمستندات في هذا المجلد ({currentFiles.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h5 className="font-bold text-xs text-slate-900 leading-snug truncate">
                        {file.title}
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {file.fileSize || '2.0 MB'} • {new Date(file.uploadedAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <a
                      href={file.fileUrl}
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

      {/* Modal: Create Folder (FR-31, FR-32) */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-teal-400" />
                {currentFolderId ? 'إنشاء مجلد فرعي للبرنامج' : 'إنشاء برنامج استراتيجي رئيسي'}
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
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  إنشاء المجلد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload File (FR-33) */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-teal-400" />
                رفع ملف داخل مجلد: {currentFolder?.name}
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
                  placeholder="مثال: النموذج_الشهري_لترصد_العدوى_2026.pdf"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رابط أو مسار الملف</label>
                <input
                  type="text"
                  placeholder="/programs/files/surveillance.pdf"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">حجم الملف</label>
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
                  onClick={() => setShowFileModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  رفع وتأكيد الحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
