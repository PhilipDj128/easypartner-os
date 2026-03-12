-- Kör denna SQL i Supabase Dashboard → SQL Editor
-- Kräver att tabellen "customers" finns

create table if not exists domains (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id),
  domain text not null,
  hosting_provider text,
  renewal_date date,
  built_by_us boolean default false,
  wordpress boolean default false,
  nextjs boolean default false,
  status text default 'active'
);
