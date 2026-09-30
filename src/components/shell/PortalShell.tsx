'use client';

import { useState, useSyncExternalStore } from 'react';
import type { NotificationDTO, SessionUser } from '@/lib/types';
import { Sidebar } from '@/components/shell/Sidebar';
import { Header } from '@/components/shell/Header';
import { getCollapsedServerSnapshot, getCollapsedSnapshot, setCollapsed, subscribeToCollapsed } from '@/components/shell/sidebarStore';

interface PortalShellProps {
  user: SessionUser;
  notifications: NotificationDTO[];
  children: React.ReactNode;
}

export function PortalShell({ user, notifications, children }: PortalShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Owned here, not inside Sidebar, because the content column's own margin (item 5, direction S1)
  // has to shrink in step with the rail or the reclaimed space is wasted as a dead gap.
  const collapsed = useSyncExternalStore(subscribeToCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot);
  const toggleCollapsed = () => setCollapsed(!collapsed);

  return (
    <div
      className="min-h-screen bg-surface text-ink font-sans antialiased"
      dir="rtl"
    >
      <Sidebar
        user={user}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />

      <div className={`flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out ${collapsed ? 'lg:mr-16' : 'lg:mr-64'}`}>
        <Header
          user={user}
          notifications={notifications}
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-32">{children}</main>

        <footer className="h-12 border-t border-line bg-surface px-6 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>منصة مكافحة العدوى الموحدة للتجمع الصحي</span>
            <span>•</span>
            <span className="text-[11px] text-navy-700 font-medium">النسخة الرسمية المعتمدة v1.0</span>
          </div>
          <div className="text-[11px] text-muted">
            <span className="text-muted font-medium">المنظومة متصلة ومحدثة</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
