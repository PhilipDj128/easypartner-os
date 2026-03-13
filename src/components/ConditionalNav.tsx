'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeSolid,
  UsersIcon as UsersSolid,
  CurrencyDollarIcon as CurrencySolid,
  DocumentTextIcon as DocumentSolid,
  GlobeAltIcon as GlobeSolid,
  ChartBarIcon as ChartSolid,
  MagnifyingGlassIcon as SearchSolid,
} from '@heroicons/react/24/solid';

const navLinks = [
  { href: '/', label: 'Dashboard', Icon: HomeIcon, IconActive: HomeSolid },
  { href: '/customers', label: 'Kunder', Icon: UsersIcon, IconActive: UsersSolid },
  { href: '/economy', label: 'Ekonomi', Icon: CurrencyDollarIcon, IconActive: CurrencySolid },
  { href: '/quotes', label: 'Offerter', Icon: DocumentTextIcon, IconActive: DocumentSolid },
  { href: '/domains', label: 'Domäner', Icon: GlobeAltIcon, IconActive: GlobeSolid },
  { href: '/seo', label: 'SEO', Icon: ChartBarIcon, IconActive: ChartSolid },
  { href: '/prospektering', label: 'Prospektering', Icon: MagnifyingGlassIcon, IconActive: SearchSolid },
];

export function ConditionalNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/client')) return null;

  return (
    <>
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-white/[0.08] bg-[#111827] lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/[0.08] px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b82f6] shadow-[0_0_20px_rgba(59,130,246,0.4)]">
          <span className="font-heading text-sm font-bold text-white">EP</span>
        </div>
        <span className="font-heading text-lg font-semibold text-white">EasyPartner OS</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-4">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
          const Icon = isActive ? link.IconActive : link.Icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150 ease-in-out ${
                isActive
                  ? 'bg-[#3b82f6]/20 text-[#3b82f6]'
                  : 'text-[#94a3b8] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-white/[0.08] bg-[#111827] px-4 py-3 lg:hidden">
      <Link href="/" className="font-heading text-lg font-semibold text-white">EasyPartner OS</Link>
      <div className="flex gap-1 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-[#94a3b8]'}`}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
