'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Search,
  Globe,
  BarChart3,
  Wallet,
  Bell,
  ChevronRight,
  Search as SearchIcon,
  Target,
  ClipboardCheck,
} from 'lucide-react';
import { ChatNavItem } from './ChatNavItem';
import { ChatNotificationProvider } from './ChatNotificationProvider';

const NAV_GROUPS = [
  {
    label: 'Dashboards',
    items: [
      { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
      { href: '/chat', label: 'Chatt', Icon: null },
    ],
  },
  {
    label: 'Försäljning',
    items: [
      { href: '/crm', label: 'CRM', Icon: Target },
      { href: '/customers', label: 'Kunder', Icon: Users },
      { href: '/quotes', label: 'Offerter', Icon: FileText },
      { href: '/prospektering', label: 'Prospektering', Icon: Search },
    ],
  },
  {
    label: 'Webb & SEO',
    items: [
      { href: '/domains', label: 'Domäner', Icon: Globe },
      { href: '/seo', label: 'SEO', Icon: BarChart3 },
      { href: '/audit', label: 'SEO Audit', Icon: ClipboardCheck },
    ],
  },
  {
    label: 'Ekonomi',
    items: [{ href: '/economy', label: 'Ekonomi', Icon: Wallet }],
  },
];

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/chat': 'Chatt',
  '/crm': 'CRM',
  '/customers': 'Kunder',
  '/economy': 'Ekonomi',
  '/quotes': 'Offerter',
  '/domains': 'Domäner',
  '/seo': 'SEO',
  '/audit': 'SEO Audit',
  '/prospektering': 'Prospektering',
};

function getPageName(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  for (const [path, name] of Object.entries(PAGE_NAMES)) {
    if (path !== '/' && pathname.startsWith(path)) return name;
  }
  return pathname.slice(1) || 'Dashboard';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  return (
    <>
      <ChatNotificationProvider />
    <div
      className="min-h-screen"
      style={{
        backgroundImage: [
          'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, #0a0a0a 80%)',
        ].join(', '),
        backgroundSize: '24px 24px, 100% 100%',
        backgroundPosition: '0 0, 0 0',
      }}
    >
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r lg:flex"
        style={{
          background: 'var(--sidebar)',
          borderColor: 'var(--sidebar-border)',
        }}
      >
        <div className="flex h-16 items-center gap-3 border-b px-5" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-black text-white font-semibold">
            <span className="text-sm">EP</span>
          </div>
          <div>
            <p className="font-heading text-sm font-semibold text-white" style={{ fontWeight: 600 }}>
              EasyPartner
            </p>
            <p className="text-xs text-zinc-500">Admin Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="mb-2 px-5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                {group.label}
              </p>
              <ul className="space-y-0.5 px-3">
                {group.items.map((item) => {
                  if (item.href === '/chat') return <ChatNavItem key={item.href} />;
                  const isActive =
                    pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#1c1c1c] text-white'
                            : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {item.Icon && <item.Icon className="h-4 w-4 shrink-0" />}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t p-4" style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
            <Bell className="h-4 w-4 shrink-0 text-violet-400" />
            <span className="text-xs text-zinc-300">Notifikationer</span>
          </div>
          <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5">
            <span className="text-sm text-zinc-300">Användare</span>
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b px-4 lg:hidden" style={{ background: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}>
        <Link href="/" className="font-heading text-sm font-semibold text-white">EasyPartner</Link>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${isActive ? 'bg-[#1c1c1c] text-white' : 'text-zinc-400'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pt-14 lg:pt-0 lg:pl-64">
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-6"
          style={{ background: 'var(--background)', borderColor: 'var(--border)' }}
        >
          <nav className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/" className="hover:text-white">
              EasyPartner
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">{getPageName(pathname)}</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div
              className="flex h-9 w-64 items-center gap-2 rounded-lg border px-3"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border)' }}
            >
              <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                type="search"
                placeholder="Sök..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}
            >
              <Bell className="h-4 w-4 text-zinc-400" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="h-6 w-6 rounded-full bg-zinc-600" />
            </button>
          </div>
        </header>

        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
    </>
  );
}
