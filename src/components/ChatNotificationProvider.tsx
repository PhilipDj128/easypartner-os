'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ChatNotificationProvider() {
  const pathname = usePathname() ?? '';
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const channelIdsRef = useRef<Set<string>>(new Set());
  const notifiedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const showNotification = (title: string, body: string) => {
      if (pathnameRef.current === '/chat') return;
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch {
          // ignore
        }
      } else if (Notification.permission === 'default' && !notifiedRef.current) {
        notifiedRef.current = true;
        Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification(title, { body });
        });
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) return;

      supabase.from('chat_members').select('channel_id').eq('user_id', user.id).then(({ data }) => {
        (data ?? []).forEach((r) => channelIdsRef.current.add(r.channel_id));
      });

      channel = supabase
        .channel('chat-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
          const row = payload.new as { receiver_id: string; sender_id: string; content?: string };
          if (row.receiver_id === user.id) showNotification('Nytt direktmeddelande', (row.content ?? '').slice(0, 80) || 'Nytt meddelande');
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
          const row = payload.new as { channel_id: string; content?: string };
          if (channelIdsRef.current.has(row.channel_id)) showNotification('Nytt kanalmeddelande', (row.content ?? '').slice(0, 80) || 'Nytt meddelande');
        })
        .subscribe();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [pathname]);

  return null;
}
