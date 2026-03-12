-- Kör denna SQL i Supabase Dashboard → SQL Editor

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  company_name text,
  website text,
  contact_email text,
  contact_phone text,
  score integer default 0,
  issues text[],
  built_by text,
  runs_ads boolean default false,
  poor_seo boolean default false,
  slow_site boolean default false,
  status text default 'new',
  notes text
);
