import { ProspekteringDashboard } from '@/components/leads/ProspekteringDashboard';

export default function ProspekteringPage() {
  return (
    <div className="min-h-screen bg-sand-50 px-8 py-16">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-12 font-serif text-3xl font-semibold text-brand-900">
          Prospektering
        </h1>
        <ProspekteringDashboard />
      </div>
    </div>
  );
}
