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
    <div className="min-h-screen px-6 py-10 lg:px-10 lg:py-12 animate-fade-in">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 font-heading text-3xl font-semibold text-white">
          Offerthantering
        </h1>
        <QuotesDashboard customers={customers} />
      </div>
    </div>
  );
}
