'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, CheckCircle, AlertCircle, Clock, ShieldCheck, LogOut, Building2 } from 'lucide-react';
import type { NotificationDTO, SessionUser } from '@/lib/types';
import { logout } from '@/server/actions/auth';
import { markNotificationRead } from '@/server/actions/notifications';
import { useActionRunner } from '@/components/hooks/useActionRunner';

interface HeaderProps {
  user: SessionUser;
  notifications: NotificationDTO[];
  onToggleMobileSidebar: () => void;
}

export function Header({ user, notifications, onToggleMobileSidebar }: HeaderProps) {
  const router = useRouter();
  const { run } = useActionRunner();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isCentral = user.role === 'central';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif: NotificationDTO) => {
    if (!notif.isRead) run(() => markNotificationRead(notif.id));
    if (notif.link) {
      setShowNotifications(false);
      router.push(notif.link);
    }
  };

  const logoutButtonClass =
    'flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold transition-all shadow-2xs cursor-pointer';

  return (
    <header
      className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 shadow-2xs flex items-center justify-between px-4 lg:px-8"
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden"
          aria-label="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm md:text-base tracking-tight">إدارة مكافحة العدوى</span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              المنصة الرسمية المعتمدة
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            إدارة الحوكمة الرقابية ومؤشرات الامتثال وتأهيل منسقي المنشآت الصحية
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {!isCentral && user.hospitalName && (
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>المنشأة التابع لها: {user.hospitalName}</span>
          </div>
        )}

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
                  <div className="p-6 text-center text-slate-400 text-xs">لا توجد تنبيهات جديدة حالياً</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
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
                          <p className="text-slate-800 text-[11px] leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleString('ar-SA', {
                              day: '2-digit',
                              month: '2-digit',
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

        <form action={logout}>
          <button type="submit" title="تسجيل الخروج من النظام" className={logoutButtonClass}>
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">تسجيل الخروج</span>
          </button>
        </form>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors text-right"
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                isCentral ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {isCentral ? 'إ' : 'م'}
            </div>
            <div className="hidden sm:block text-right leading-none">
              <span className="block text-xs font-bold text-slate-800 truncate max-w-[130px]">
                {user.name.split(' ').slice(0, 2).join(' ')}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {isCentral ? 'الإدارة المركزية' : user.hospitalName ?? 'منسق مستشفى'}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-right">
              <div className="p-4 border-b bg-slate-50 border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">الحساب النشط</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCentral ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isCentral ? 'إدارة مركزية' : 'منسق مستشفى'}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 mt-1.5">{user.name}</p>
                <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                  {user.email}
                </p>
                {user.hospitalName && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{user.hospitalName}</span>
                  </p>
                )}

                <form action={logout}>
                  <button
                    type="submit"
                    className="mt-3.5 w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>تسجيل الخروج من النظام</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
