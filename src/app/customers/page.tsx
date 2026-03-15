import { getSupabaseAdmin } from '@/lib/supabase';
import { CustomerTable } from '@/components/customers/CustomerTable';
import { AddCustomerForm } from '@/components/customers/AddCustomerForm';
import type { Customer } from '@/types/database';

export default async function CustomersPage() {
  let customers: Customer[] = [];
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase.from('customers').select('*').order('name');
    customers = (data ?? []) as Customer[];
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-semibold text-[var(--foreground)]">Kunder</h1>
        <AddCustomerForm />
      </div>
      {!supabase && (
        <div className="card mb-6 border-amber-500/30 bg-amber-500/10 p-5 text-amber-200">
          Supabase är inte fullt konfigurerad. Lägg till{' '}
          <code className="rounded bg-amber-500/20 px-1">SUPABASE_SERVICE_ROLE_KEY</code> i{' '}
          <code className="rounded bg-amber-500/20 px-1">.env.local</code>.
        </div>
      )}
      <CustomerTable customers={customers} />
    </div>
  );
}
