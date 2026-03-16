import { ProspekteringDashboard } from '@/components/leads/ProspekteringDashboard';
import { redirect } from 'next/navigation';

interface ProspekteringPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function ProspekteringPage({ searchParams }: ProspekteringPageProps) {
  const source = typeof searchParams?.source === 'string' ? searchParams.source : undefined;

  // För nu: om source=auto-nightly, behåll bara parametern i URL:en (UI-visning sker i /prospektering vyn)
  if (source && source !== 'auto-nightly') {
    redirect('/prospektering');
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <h1 className="mb-8 font-heading text-3xl font-semibold text-[var(--foreground)]">
        Prospektering
      </h1>
      <ProspekteringDashboard />
    </div>
  );
}
