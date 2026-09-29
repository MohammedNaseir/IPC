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

/*
  Navigation is wayfinding, not status, so it carries exactly one colour: the institutional navy.
  There is no `danger` variant any more. The audit log used to render in the source template's
  destructive pink, which painted a read-only, append-only evidence trail as a hazard.
*/
function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${
        active
          ? 'bg-navy-100 text-navy-900 font-bold'
          : 'text-navy-700 font-medium hover:bg-navy-50 hover:text-navy-900'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-navy-800' : 'text-muted'}`} />
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
        <div className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-xs lg:hidden" onClick={close} />
      )}

      {/*
        Paper, not a slab. The chrome used to be a dark admin-template panel whose own palette carried
        four unrelated accents; it now shares the content's surface and is separated by a single rule,
        so the record stays the darkest thing on screen.
      */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-64 bg-raised text-navy-700 flex flex-col transition-transform duration-300 ease-in-out border-l border-line ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        dir="rtl"
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-line">
          <div className="w-9 h-9 rounded-lg bg-navy-800 flex items-center justify-center text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-[13px] text-ink tracking-wide truncate">منصة مكافحة العدوى</h1>
            <p className="text-[10px] text-muted font-semibold truncate uppercase">IPC Cluster Portal</p>
          </div>
        </div>

        <div className="p-3 m-4 rounded-xl bg-surface border border-line text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase font-bold text-muted">النطاق الحالي</span>
            {/* Which role you are holding is wayfinding, not status: one hue, two weights. */}
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                isCentral ? 'bg-navy-800 text-white' : 'bg-navy-100 text-navy-900'
              }`}
            >
              {isCentral ? 'الإدارة المركزية' : 'منسق مستشفى'}
            </span>
          </div>
          <p className="text-ink font-medium truncate text-[11px] flex items-center gap-1.5">
            {isCentral ? (
              <>
                <Building className="w-3.5 h-3.5 text-navy-700 shrink-0" />
                <span>كافة مستشفيات التجمع الصحي</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-navy-700 shrink-0" />
                <span className="truncate">{user.hospitalName}</span>
              </>
            )}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-muted">
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
              <div className="px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                التدقيق والأمان
              </div>
              <div className="space-y-1">
                <NavLink
                  item={{ href: '/audit', label: 'سجل الحركات (Audit)', icon: ShieldAlert }}
                  active={isActive('/audit')}
                  onNavigate={close}
                />
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
