import { getSupabaseAdmin } from '@/lib/supabase';
import { EconomyDashboard } from '@/components/economy/EconomyDashboard';

export default async function EconomyPage() {
  const supabase = getSupabaseAdmin();
  let customers: { id: string; name: string }[] = [];

  if (supabase) {
    const { data } = await supabase.from('customers').select('id, name').order('name');
    customers = (data ?? []) as { id: string; name: string }[];
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <h1 className="mb-8 font-heading text-3xl font-semibold text-[var(--foreground)]">
        Ekonomidashboard
      </h1>
      <EconomyDashboard customers={customers} />
    </div>
  );
}
