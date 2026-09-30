'use client';

import Image from 'next/image';
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
  Building,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import type { SessionUser } from '@/lib/types';

interface SidebarProps {
  user: SessionUser;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  /** Owned by PortalShell, not here: the content column's margin has to shrink in step with the rail. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
function NavLink({
  item,
  active,
  onNavigate,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      // The visible label disappears at the collapsed rail width; the accessible name must not.
      aria-label={collapsed ? item.label : undefined}
      className={`group/link relative w-full flex items-center gap-3 rounded-lg text-xs transition-colors py-2.5 ${
        collapsed ? 'lg:justify-center lg:px-2.5' : 'px-3'
      } px-3 ${
        active
          ? 'bg-navy-100 text-navy-900 font-bold'
          : 'text-navy-700 font-medium hover:bg-navy-50 hover:text-navy-900'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-navy-800' : 'text-muted'}`} aria-hidden="true" />
      <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
      {/* Icon-only navigation is a known first-timer failure (the design critique flagged it
          explicitly), so a real hover/focus tooltip stands in for the hidden label -- not just the
          slow, keyboard-inaccessible native `title` attribute. */}
      {collapsed && (
        <span
          role="tooltip"
          className="hidden lg:block pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2 whitespace-nowrap rounded-md bg-navy-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/link:opacity-100 group-focus-visible/link:opacity-100 z-50"
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ user, isMobileOpen, setIsMobileOpen, collapsed, onToggleCollapsed }: SidebarProps) {
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
        { href: '/programs', label: 'البرامج والاستراتيجيات', icon: Network },
      ],
    },
  ];

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-xs lg:hidden" onClick={close} />
      )}

      {/*
        Paper, not a slab, collapsible to a ~64px icon rail from the lg breakpoint up (item 5,
        direction S1) -- the only one of the three redesign directions that reclaims real space for
        the wide tables rather than just looking different. The mobile drawer always shows the full
        width and content regardless of this desktop preference; collapsing an icon rail inside an
        already-explicit mobile overlay would remove information a touch user still needs.
      */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 bg-raised text-navy-700 flex flex-col transition-[translate,width] duration-300 ease-in-out border-l border-line w-64 ${
          collapsed ? 'lg:w-16' : 'lg:w-64'
        } ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
        dir="rtl"
      >
        <div className={`h-16 flex items-center border-b border-line shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : 'px-6'} px-6 gap-3`}>
          {/*
            The organisation's own logo (item 8), on a white plate since it is opaque with no alpha
            (FR-047). Landed as its own isolated change before this redesign so it could be reverted
            independently (FR-046); this redesign only adds the collapsed-width layout around it.
          */}
          <div className="w-9 h-9 rounded-lg bg-white border border-line flex items-center justify-center shrink-0 overflow-hidden">
            <Image src="/ipc-hail-logo.jpg" alt="شعار إدارة مكافحة العدوى" width={36} height={36} className="w-8 h-8 object-contain" />
          </div>
          <div className={`overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="font-bold text-[13px] text-ink tracking-wide truncate">منصة مكافحة العدوى</h1>
            <p className="text-[10px] text-muted font-semibold truncate uppercase">IPC Cluster Portal</p>
          </div>
        </div>

        {/* Collapse toggle: desktop only, a mobile viewport never needs it since the drawer is
            binary (open/closed), not resizable. */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-pressed={collapsed}
          title={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
          className={`hidden lg:flex items-center gap-2 mx-4 mt-3 px-2.5 py-2 rounded-lg border border-line text-muted hover:text-navy-800 hover:bg-navy-50 transition-colors ${
            collapsed ? 'lg:justify-center lg:mx-2' : 'justify-start'
          }`}
        >
          {collapsed ? <PanelRightOpen className="w-4 h-4 shrink-0" aria-hidden="true" /> : <PanelRightClose className="w-4 h-4 shrink-0" aria-hidden="true" />}
          <span className={`text-[11px] font-medium ${collapsed ? 'lg:hidden' : ''}`}>طي القائمة</span>
          <span className="sr-only">{collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}</span>
        </button>

        <div className={`p-3 rounded-xl bg-surface border border-line text-xs ${collapsed ? 'lg:mx-2 lg:my-3' : 'm-4'} m-4`}>
          <div className={`flex items-center justify-between mb-2 ${collapsed ? 'lg:justify-center lg:mb-0' : ''}`}>
            <span className={`text-[9px] uppercase font-bold text-muted ${collapsed ? 'lg:hidden' : ''}`}>النطاق الحالي</span>
            {/* Which role you are holding is wayfinding, not status: one hue, two weights. Collapsed
                to a single glyph at the rail width rather than dropped -- the scope must stay legible
                even in the narrowest state (FR-032). */}
            <span
              title={isCentral ? 'الإدارة المركزية' : 'منسق مستشفى'}
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${collapsed ? 'lg:px-1.5' : ''} ${
                isCentral ? 'bg-navy-800 text-white' : 'bg-navy-100 text-navy-900'
              }`}
            >
              <span className={collapsed ? 'lg:hidden' : ''}>{isCentral ? 'الإدارة المركزية' : 'منسق مستشفى'}</span>
              <span className={`hidden ${collapsed ? 'lg:inline' : ''}`}>{isCentral ? 'مر' : 'مس'}</span>
            </span>
          </div>
          <p className={`text-ink font-medium truncate text-[11px] flex items-center gap-1.5 ${collapsed ? 'lg:hidden' : ''}`}>
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

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className={`px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-muted ${collapsed ? 'lg:hidden' : ''}`}>
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={close} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}

          {isCentral && (
            <div>
              <div className={`px-2 mb-3 text-[10px] font-bold uppercase tracking-wider text-muted ${collapsed ? 'lg:hidden' : ''}`}>
                التدقيق والأمان
              </div>
              <div className="space-y-1">
                <NavLink
                  item={{ href: '/audit', label: 'سجل الحركات (Audit)', icon: ShieldAlert }}
                  active={isActive('/audit')}
                  onNavigate={close}
                  collapsed={collapsed}
                />
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
