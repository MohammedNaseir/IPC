import React from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  GraduationCap,
  Building2,
  Users2,
  FileText,
  Network,
  FolderKanban,
  FileArchive,
  ShieldAlert,
  Database,
  ShieldCheck,
  Building,
  LogOut,
} from 'lucide-react';
import { UserRole } from '../types/ipc';

export type ActiveTab =
  | 'dashboard'
  | 'visits'
  | 'trainings'
  | 'hospitals'
  | 'assets'
  | 'policies'
  | 'orgDocs'
  | 'docCenter'
  | 'programs'
  | 'audit';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  currentHospitalName?: string;
  isNeonConnected: boolean;
  onOpenNeonModal: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isDevAdmin?: boolean;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  currentHospitalName,
  isNeonConnected,
  onOpenNeonModal,
  isMobileOpen,
  setIsMobileOpen,
  isDevAdmin = false,
  onLogout,
}) => {
  const isCentral = userRole === 'central' || isDevAdmin;

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Metronic Dark Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-64 bg-[#1e1e2d] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-l border-slate-800 ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        dir="rtl"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800/80 bg-[#1b1b28]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-white tracking-wide truncate">
              منصة مكافحة العدوى
            </h1>
            <p className="text-[11px] text-teal-400 font-medium truncate">
              IPC Cluster Portal
            </p>
          </div>
        </div>

        {/* Role & Context Card */}
        <div className="p-3.5 m-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">النطاق الحالي</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isCentral
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {isCentral ? 'الإدارة المركزية' : 'منسق مستشفى'}
            </span>
          </div>
          <p className="text-white font-medium truncate text-xs flex items-center gap-1.5">
            {isCentral ? (
              <>
                <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>كافة مستشفيات التجمع الصحي</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{currentHospitalName || 'مستشفى مخصص'}</span>
              </>
            )}
          </p>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Main Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              الرئيسية والمتابعة
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0" />
                <span>الداشبورد والتقارير</span>
              </button>

              <button
                onClick={() => handleNavClick('visits')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'visits'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <ClipboardCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span>وحدة الزيارات الرقابية</span>
              </button>

              <button
                onClick={() => handleNavClick('trainings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'trainings'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                <span>وحدة التدريب والتعليم</span>
              </button>
            </div>
          </div>

          {/* Hospitals & Assets */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              المنشآت والأصول
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('hospitals')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'hospitals'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{isCentral ? 'إدارة المستشفيات والمنسقين' : 'ملف المستشفى والمنسق'}</span>
                </div>
              </button>

              <button
                onClick={() => handleNavClick('assets')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'assets'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Users2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span>الممارسون والأجهزة</span>
              </button>
            </div>
          </div>

          {/* Knowledge & Repository */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              المستودع المعرفي والبرامج
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('policies')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'policies'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span>مكتبة السياسات والنماذج</span>
              </button>

              <button
                onClick={() => handleNavClick('orgDocs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'orgDocs'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Network className="w-4 h-4 text-slate-400 shrink-0" />
                <span>الهيكل والوصف الوظيفي</span>
              </button>

              <button
                onClick={() => handleNavClick('docCenter')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'docCenter'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <FileArchive className="w-4 h-4 text-slate-400 shrink-0" />
                <span>مركز الوثائق العام</span>
              </button>

              <button
                onClick={() => handleNavClick('programs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'programs'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <FolderKanban className="w-4 h-4 text-slate-400 shrink-0" />
                <span>البرامج الاستراتيجية</span>
              </button>
            </div>
          </div>

          {/* Audit & Compliance */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              التدقيق والأمان
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('audit')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'audit'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
                <span>سجل التدقيق الرقمي</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Logout Button */}
        {onLogout && (
          <div className="p-3 border-t border-slate-800/80 bg-[#161622]">
            <button
              onClick={() => {
                if (setIsMobileOpen) setIsMobileOpen(false);
                onLogout();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 text-rose-300 hover:text-rose-100 transition-colors text-right cursor-pointer"
              title="تسجيل الخروج من النظام"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold">تسجيل الخروج</span>
              </div>
              <span className="text-[10px] text-rose-400/80 font-medium">إنهاء الجلسة</span>
            </button>
          </div>
        )}

        {/* Sidebar Footer: Neon DB Status Button - STRICTLY DEV ADMIN ONLY */}
        {isDevAdmin && (
          <div className="p-3 border-t border-slate-800 bg-[#181824]">
            <button
              onClick={onOpenNeonModal}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-right"
              title="إعدادات قاعدة البيانات السحابية PostgreSQL (متاح بحساب dev admin فقط)"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Database className="w-4 h-4 text-teal-400" />
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                    isNeonConnected ? 'bg-emerald-500' : 'bg-amber-400'
                  }`} />
                </div>
                <div className="leading-tight">
                  <p className="text-[11px] font-bold text-white">Neon PostgreSQL (dev)</p>
                  <p className="text-[9px] text-slate-400">
                    {isNeonConnected ? 'متصل بالسحابة' : 'جاهز للربط'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-teal-400 font-medium">إعدادات</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
