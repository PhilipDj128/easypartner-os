import { getSupabaseAdmin } from '@/lib/supabase';
import { QuoteWizard } from '@/components/quotes/QuoteWizard';

export default async function NewQuotePage() {
  const supabase = getSupabaseAdmin();
  let customers: { id: string; name: string; company?: string | null; email?: string | null; phone?: string | null }[] = [];

  if (supabase) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, company, email, phone')
      .order('name');
    customers = (data ?? []) as typeof customers;
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <h1 className="mb-8 font-heading text-3xl font-semibold text-[var(--foreground)]">
        Ny offert
      </h1>
      <QuoteWizard customers={customers} />
    </div>
  );
}
