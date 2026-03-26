'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  X,
  ChevronDown,
  ExternalLink,
  Phone,
  Mail,
  Globe,
  Building2,
  User,
  Star,
  MapPin,
  Shield,
  PhoneCall,
} from 'lucide-react';
import type { Lead, LeadStatus, MatchedProduct } from '@/types/database';

const STATUSES: { value: LeadStatus | 'alla'; label: string; color: string }[] = [
  { value: 'alla', label: 'Alla', color: 'bg-zinc-700' },
  { value: 'ny', label: 'Ny', color: 'bg-blue-600' },
  { value: 'kontaktad', label: 'Kontaktad', color: 'bg-yellow-600' },
  { value: 'möte', label: 'Möte', color: 'bg-purple-600' },
  { value: 'offert', label: 'Offert', color: 'bg-orange-600' },
  { value: 'kund', label: 'Kund', color: 'bg-green-600' },
  { value: 'förlorad', label: 'Förlorad', color: 'bg-red-600' },
];

const PRODUCTS: MatchedProduct[] = ['SEO', 'M365', 'IT-säkerhet', 'Telefoni'];

const PRODUCT_ICONS: Record<MatchedProduct, typeof Globe> = {
  SEO: Globe,
  M365: Building2,
  'IT-säkerhet': Shield,
  Telefoni: PhoneCall,
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUSES.find((st) => st.value === status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${s?.color ?? 'bg-zinc-600'}`}>
      {s?.label ?? status}
    </span>
  );
}

function WebsiteScoreStars({ score }: { score: number | null }) {
  if (!score) return <span className="text-zinc-600">—</span>;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= score ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-700'}`} />
      ))}
    </span>
  );
}

