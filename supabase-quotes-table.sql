-- Kör denna SQL i Supabase Dashboard → SQL Editor
-- Kräver att tabellen "customers" finns

create table if not exists quotes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  customer_id uuid references customers(id),
  services jsonb,
  total_amount numeric,
  status text default 'draft',
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  signed_at timestamp with time zone,
  valid_until date
);
