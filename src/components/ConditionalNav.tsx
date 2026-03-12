'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/customers', label: 'Kunder' },
  { href: '/economy', label: 'Ekonomi' },
  { href: '/quotes', label: 'Offerter' },
  { href: '/domains', label: 'Domäner' },
  { href: '/seo', label: 'SEO' },
  { href: '/prospektering', label: 'Prospektering' },
];

export function ConditionalNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/client')) return null;
  return (
    <nav className="border-b border-sand-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-serif text-xl font-semibold text-brand-900">
          EasyPartner OS
        </Link>
        <div className="flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-brand-600 hover:text-brand-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