function ProductBadge({ product }: { product: MatchedProduct }) {
  const Icon = PRODUCT_ICONS[product];
  const colors: Record<MatchedProduct, string> = {
    SEO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    M365: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'IT-säkerhet': 'bg-red-500/10 text-red-400 border-red-500/20',
    Telefoni: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${colors[product]}`}>
      <Icon className="h-3 w-3" />
      {product}
    </span>
  );
}

interface EditModalProps {
  lead: Lead;
  onClose: () => void;
  onSave: (updated: Partial<Lead> & { id: string }) => void;
}

function EditModal({ lead, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({ ...lead });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      id: lead.id,
      company_name: form.company_name,
      org_nr: form.org_nr,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      website: form.website,
      decision_maker_name: form.decision_maker_name,
      decision_maker_title: form.decision_maker_title,
      website_score: form.website_score,
      runs_ads: form.runs_ads,
      google_position_keyword: form.google_position_keyword,
      google_position_rank: form.google_position_rank,
      current_it_provider: form.current_it_provider,
      matched_product: form.matched_product,
      status: form.status,
      notes: form.notes,
    });
    setSaving(false);
  };

  const inputClass =
    'w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-6 text-lg font-semibold text-white">
          Redigera: {lead.company_name || 'Lead'}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Företagsnamn</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.company_name ?? ''} onChange={(e) => set('company_name', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Org.nr</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.org_nr ?? ''} onChange={(e) => set('org_nr', e.target.value)} placeholder="XXXXXX-XXXX" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">E-post</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} type="email" value={form.contact_email ?? ''} onChange={(e) => set('contact_email', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Telefon</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.contact_phone ?? ''} onChange={(e) => set('contact_phone', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Webbplats</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Webbpoäng (1-5)</label>
            <select
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
              value={form.website_score ?? ''}
              onChange={(e) => set('website_score', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Beslutsfattare — namn</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.decision_maker_name ?? ''} onChange={(e) => set('decision_maker_name', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Beslutsfattare — titel</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.decision_maker_title ?? ''} onChange={(e) => set('decision_maker_title', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Google-sökord</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.google_position_keyword ?? ''} onChange={(e) => set('google_position_keyword', e.target.value)} placeholder="t.ex. redovisningsbyrå stockholm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Google-position</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} type="number" min="1" value={form.google_position_rank ?? ''} onChange={(e) => set('google_position_rank', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Nuvarande IT-leverantör</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={form.current_it_provider ?? ''} onChange={(e) => set('current_it_provider', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Matchad produkt</label>
            <select
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
              value={form.matched_product ?? ''}
              onChange={(e) => set('matched_product', e.target.value || null)}
            >
              <option value="">—</option>
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Status</label>
            <select
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUSES.filter((s) => s.value !== 'alla').map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={form.runs_ads ?? false}
                onChange={(e) => set('runs_ads', e.target.checked)}
                className="rounded border-zinc-600"
              />
              Kör Google Ads
            </label>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-zinc-400">Anteckningar</label>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              style={{ borderColor: 'var(--border)' }}
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-zinc-400 hover:text-white" style={{ borderColor: 'var(--border)' }}>
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CRMDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<LeadStatus | 'alla'>('alla');
  const [search, setSearch] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeStatus !== 'alla') params.set('status', activeStatus);
    if (search.trim()) params.set('search', search.trim());

    try {
      const res = await fetch(`/api/crm?${params}`);
      const json = await res.json();
      // Stöd både nytt paginerat format och gammalt array-format
      const data = json.data ?? json;
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    try {
      await fetch('/api/crm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    } catch {
      // ignore
    }
  };

  const handleSave = async (updated: Partial<Lead> & { id: string }) => {
    try {
      const res = await fetch('/api/crm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const saved = await res.json();
      if (saved && saved.id) {
        setLeads((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
      }
    } catch {
      // ignore
    }
    setEditingLead(null);
  };

  const handleAdd = async (form: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const newLead = await res.json();
      if (newLead && newLead.id) {
        setLeads((prev) => [newLead, ...prev]);
      }
    } catch {
      // ignore
    }
    setShowAddForm(false);
  };

  // KPI-beräkningar
  const counts: Record<string, number> = {};
  for (const s of STATUSES) {
    if (s.value === 'alla') continue;
    counts[s.value] = leads.filter((l) => l.status === s.value).length;
  }
  // Konverteringsrate: kund / (alla utom ny)
  const contacted = leads.filter((l) => l.status !== 'ny').length;
  const conversionRate = contacted > 0 ? Math.round((counts['kund'] / contacted) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-white">CRM</h1>
          <p className="mt-1 text-sm text-zinc-400">Hantera leads och pipeline</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Ny lead
        </button>
      </div>

      {/* KPI-kort */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {STATUSES.filter((s) => s.value !== 'alla').map((s) => (
          <div
            key={s.value}
            className="rounded-xl border p-4"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <p className="text-xs text-zinc-400">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{counts[s.value] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Konverteringsrate */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">Konverteringsrate (kontaktad → kund)</p>
          <p className="text-2xl font-semibold text-white">{conversionRate}%</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-zinc-800">
          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${conversionRate}%` }} />
        </div>
      </div>

      {/* Sök + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className="flex h-10 flex-1 items-center gap-2 rounded-lg border px-3"
          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'var(--border)' }}
        >
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            type="search"
            placeholder="Sök företag, org.nr, e-post..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setActiveStatus(s.value)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeStatus === s.value
                  ? 'bg-violet-600 text-white'
                  : 'border text-zinc-400 hover:text-white'
              }`}
              style={activeStatus !== s.value ? { borderColor: 'var(--border)' } : undefined}
            >
              {s.label}
              {s.value !== 'alla' && (
                <span className="ml-1.5 text-zinc-500">{counts[s.value] ?? 0}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tabell */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ background: 'var(--card)' }}>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Företag</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Org.nr</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Beslutsfattare</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Kontakt</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Webb</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Ads</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Google</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">IT-leverantör</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Produkt</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-xs font-medium text-zinc-400">Uppdaterad</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ divideColor: 'var(--border)' } as React.CSSProperties}>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-zinc-500">Laddar...</td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-zinc-500">
                  Inga leads hittades.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                  onClick={() => setEditingLead(lead)}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                    <div className="flex items-center gap-2">
                      {lead.company_name || '—'}
                      {lead.website && (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-500 hover:text-violet-400"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400 font-mono text-xs">
                    {lead.org_nr || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lead.decision_maker_name ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-white">
                          <User className="h-3.5 w-3.5 text-zinc-500" />
                          {lead.decision_maker_name}
                        </div>
                        {lead.decision_maker_title && (
                          <p className="text-xs text-zinc-500">{lead.decision_maker_title}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {lead.contact_phone && (
                        <a
                          href={`tel:${lead.contact_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-500 hover:text-green-400"
                          title={lead.contact_phone}
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {lead.contact_email && (
                        <a
                          href={`mailto:${lead.contact_email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-zinc-500 hover:text-blue-400"
                          title={lead.contact_email}
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <WebsiteScoreStars score={lead.website_score} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.runs_ads ? (
                      <span className="text-xs font-medium text-yellow-400">Ads</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.google_position_rank ? (
                      <div className="text-xs">
                        <span className="flex items-center gap-1 text-white">
                          <MapPin className="h-3 w-3 text-zinc-500" />
                          #{lead.google_position_rank}
                        </span>
                        {lead.google_position_keyword && (
                          <p className="truncate text-zinc-500 max-w-[120px]">{lead.google_position_keyword}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400 text-xs">
                    {lead.current_it_provider || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {lead.matched_product ? (
                      <ProductBadge product={lead.matched_product} />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        className="appearance-none rounded-md border bg-transparent py-1 pl-2 pr-6 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        {STATUSES.filter((s) => s.value !== 'alla').map((s) => (
                          <option key={s.value} value={s.value} className="bg-zinc-900">{s.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {lead.last_updated
                      ? new Date(lead.last_updated).toLocaleDateString('sv-SE')
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingLead && (
        <EditModal lead={editingLead} onClose={() => setEditingLead(null)} onSave={handleSave} />
      )}

      {/* Add modal */}
      {showAddForm && (
        <AddLeadModal onClose={() => setShowAddForm(false)} onSave={handleAdd} />
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onSave }: { onClose: () => void; onSave: (form: Record<string, unknown>) => void }) {
  const [form, setForm] = useState<Record<string, unknown>>({ status: 'ny' });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const inputClass =
    'w-full rounded-lg border bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-6 text-lg font-semibold text-white">Ny lead</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs text-zinc-400">Företagsnamn *</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={(form.company_name as string) ?? ''} onChange={(e) => set('company_name', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Org.nr</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={(form.org_nr as string) ?? ''} onChange={(e) => set('org_nr', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Webbplats</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={(form.website as string) ?? ''} onChange={(e) => set('website', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">E-post</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} type="email" value={(form.contact_email as string) ?? ''} onChange={(e) => set('contact_email', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Telefon</label>
            <input className={inputClass} style={{ borderColor: 'var(--border)' }} value={(form.contact_phone as string) ?? ''} onChange={(e) => set('contact_phone', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Matchad produkt</label>
            <select
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
              value={(form.matched_product as string) ?? ''}
              onChange={(e) => set('matched_product', e.target.value || null)}
            >
              <option value="">—</option>
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Status</label>
            <select
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
              value={(form.status as string) ?? 'ny'}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUSES.filter((s) => s.value !== 'alla').map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-zinc-400 hover:text-white" style={{ borderColor: 'var(--border)' }}>
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.company_name}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? 'Sparar...' : 'Lägg till'}
          </button>
        </div>
      </div>
    </div>
  );
}
