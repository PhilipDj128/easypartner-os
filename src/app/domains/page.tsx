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
    <div className="mx-auto max-w-6xl animate-fade-in">
      <h1 className="mb-8 font-heading text-3xl font-semibold text-[var(--foreground)]">
        Domänöversikt
      </h1>
      <DomainsDashboard customers={customers} />
    </div>
  );
}
