'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

export function ChatNavItem() {
  const pathname = usePathname() ?? '';
  const [unread, setUnread] = useState(0);
  const isActive = pathname === '/chat' || pathname.startsWith('/chat');

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = () => {
      fetch('/api/chat/unread')
        .then((res) => res.json())
        .then((data) => { if (!cancelled) setUnread(Number(data?.total ?? 0)); })
        .catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <li>
      <Link
        href="/chat"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-[#1c1c1c] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        Chatt
        {unread > 0 && (
          <span className="ml-auto rounded-full bg-violet-500 px-1.5 py-0.5 text-xs font-medium text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>
    </li>
  );
}
