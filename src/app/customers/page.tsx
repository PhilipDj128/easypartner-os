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
    <div className="min-h-screen bg-sand-50 px-8 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-semibold text-brand-900">Kunder</h1>
          <AddCustomerForm />
        </div>
        {!supabase && (
          <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">
            Supabase är inte fullt konfigurerad. Lägg till{' '}
            <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> i{' '}
            <code className="rounded bg-amber-100 px-1">.env.local</code>.
          </div>
        )}
        <CustomerTable customers={customers} />
      </div>
    </div>
  );
}
