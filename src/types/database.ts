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
