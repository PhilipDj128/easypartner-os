-- Run in Supabase SQL Editor. Internal chat (Slack/Teams-style).

-- Profiles: sync from auth if not exists (for chat user display)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp default now()
);

-- Ensure RLS and allow read for authenticated
alter table profiles enable row level security;
create policy "Users can read all profiles" on profiles for select to authenticated using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Channels
create table chat_channels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  type text default 'group',
  created_by uuid references profiles(id),
  created_at timestamp default now()
);

create table chat_members (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references chat_channels(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamp default now(),
  unique(channel_id, user_id)
);

create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references chat_channels(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  created_at timestamp default now(),
  edited_at timestamp,
  is_deleted boolean default false
);

-- Last read per user per channel (for unread badge)
create table channel_reads (
  user_id uuid references profiles(id) on delete cascade,
  channel_id uuid references chat_channels(id) on delete cascade,
  last_read_at timestamp default now(),
  primary key (user_id, channel_id)
);

create table direct_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id),
  receiver_id uuid references profiles(id),
  content text not null,
  read_at timestamp,
  created_at timestamp default now()
);

alter table chat_channels enable row level security;
alter table chat_members enable row level security;
alter table chat_messages enable row level security;
alter table channel_reads enable row level security;
alter table direct_messages enable row level security;

-- Channels: members can read; authenticated can create
create policy "Members can read channels" on chat_channels for select using (
  exists (select 1 from chat_members where channel_id = chat_channels.id and user_id = auth.uid())
);
create policy "Authenticated can create channel" on chat_channels for insert with check (auth.uid() = created_by);

-- Members: members of a channel can read its members; channel creator or members can insert
create policy "Members can read channel members" on chat_members for select using (
  exists (select 1 from chat_members m where m.channel_id = chat_members.channel_id and m.user_id = auth.uid())
);
create policy "Channel creator or member can add members" on chat_members for insert with check (
  exists (select 1 from chat_channels c where c.id = channel_id and (c.created_by = auth.uid() or exists (select 1 from chat_members m where m.channel_id = c.id and m.user_id = auth.uid())))
);

create policy "members can read channel messages" on chat_messages for select using (
  exists (select 1 from chat_members where channel_id = chat_messages.channel_id and user_id = auth.uid())
);
create policy "members can send messages" on chat_messages for insert with check (
  exists (select 1 from chat_members where channel_id = chat_messages.channel_id and user_id = auth.uid())
);

create policy "Users can manage own channel_reads" on channel_reads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users see their DMs" on direct_messages for select using (
  auth.uid() = sender_id or auth.uid() = receiver_id
);
create policy "users send DMs" on direct_messages for insert with check (
  auth.uid() = sender_id
);
create policy "receiver can update read_at" on direct_messages for update using (auth.uid() = receiver_id);

-- Realtime
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table direct_messages;

-- RPC: total unread count for current user (channels + DMs)
create or replace function get_chat_unread_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select count(*)::int from chat_messages m
     join chat_members mem on mem.channel_id = m.channel_id and mem.user_id = auth.uid()
     left join channel_reads r on r.channel_id = m.channel_id and r.user_id = auth.uid()
     where m.is_deleted = false and m.created_at > coalesce(r.last_read_at, '1970-01-01')),
    0
  ) + coalesce(
    (select count(*)::int from direct_messages where receiver_id = auth.uid() and read_at is null),
    0
  );
$$;
