-- CRM-fält migration för leads-tabellen
-- Kör i Supabase Dashboard → SQL Editor

-- Nya kolumner
ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_nr text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS decision_maker_title text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website_score integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_position_keyword text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS google_position_rank integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_it_provider text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS matched_product text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_updated timestamptz default now();

-- Constraints
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_website_score_check;
ALTER TABLE leads ADD CONSTRAINT leads_website_score_check
  CHECK (website_score IS NULL OR (website_score >= 1 AND website_score <= 5));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_matched_product_check;
ALTER TABLE leads ADD CONSTRAINT leads_matched_product_check
  CHECK (matched_product IS NULL OR matched_product IN ('SEO', 'M365', 'IT-säkerhet', 'Telefoni'));

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IS NULL OR status IN ('ny', 'kontaktad', 'möte', 'offert', 'kund', 'förlorad', 'added_to_crm'));

-- Trigger: auto-uppdatera last_updated vid varje UPDATE
CREATE OR REPLACE FUNCTION update_leads_last_updated()
RETURNS trigger AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_last_updated ON leads;
CREATE TRIGGER trg_leads_last_updated
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_last_updated();

-- Index för vanliga sökningar
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_org_nr ON leads (org_nr);
CREATE INDEX IF NOT EXISTS idx_leads_matched_product ON leads (matched_product);
CREATE INDEX IF NOT EXISTS idx_leads_last_updated ON leads (last_updated DESC);
