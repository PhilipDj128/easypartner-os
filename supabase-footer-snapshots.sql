-- Byråbyte-bevakning: spara sidfots-snapshots för domäner
create table if not exists footer_snapshots (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  domain text not null,
  source text not null, -- 'leads' | 'customers'
  source_id text, -- lead id eller customer_id
  company_name text,
  snapshot_text text not null
);

create index if not exists idx_footer_snapshots_domain on footer_snapshots(domain);
create index if not exists idx_footer_snapshots_created_at on footer_snapshots(created_at desc);
