import { getSupabaseAdmin } from '@/lib/supabase';
import { QuotesDashboard } from '@/components/quotes/QuotesDashboard';

export default async function QuotesPage() {
  const supabase = getSupabaseAdmin();
  let customers: { id: string; name: string }[] = [];

  if (supabase) {
    const { data } = await supabase.from('customers').select('id, name').order('name');
    customers = (data ?? []) as { id: string; name: string }[];
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <h1 className="mb-8 font-heading text-3xl font-semibold text-[var(--foreground)]">
        Offerthantering
      </h1>
      <QuotesDashboard customers={customers} />
    </div>
  );
}
