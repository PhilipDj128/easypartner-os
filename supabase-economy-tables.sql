-- Kör denna SQL i Supabase Dashboard → SQL Editor

-- Revenue (intäkter)
create table if not exists revenue (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  customer_id uuid references customers(id),
  amount numeric not null,
  service text,
  month integer,
  year integer,
  recurring boolean default false
);

-- Expenses (utgifter)
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  category text,
  description text,
  amount numeric not null,
  month integer,
  year integer,
  supplier text
);
