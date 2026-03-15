'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  if (pathname.startsWith('/client')) {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
