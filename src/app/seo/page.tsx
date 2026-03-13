import { getSupabaseAdmin } from '@/lib/supabase';
import { SEODashboard } from '@/components/seo/SEODashboard';

export default async function SEOPage() {
  const supabase = getSupabaseAdmin();
  let customers: { id: string; name: string }[] = [];
  let domains: { id: string; domain: string; customer_id: string | null }[] = [];

  if (supabase) {
    const customersRes = await supabase.from('customers').select('id, name').order('name');
    customers = (customersRes.data ?? []) as { id: string; name: string }[];
    const domainsRes = await supabase.from('domains').select('id, domain, customer_id');
    domains = domainsRes.error ? [] : ((domainsRes.data ?? []) as { id: string; domain: string; customer_id: string | null }[]);
  }

  return (
    <div className="min-h-screen px-6 py-10 lg:px-10 lg:py-12 animate-fade-in">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 font-heading text-3xl font-semibold text-white">
          SEO-dashboard
        </h1>
        <SEODashboard customers={customers} domains={domains} />
      </div>
    </div>
  );
}
