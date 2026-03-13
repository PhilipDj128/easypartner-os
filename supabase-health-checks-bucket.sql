-- Skapa storage-bucket för hälsokoll-PDFer (kör i Supabase Dashboard → SQL Editor)
insert into storage.buckets (id, name, public)
values ('health-checks', 'health-checks', false)
on conflict (id) do nothing;

-- Tillåt autentiserade användare att ladda upp
create policy if not exists "health-checks upload"
  on storage.objects for insert
  with check (bucket_id = 'health-checks');
