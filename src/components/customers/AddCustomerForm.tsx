'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SERVICES = [
  'Hemsida',
  'SEO',
  'Hosting',
  'Webbhotell',
  'Support',
  'Reklam',
  'Annat',
];

export function AddCustomerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    birthday: '',
    contract_value: '',
    contract_start: '',
    contract_end: '',
    services: [] as string[],
    notes: '',
  });

  const toggleService = (service: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          company: form.company || null,
          email: form.email || null,
          phone: form.phone || null,
          birthday: form.birthday || null,
          contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
          contract_start: form.contract_start || null,
          contract_end: form.contract_end || null,
          services: form.services.length ? form.services : null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        setForm({
          name: '',
          company: '',
          email: '',
          phone: '',
          birthday: '',
          contract_value: '',
          contract_start: '',
          contract_end: '',
          services: [],
          notes: '',
        });
        setOpen(false);
        router.refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.details ? `${err.error}\n\n${err.details}` : (err.error || 'Något gick fel');
        alert(msg);
      }
    } catch {
      alert('Något gick fel. Kontrollera att Supabase är konfigurerad.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
      >
        + Lägg till kund
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-serif text-xl text-brand-900">Ny kund</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-900">Namn *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-900">Företag</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-900">E-post</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-900">Telefon</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-900">Födelsedag</label>
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
                  className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-900">
                    Avtalsvärde (kr)
                  </label>
                  <input
                    type="number"
                    value={form.contract_value}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contract_value: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-900">
                    Avtalsstart
                  </label>
                  <input
                    type="date"
                    value={form.contract_start}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contract_start: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-900">Avtalslut</label>
                  <input
                    type="date"
                    value={form.contract_end}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contract_end: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-900">Tjänster</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleService(s)}
                      className={`rounded-full px-3 py-1 text-sm ${
                        form.services.includes(s)
                          ? 'bg-brand-500 text-white'
                          : 'bg-sand-100 text-brand-900'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-900">Anteckningar</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded border border-sand-200 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-sand-200 px-4 py-2 text-sm"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {loading ? 'Sparar...' : 'Spara kund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
