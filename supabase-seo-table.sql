-- Kör denna SQL i Supabase Dashboard → SQL Editor
-- Kräver att tabellen "customers" finns

create table if not exists seo_rankings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  customer_id uuid references customers(id),
  domain text,
  keyword text,
  position integer,
  previous_position integer,
  search_volume integer,
  date date default now()
);
