-- Kör i Supabase SQL Editor om du vill visa kundens logga på client-dashboard
alter table customers add column if not exists logo_url text;
