-- Kör i Supabase SQL Editor

create table if not exists seo_suggestions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  customer_id uuid references customers(id),
  suggestions jsonb
);
