import { ProspekteringDashboard } from '@/components/leads/ProspekteringDashboard';

export default function ProspekteringPage() {
  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <h1 className="mb-8 font-heading text-3xl font-semibold text-[var(--foreground)]">
        Prospektering
      </h1>
      <ProspekteringDashboard />
    </div>
  );
}
