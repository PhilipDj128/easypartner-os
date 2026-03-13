import { ProspekteringDashboard } from '@/components/leads/ProspekteringDashboard';

export default function ProspekteringPage() {
  return (
    <div className="min-h-screen px-6 py-10 lg:px-10 lg:py-12 animate-fade-in">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-10 font-heading text-3xl font-semibold text-white">
          Prospektering
        </h1>
        <ProspekteringDashboard />
      </div>
    </div>
  );
}
