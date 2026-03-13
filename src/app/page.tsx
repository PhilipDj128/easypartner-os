import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default function DashboardPage() {
  return (
    <div className="min-h-screen px-6 py-10 lg:px-10 lg:py-12 animate-fade-in">
      <div className="mx-auto max-w-6xl">
        <DashboardClient />
      </div>
    </div>
  );
}
