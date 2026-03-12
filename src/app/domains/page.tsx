import { getSupabaseAdmin } from '@/lib/supabase';
import { DomainsDashboard } from '@/components/domains/DomainsDashboard';

export default async function DomainsPage() {
  const supabase = getSupabaseAdmin();
  let customers: { id: string; name: string }[] = [];

  if (supabase) {
    const { data } = await supabase.from('customers').select('id, name').order('name');
    customers = (data ?? []) as { id: string; name: string }[];
  }

  return (
    <div className="min-h-screen bg-sand-50 px-8 py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-12 font-serif text-3xl font-semibold text-brand-900">
          Domänöversikt
        </h1>
        <DomainsDashboard customers={customers} />
      </div>
    </div>
  );
}
