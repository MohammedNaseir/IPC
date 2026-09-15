import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Menu,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Check,
  LogIn,
  LogOut,
  Building2,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { User, Hospital, Notification } from '../types/ipc';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  availableUsers: User[];
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (hospId: string | null) => void;
  notifications: Notification[];
  onMarkNotificationRead: (id: string) => void;
  isNeonConnected: boolean;
  onOpenNeonModal: () => void;
  onResetData: () => void;
  onToggleMobileSidebar: () => void;
  onLoginWithEmail?: (email: string) => { success: boolean; user?: User; message?: string };
  onLogout?: () => void;
  onOpenLoginModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  availableUsers,
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  notifications,
  onMarkNotificationRead,
  isNeonConnected,
  onOpenNeonModal,
  onResetData,
  onToggleMobileSidebar,
  onLoginWithEmail,
  onLogout,
  onOpenLoginModal,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loginEmailInput, setLoginEmailInput] = useState('');
  const [loginFeedback, setLoginFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isDevAdmin =
    currentUser.isDevAdmin ||
    currentUser.email.toLowerCase() === 'moha.naseir@gmail.com' ||
    currentUser.name.toLowerCase() === 'dev admin';

  const userHospital = hospitals.find((h) => h.id === currentUser.hospitalId);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmailLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmailInput.trim()) return;
    if (onLoginWithEmail) {
      const res = onLoginWithEmail(loginEmailInput.trim());
      if (res.success) {
        setLoginFeedback({
          text: res.user?.isDevAdmin
            ? 'تم تسجيل الدخول بنجاح بحساب المشرف المطور (dev admin)!'
            : `تم تسجيل الدخول بنجاح: ${res.user?.name}`,
          isError: false,
        });
        setTimeout(() => {
          setShowUserMenu(false);
          setLoginFeedback(null);
          setLoginEmailInput('');
        }, 1200);
      } else {
        setLoginFeedback({
          text: res.message || 'البريد الإلكتروني غير مسجل بالنظام.',
          isError: true,
        });
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 shadow-2xs flex items-center justify-between px-4 lg:px-8" dir="rtl">
      {/* Left side (in RTL: right side of the screen) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm md:text-base tracking-tight">
              منصة إدارة مكافحة العدوى والتعقيم
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              المنصة الرسمية المعتمدة
            </span>
            {isDevAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-600" />
                dev admin
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            إدارة الحوكمة الرقابية ومؤشرات الامتثال وتأهيل منسقي المنشآت الصحية
          </p>
        </div>
      </div>

      {/* Center/Right controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hospital Selector for Central role or Dev Admin */}
        {(currentUser.role === 'central' || isDevAdmin) ? (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-500 text-[11px]">فلترة المنشأة:</span>
            <select
              value={selectedHospitalId || ''}
              onChange={(e) => onSelectHospital(e.target.value ? e.target.value : null)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="">كافة المستشفيات (عرض شامل)</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          /* Strictly isolated coordinator badge: Locked to their hospital */
          userHospital && (
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>المنشأة التابع لها: {userHospital.name}</span>
            </div>
          )
        )}

        {/* Database Indicator Button - STRICTLY DEV ADMIN ONLY */}
        {isDevAdmin && (
          <button
            onClick={onOpenNeonModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isNeonConnected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="إعدادات قاعدة البيانات السحابية PostgreSQL (متاح بحساب dev admin فقط)"
          >
            <Database className={`w-3.5 h-3.5 ${isNeonConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline font-sans text-[11px]">
              {isNeonConnected ? 'قاعدة البيانات (dev): متصلة' : 'قاعدة البيانات (dev)'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isNeonConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>
        )}

        {/* Quick Login with Password Button */}
        {onOpenLoginModal && (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 transition-colors text-xs font-bold"
            title="تسجيل الدخول بكلمة المرور / تبديل الحساب"
          >
            <KeyRound className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">دخول بكلمة المرور</span>
          </button>
        )}

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            title="الإشعارات والتنبيهات"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden text-right">
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-xs">مركز التنبيهات والإشعارات الرسمية</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-teal-300 font-mono">
                  {unreadCount} جديد
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    لا توجد تنبيهات جديدة حالياً
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => onMarkNotificationRead(notif.id)}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        notif.isRead ? 'opacity-70 bg-white' : 'bg-teal-50/40 font-medium'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="shrink-0 mt-0.5">
                          {notif.type === 'training_overdue' ? (
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          ) : notif.type === 'visit_upcoming' ? (
                            <Clock className="w-4 h-4 text-amber-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-teal-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-800 text-[11px] leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="تسجيل الخروج من النظام"
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        )}

        {/* User Account Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors text-right"
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                isDevAdmin
                  ? 'bg-amber-600'
                  : currentUser.role === 'central'
                  ? 'bg-indigo-600'
                  : 'bg-emerald-600'
              }`}
            >
              {isDevAdmin ? 'DA' : currentUser.role === 'central' ? 'إ' : 'م'}
            </div>
            <div className="hidden sm:block text-right leading-none">
              <span className="block text-xs font-bold text-slate-800 truncate max-w-[130px]">
                {currentUser.name.split(' ')[0]} {currentUser.name.split(' ')[1] || ''}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {isDevAdmin
                  ? 'المشرف المطور'
                  : currentUser.role === 'central'
                  ? 'الإدارة المركزية'
                  : userHospital?.name || 'منسق مستشفى'}
              </span>
            </div>
          </button>

          {/* User Account Menu */}
          {showUserMenu && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-right">
              {/* Active Profile Info */}
              <div
                className={`p-4 border-b ${
                  isDevAdmin
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">الحساب النشط</span>
                  {isDevAdmin ? (
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">
                      dev admin
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        currentUser.role === 'central'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {currentUser.role === 'central' ? 'إدارة مركزية' : 'منسق مستشفى'}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-900 mt-1.5">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 font-mono" dir="ltr">{currentUser.email}</p>
                {userHospital && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{userHospital.name}</span>
                  </p>
                )}

                {/* Primary Logout Button */}
                {onLogout && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="mt-3.5 w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>تسجيل الخروج من النظام</span>
                  </button>
                )}
              </div>

              {/* Reset to clean/defaults - STRICTLY DEV ADMIN ONLY */}
              {isDevAdmin && (
                <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (window.confirm('هل تود استعادة الإعدادات والبيانات الأولية للتطبيق؟')) {
                        onResetData();
                        setShowUserMenu(false);
                      }
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-rose-600 transition-colors font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>إعادة ضبط البيانات (dev)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
