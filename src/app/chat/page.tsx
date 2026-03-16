'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MessageCircle,
  Plus,
  Hash,
  Send,
  Users,
  Info,
  Loader2,
} from 'lucide-react';

type Profile = { id: string; email: string | null; full_name: string | null };
type Channel = { id: string; name: string; description: string | null; type: string; created_by: string | null };
type ChannelWithMeta = Channel & { unread?: number; member_count?: number };
type ChatMessage = {
  id: string;
  channel_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender?: Profile | null;
};
type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: Profile | null;
};

const FIVE_MIN_MS = 5 * 60 * 1000;
function shouldGroup(prev: { sender_id: string | null; created_at: string } | null, curr: { sender_id: string | null; created_at: string }) {
  if (!prev) return false;
  if (prev.sender_id !== curr.sender_id) return false;
  return new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime() < FIVE_MIN_MS;
}

function getInitials(p: Profile | null | undefined) {
  if (!p) return '?';
  if (p.full_name?.trim()) {
    const parts = p.full_name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return p.full_name.slice(0, 2).toUpperCase();
  }
  if (p.email) return p.email.slice(0, 2).toUpperCase();
  return '?';
}

export default function ChatPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [channels, setChannels] = useState<ChannelWithMeta[]>([]);
  const [dmPartners, setDmPartners] = useState<{ id: string; profile: Profile }[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [view, setView] = useState<'channel' | 'dm' | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [dmUserId, setDmUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [inviteSearch, setInviteSearch] = useState('');
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedInvites, setSelectedInvites] = useState<string[]>([]);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [dmPickerOpen, setDmPickerOpen] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      if (!u) setLoading(false);
    });
  }, [supabase]);

  useEffect(() => {
    if (!user || !supabase) return;
    (async () => {
      await fetch('/api/chat/setup', { method: 'POST' });
    })();
  }, [user, supabase]);

  useEffect(() => {
    if (!user || !supabase) return;
    const load = async () => {
      const { data: memberRows } = await supabase.from('chat_members').select('channel_id').eq('user_id', user.id);
      const ids = (memberRows ?? []).map((r) => r.channel_id);
      if (!ids.length) {
        setChannels([]);
        setLoading(false);
        return;
      }
      const { data: chs } = await supabase.from('chat_channels').select('*').in('id', ids).order('name');
      const { data: reads } = await supabase.from('channel_reads').select('channel_id, last_read_at').eq('user_id', user.id);
      const readMap = new Map((reads ?? []).map((r) => [r.channel_id, r.last_read_at]));
      const { data: msgCounts } = await supabase.from('chat_messages').select('channel_id, created_at').eq('is_deleted', false);
      const unreadByChannel: Record<string, number> = {};
      (msgCounts ?? []).forEach((m) => {
        const lastRead = readMap.get(m.channel_id) ?? '1970-01-01';
        if (new Date(m.created_at) > new Date(lastRead)) unreadByChannel[m.channel_id] = (unreadByChannel[m.channel_id] ?? 0) + 1;
      });
      const { data: memberCounts } = await supabase.from('chat_members').select('channel_id');
      const countByCh: Record<string, number> = {};
      (memberCounts ?? []).forEach((r) => { countByCh[r.channel_id] = (countByCh[r.channel_id] ?? 0) + 1; });
      setChannels((chs ?? []).map((c) => ({
        ...c,
        unread: unreadByChannel[c.id] ?? 0,
        member_count: countByCh[c.id] ?? 0,
      })));
      setLoading(false);
    };
    load();
  }, [user, supabase]);

  useEffect(() => {
    if (!user || !supabase) return;
    const loadDms = async () => {
      const { data: sent } = await supabase.from('direct_messages').select('receiver_id').eq('sender_id', user.id);
      const { data: received } = await supabase.from('direct_messages').select('sender_id').eq('receiver_id', user.id);
      const otherIds = new Set<string>();
      (sent ?? []).forEach((r) => otherIds.add(r.receiver_id));
      (received ?? []).forEach((r) => otherIds.add(r.sender_id));
      if (otherIds.size === 0) {
        setDmPartners([]);
        return;
      }
      const { data: profs } = await supabase.from('profiles').select('id, email, full_name').in('id', Array.from(otherIds));
      const profMap: Record<string, Profile> = {};
      (profs ?? []).forEach((p) => { profMap[p.id] = p; });
      setProfiles((prev) => ({ ...prev, ...profMap }));
      setDmPartners(Array.from(otherIds).map((id) => ({ id, profile: profMap[id] ?? { id, email: null, full_name: null } })));
    };
    loadDms();
  }, [user, supabase]);

  useEffect(() => {
    if (!channelId || !supabase) return;
    const load = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('id, channel_id, sender_id, content, created_at')
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });
      const list = (data ?? []) as ChatMessage[];
      const senderIds = [...new Set(list.map((m) => m.sender_id).filter(Boolean))] as string[];
      if (senderIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, email, full_name').in('id', senderIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p) => { map[p.id] = p; });
        setProfiles((prev) => ({ ...prev, ...map }));
        setMessages(list.map((m) => ({ ...m, sender: m.sender_id ? map[m.sender_id] : null })));
      } else setMessages(list);
      scrollToBottom();
    };
    load();
    const channel = supabase.channel(`chat:${channelId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, supabase, scrollToBottom]);

  useEffect(() => {
    if (!user || !dmUserId || !supabase) return;
    const load = async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, read_at, created_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${dmUserId}),and(sender_id.eq.${dmUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      const list = (data ?? []) as DirectMessage[];
      const senderIds = [...new Set(list.map((m) => m.sender_id))];
      if (senderIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, email, full_name').in('id', senderIds);
        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p) => { map[p.id] = p; });
        setProfiles((prev) => ({ ...prev, ...map }));
        setDmMessages(list.map((m) => ({ ...m, sender: map[m.sender_id] ?? null })));
      } else setDmMessages(list);
      await supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('receiver_id', user.id).eq('sender_id', dmUserId).is('read_at', null);
      scrollToBottom();
    };
    load();
    const channel = supabase.channel(`dm:${user.id}:${dmUserId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
      const row = payload.new as DirectMessage;
      if ((row.sender_id === dmUserId && row.receiver_id === user.id) || (row.receiver_id === dmUserId && row.sender_id === user.id)) load();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, dmUserId, supabase, scrollToBottom]);

  useEffect(() => { scrollToBottom(); }, [messages, dmMessages, scrollToBottom]);

  const markChannelRead = useCallback(async () => {
    if (!channelId || !user || !supabase) return;
    await supabase.from('channel_reads').upsert({ user_id: user.id, channel_id: channelId, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,channel_id' });
  }, [channelId, user, supabase]);

  useEffect(() => {
    if (view === 'channel' && channelId) markChannelRead();
  }, [view, channelId, markChannelRead]);

  const sendChannelMessage = async () => {
    if (!input.trim() || !channelId || !user || !supabase) return;
    await supabase.from('chat_messages').insert({ channel_id: channelId, sender_id: user.id, content: input.trim() });
    setInput('');
  };

  const sendDm = async () => {
    if (!input.trim() || !dmUserId || !user || !supabase) return;
    await supabase.from('direct_messages').insert({ sender_id: user.id, receiver_id: dmUserId, content: input.trim() });
    setInput('');
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !user || !supabase || creatingChannel) return;
    setCreatingChannel(true);
    const { data: ch, error: chErr } = await supabase.from('chat_channels').insert({ name: newChannelName.trim(), description: newChannelDesc.trim() || null, type: 'group', created_by: user.id }).select('id').single();
    if (chErr) { setCreatingChannel(false); return; }
    await supabase.from('chat_members').insert([{ channel_id: ch.id, user_id: user.id }, ...selectedInvites.filter((uid) => uid !== user.id).map((uid) => ({ channel_id: ch.id, user_id: uid }))]);
    setCreateChannelOpen(false);
    setNewChannelName('');
    setNewChannelDesc('');
    setSelectedInvites([]);
    const memberCount = 1 + selectedInvites.filter((uid) => uid !== user.id).length;
    setChannels((prev) => [...prev, { id: ch.id, name: newChannelName.trim(), description: newChannelDesc.trim() || null, type: 'group', created_by: user.id, unread: 0, member_count: memberCount }]);
    setChannelId(ch.id);
    setView('channel');
    setCreatingChannel(false);
  };

  useEffect(() => {
    if (!createChannelOpen || !supabase) return;
    supabase.from('profiles').select('id, email, full_name').then(({ data }) => setAllProfiles(data ?? []));
  }, [createChannelOpen, supabase]);

  const displayMessages = view === 'channel' ? messages : dmMessages;
  const isChannel = view === 'channel';

  if (!supabase) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
        Supabase är inte konfigurerad.
      </div>
    );
  }

  if (loading && !user) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/50 p-6 text-zinc-300">
        Logga in för att använda chatt.
      </div>
    );
  }

  const filteredProfiles = dmSearch.trim()
    ? allProfiles.filter((p) => (p.full_name ?? p.email ?? '').toLowerCase().includes(dmSearch.toLowerCase()) && p.id !== user.id)
    : allProfiles.filter((p) => p.id !== user.id);
  const inviteFiltered = inviteSearch.trim()
    ? allProfiles.filter((p) => (p.full_name ?? p.email ?? '').toLowerCase().includes(inviteSearch.toLowerCase()) && p.id !== user.id)
    : allProfiles.filter((p) => p.id !== user.id);

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border bg-[var(--background)]" style={{ borderColor: 'var(--border)' }}>
      {/* Left sidebar 240px */}
      <div className="flex w-[240px] shrink-0 flex-col border-r" style={{ borderColor: 'var(--border)' }}>
        <div className="border-b p-3" style={{ borderColor: 'var(--border)' }}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Kanaler</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateChannelOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}
            >
              <Plus className="h-4 w-4" /> Ny kanal
            </button>
          </div>
          <ul className="mt-2 space-y-0.5">
            {channels.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { setView('channel'); setChannelId(c.id); setDmUserId(null); }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${channelId === c.id ? 'bg-[#1c1c1c] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Hash className="h-4 w-4 shrink-0" /> {c.name}
                  </span>
                  {c.unread ? (
                    <span className="shrink-0 rounded-full bg-violet-500 px-1.5 py-0.5 text-xs font-medium text-white">{c.unread}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Direktmeddelanden</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDmPickerOpen(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}
            >
              <Plus className="h-4 w-4" /> Ny DM
            </button>
          </div>
          <ul className="mt-2 space-y-0.5">
            {dmPartners.map(({ id, profile }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => { setView('dm'); setDmUserId(id); setChannelId(null); }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${dmUserId === id ? 'bg-[#1c1c1c] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-xs font-medium text-white">
                    {getInitials(profile)}
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[var(--background)]" title="Online" />
                  </span>
                  <span className="truncate">{profile.full_name || profile.email || id.slice(0, 8)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Middle: messages */}
      <div className="flex flex-1 flex-col min-w-0">
        {view === null ? (
          <div className="flex flex-1 items-center justify-center text-zinc-500">Välj en kanal eller en konversation.</div>
        ) : (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              {isChannel && channelId ? (
                <>
                  <Hash className="h-5 w-5 text-zinc-400" />
                  <div>
                    <p className="font-semibold text-white">
                      {channels.find((c) => c.id === channelId)?.name ?? 'Kanal'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {channels.find((c) => c.id === channelId)?.description ?? ''} · {channels.find((c) => c.id === channelId)?.member_count ?? 0} medlemmar
                    </p>
                  </div>
                </>
              ) : dmUserId ? (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-600 text-sm font-medium text-white">
                    {getInitials(profiles[dmUserId] ?? dmPartners.find((p) => p.id === dmUserId)?.profile)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {profiles[dmUserId]?.full_name || profiles[dmUserId]?.email || dmPartners.find((p) => p.id === dmUserId)?.profile?.full_name || dmPartners.find((p) => p.id === dmUserId)?.profile?.email || 'Användare'}
                    </p>
                    <p className="text-xs text-zinc-500">Direktmeddelande</p>
                  </div>
                </>
              ) : null}
            </div>
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
              {displayMessages.length === 0 && (
                <p className="py-4 text-center text-sm text-zinc-500">Inga meddelanden än. Skriv något nedan.</p>
              )}
              {(displayMessages as { sender_id?: string; sender?: Profile; created_at: string; content: string; id: string; read_at?: string | null }[]).map((m, i) => {
                const prev = i > 0 ? displayMessages[i - 1] as { sender_id?: string; created_at: string } : null;
                const group = shouldGroup(prev, { sender_id: m.sender_id ?? null, created_at: m.created_at });
                return (
                  <div key={m.id} className={group ? 'ml-10 mt-0.5' : 'mt-4'}>
                    {!group && (
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-xs font-medium text-white">
                          {getInitials(m.sender)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-white">
                              {(m.sender?.full_name || m.sender?.email || 'Okänd')}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {new Date(m.created_at).toLocaleString('sv-SE')}
                            </span>
                            {!isChannel && m.sender_id !== user?.id && (m as DirectMessage).read_at && (
                              <span className="text-xs text-zinc-500">· Läst</span>
                            )}
                          </div>
                          <p className="mt-0.5 break-words text-sm text-zinc-300">{m.content}</p>
                        </div>
                      </div>
                    )}
                    {group && (
                      <div className="flex items-baseline gap-2 pl-0">
                        <span className="text-xs text-zinc-500">{new Date(m.created_at).toLocaleString('sv-SE')}</span>
                        <span className="break-words text-sm text-zinc-300">{m.content}</span>
                        {!isChannel && m.sender_id !== user?.id && (m as DirectMessage).read_at && (
                          <span className="text-xs text-zinc-500">Läst</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="shrink-0 border-t p-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2">
                <textarea
                  placeholder="Skriv ett meddelande..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); isChannel ? sendChannelMessage() : sendDm(); }
                  }}
                  rows={1}
                  className="min-h-[40px] flex-1 resize-none rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  style={{ borderColor: 'var(--border)' }}
                />
                <button
                  type="button"
                  onClick={() => isChannel ? sendChannelMessage() : sendDm()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-500"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Enter skickar, Shift+Enter för ny rad.</p>
            </div>
          </>
        )}
      </div>

      {/* Right sidebar 240px */}
      <div className="flex w-[240px] shrink-0 flex-col border-l p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 text-zinc-500">
          <Info className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Info</span>
        </div>
        {isChannel && channelId && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-zinc-400">{channels.find((c) => c.id === channelId)?.description || 'Ingen beskrivning.'}</p>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Users className="h-4 w-4" />
              <span>Medlemmar: {channels.find((c) => c.id === channelId)?.member_count ?? 0}</span>
            </div>
          </div>
        )}
        {view === 'dm' && dmUserId && (
          <div className="mt-3">
            <p className="text-sm text-zinc-400">
              {profiles[dmUserId]?.email || dmPartners.find((p) => p.id === dmUserId)?.profile?.email || '—'}
            </p>
          </div>
        )}
        {view === null && <p className="mt-3 text-sm text-zinc-500">Välj en kanal eller DM för att se info.</p>}
      </div>

      {/* Create channel modal */}
      {createChannelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCreateChannelOpen(false)}>
          <div className="w-full max-w-md rounded-xl border bg-[var(--background)] p-6 shadow-xl" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Skapa kanal</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500">Kanalnamn (t.ex. #allmänt)</label>
                <input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="#allmänt"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Beskrivning</label>
                <input
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="Valfri beskrivning"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500">Bjud in medlemmar (sök)</label>
                <input
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white"
                  style={{ borderColor: 'var(--border)' }}
                  placeholder="Sök användare..."
                />
                <ul className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {inviteFiltered.slice(0, 10).map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={selectedInvites.includes(p.id)}
                          onChange={() => setSelectedInvites((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id])}
                          className="rounded border-zinc-600"
                        />
                        {p.full_name || p.email || p.id.slice(0, 8)}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateChannelOpen(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-zinc-300" style={{ borderColor: 'var(--border)' }}>Avbryt</button>
              <button type="button" onClick={createChannel} disabled={creatingChannel || !newChannelName.trim()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50">
                {creatingChannel ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Skapa kanal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DM picker modal */}
      {dmPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDmPickerOpen(false)}>
          <div className="w-full max-w-md rounded-xl border bg-[var(--background)] p-6 shadow-xl" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Välj användare för DM</h3>
            <input
              value={dmSearch}
              onChange={(e) => setDmSearch(e.target.value)}
              className="mt-3 w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white"
              style={{ borderColor: 'var(--border)' }}
              placeholder="Sök användare..."
            />
            <ul className="mt-3 max-h-60 overflow-y-auto space-y-1">
              {filteredProfiles.slice(0, 15).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { setDmUserId(p.id); setView('dm'); setChannelId(null); setDmPickerOpen(false); if (!dmPartners.some((x) => x.id === p.id)) setDmPartners((prev) => [...prev, { id: p.id, profile: p }]); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-zinc-300 hover:bg-white/5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-xs text-white">{getInitials(p)}</span>
                    {p.full_name || p.email || p.id.slice(0, 8)}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setDmPickerOpen(false)} className="mt-4 rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>Stäng</button>
          </div>
        </div>
      )}
    </div>
  );
}
