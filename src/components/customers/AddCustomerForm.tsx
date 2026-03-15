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
        className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium"
      >
        + Lägg till kund
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl p-6">
            <h3 className="font-heading text-xl text-[var(--foreground)]">Ny kund</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Namn *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Företag</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">E-post</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Telefon</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Födelsedag</label>
                <input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Avtalsvärde (kr)</label>
                  <input
                    type="number"
                    value={form.contract_value}
                    onChange={(e) => setForm((p) => ({ ...p, contract_value: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Avtalsstart</label>
                  <input
                    type="date"
                    value={form.contract_start}
                    onChange={(e) => setForm((p) => ({ ...p, contract_start: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)]">Avtalslut</label>
                  <input
                    type="date"
                    value={form.contract_end}
                    onChange={(e) => setForm((p) => ({ ...p, contract_end: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Tjänster</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SERVICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleService(s)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        form.services.includes(s)
                          ? 'bg-indigo-500 text-[var(--foreground)]'
                          : 'bg-white/5 text-[#94a3b8] hover:bg-white/20'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)]">Anteckningar</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-white/5"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary rounded-lg px-4 py-2 text-sm disabled:opacity-50"
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
