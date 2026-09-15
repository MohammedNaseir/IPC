'use client';

import { useState } from 'react';
import type { NotificationDTO, SessionUser } from '@/lib/types';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';

interface PortalShellProps {
  user: SessionUser;
  notifications: NotificationDTO[];
  children: React.ReactNode;
}

export function PortalShell({ user, notifications, children }: PortalShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)] font-sans antialiased selection:bg-[#0066cc] selection:text-white"
      dir="rtl"
    >
      <Sidebar user={user} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="lg:mr-64 flex flex-col min-h-screen transition-all">
        <Header
          user={user}
          notifications={notifications}
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-32">{children}</main>

        <footer className="h-12 border-t border-slate-200/80 bg-white px-6 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>منصة مكافحة العدوى الموحدة للتجمع الصحي</span>
            <span>•</span>
            <span className="text-[11px] text-teal-700 font-medium">النسخة الرسمية المعتمدة v1.0</span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span className="text-emerald-700 font-medium">المنظومة متصلة ومحدثة</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
