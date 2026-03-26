export interface Customer {
  id: string;
  created_at: string;
  name: string;
  company: string | null;
  email: string | null;
  logo_url?: string | null;
  phone: string | null;
  birthday: string | null;
  contract_value: number | null;
  contract_start: string | null;
  contract_end: string | null;
  contract_length_months: number | null;
  services: string[] | null;
  status: string;
  notes: string | null;
  last_contact: string | null;
  churn_risk: number;
  lifetime_value: number;
}

export interface Domain {
  id: string;
  customer_id: string | null;
  domain: string;
  hosting_provider: string | null;
  renewal_date: string | null;
  built_by_us: boolean;
  wordpress: boolean;
  nextjs: boolean;
  status: string;
}

export interface Revenue {
  id: string;
  created_at: string;
  customer_id: string | null;
  amount: number;
  service: string | null;
  month: number | null;
  year: number | null;
  recurring: boolean;
}

export interface Reminder {
  id: string;
  created_at: string;
  customer_id: string | null;
  type: string | null;
  message: string | null;
  due_date: string | null;
  completed: boolean;
}

export type LeadStatus = 'ny' | 'kontaktad' | 'möte' | 'offert' | 'kund' | 'förlorad' | 'added_to_crm';
export type MatchedProduct = 'SEO' | 'M365' | 'IT-säkerhet' | 'Telefoni';

export interface Lead {
  id: string;
  created_at: string;
  company_name: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  score: number;
  issues: string[];
  built_by: string | null;
  runs_ads: boolean;
  poor_seo: boolean;
  slow_site: boolean;
  status: LeadStatus;
  notes: string | null;
  org_nr: string | null;
  decision_maker_name: string | null;
  decision_maker_title: string | null;
  website_score: number | null;
  google_position_keyword: string | null;
  google_position_rank: number | null;
  current_it_provider: string | null;
  matched_product: MatchedProduct | null;
  last_updated: string | null;
}
