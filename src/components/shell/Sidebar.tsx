'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
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
  ShieldCheck,
  Building,
} from 'lucide-react';
import type { SessionUser } from '@/lib/types';

interface SidebarProps {
  user: SessionUser;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

function NavLink({ item, active, onNavigate, danger = false }: { item: NavItem; active: boolean; onNavigate: () => void; danger?: boolean }) {
  const Icon = item.icon;
  const activeClass = danger
    ? 'bg-[#f1416c] text-white shadow-md shadow-[#f1416c]/20'
    : 'bg-[#1b84ff] text-white shadow-md shadow-[#1b84ff]/20';
  const idleClass = danger
    ? 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-[#f1416c]'
    : 'text-[#9899ac] hover:bg-[#2b2b40] hover:text-white';

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
        active ? activeClass : idleClass
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#5e6278]'}`} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({ user, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const isCentral = user.role === 'central';
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const close = () => setIsMobileOpen(false);

  const sections: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'الرئيسية والمتابعة',
      items: [
        { href: '/dashboard', label: 'الداشبورد والتقارير', icon: LayoutDashboard },
        { href: '/visits', label: 'الزيارات الرقابية', icon: ClipboardCheck },
        { href: '/trainings', label: 'التدريب والتعليم', icon: GraduationCap },
      ],
    },
    {
      title: 'المنشآت والأصول',
      items: [
        isCentral
          ? { href: '/hospitals', label: 'المستشفيات والمنسقين', icon: Building2 }
          : { href: '/hospital-profile', label: 'ملف المستشفى', icon: Building2 },
        { href: '/assets', label: 'الممارسون والأجهزة', icon: Users2 },
      ],
    },
    {
      title: 'المستودع والبرامج',
      items: [
        { href: '/policies', label: 'السياسات والنماذج', icon: FileText },
        { href: '/org-docs', label: 'الهيكل والوصف الوظيفي', icon: FolderKanban },
        { href: '/doc-center', label: 'مركز الوثائق العام', icon: FileArchive },
        { href: '/programs', label: 'البرامج الاستراتيجية', icon: Network },
      ],
    },
  ];

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden" onClick={close} />
      )}

      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-64 bg-[#1e1e2d] text-[#9899ac] flex flex-col transition-transform duration-300 ease-in-out border-l border-[#151521] ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        dir="rtl"
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#151521] bg-[#1e1e2d]">
          <div className="w-9 h-9 rounded-lg bg-[#1b84ff] flex items-center justify-center text-white shadow-md shadow-[#1b84ff]/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-[13px] text-white tracking-wide truncate">منصة مكافحة العدوى</h1>
            <p className="text-[10px] text-[#50cd89] font-semibold truncate uppercase">IPC Cluster Portal</p>
          </div>
        </div>

        <div className="p-3 m-4 rounded-xl bg-[#151521] border border-[#2b2b40] text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase font-bold text-[#5e6278]">النطاق الحالي</span>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                isCentral ? 'bg-[#7239ea]/10 text-[#7239ea]' : 'bg-[#50cd89]/10 text-[#50cd89]'
              }`}
            >
              {isCentral ? 'الإدارة المركزية' : 'منسق مستشفى'}
            </span>
          </div>
          <p className="text-white font-medium truncate text-[11px] flex items-center gap-1.5">
            {isCentral ? (
              <>
                <Building className="w-3.5 h-3.5 text-[#7239ea] shrink-0" />
                <span>كافة مستشفيات التجمع الصحي</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-[#50cd89] shrink-0" />
                <span className="truncate">{user.hospitalName}</span>
              </>
            )}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#5e6278]">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={close} />
                ))}
              </div>
            </div>
          ))}

          {isCentral && (
            <div>
              <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#5e6278]">
                التدقيق والأمان
              </div>
              <div className="space-y-1">
                <NavLink
                  item={{ href: '/audit', label: 'سجل الحركات (Audit)', icon: ShieldAlert }}
                  active={isActive('/audit')}
                  onNavigate={close}
                  danger
                />
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
