-- Run this in Supabase SQL Editor after Cursor is done.
-- Adds columns for Oneflow-style offert and e-signing.

alter table quotes add column if not exists quote_number text;
alter table quotes add column if not exists one_time_cost numeric default 0;
alter table quotes add column if not exists monthly_cost numeric default 0;
alter table quotes add column if not exists binding_period text;
alter table quotes add column if not exists contract_period text;
alter table quotes add column if not exists line_items jsonb default '[]';
alter table quotes add column if not exists sign_token text unique;
alter table quotes add column if not exists signed_at timestamp;
alter table quotes add column if not exists signed_by_name text;
alter table quotes add column if not exists signed_ip text;
alter table quotes add column if not exists recipient_name text;
alter table quotes add column if not exists recipient_email text;
alter table quotes add column if not exists valid_until date;
alter table quotes add column if not exists notes text;
