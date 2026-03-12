import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-sand-50 px-8 py-16">
      <div className="mx-auto max-w-6xl">
        <DashboardClient />
      </div>
    </div>
  );
}
