import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="font-serif text-2xl text-brand-900">Dashboard</h1>
      <p className="mt-2 text-sand-200">
        Välkommen till EasyPartner OS. Huvudvyn kommer i Modul 8.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/customers"
          className="rounded-lg border border-sand-200 bg-white p-6 shadow-sm hover:border-brand-200"
        >
          <h3 className="font-serif text-lg text-brand-900">Kunder</h3>
          <p className="mt-1 text-sm text-sand-200">Hantera kunder och avtal</p>
        </Link>
        <Link
          href="/economy"
          className="rounded-lg border border-sand-200 bg-white p-6 shadow-sm hover:border-brand-200"
        >
          <h3 className="font-serif text-lg text-brand-900">Ekonomi</h3>
          <p className="mt-1 text-sm text-sand-200">Intäkter och utgifter</p>
        </Link>
        <Link
          href="/quotes"
          className="rounded-lg border border-sand-200 bg-white p-6 shadow-sm hover:border-brand-200"
        >
          <h3 className="font-serif text-lg text-brand-900">Offerter</h3>
          <p className="mt-1 text-sm text-sand-200">Skapa och skicka offerter</p>
        </Link>
      </div>
    </div>
  );
}
