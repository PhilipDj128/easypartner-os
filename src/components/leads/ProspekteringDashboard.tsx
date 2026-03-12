'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Lead {
  id: string;
  company_name: string;
  website: string;
  contact_email: string | null;
  score: number;
  issues: string[];
  poor_seo?: boolean;
  runs_ads?: boolean;
  slow_site?: boolean;
  built_by?: string | null;
}

const ISSUE_LABELS: Record<string, string> = {
  poor_seo: 'Dålig SEO',
  runs_ads: 'Kör Ads',
  slow_site: 'Långsam sida',
  built_by_other: 'Byggd av annan byrå',
};

function getScoreColor(score: number): string {
  if (score <= 40) return 'bg-red-100 text-red-800';
  if (score <= 70) return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-green-800';
}

export function ProspekteringDashboard() {
  const router = useRouter();
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLeads([]);
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: industry || 'städfirma', city: city || 'Västerås' }),
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : []);
      }
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCrm = async (lead: Lead) => {
    setAddingId(lead.id);
    try {
      const res = await fetch('/api/prospects/add-to-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: lead.company_name,
          website: lead.website,
          contact_email: lead.contact_email,
          contact_phone: null,
          score: lead.score,
          issues: lead.issues,
        }),
      });
      if (res.ok) {
        router.refresh();
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      } else {
        const err = await res.json();
        alert(err.error || 'Kunde inte lägga till');
      }
    } finally {
      setAddingId(null);
    }
  };

  const getIssueBadges = (lead: Lead) => {
    const badges: string[] = [];
    if (lead.poor_seo || lead.issues?.includes('poor_seo')) badges.push('poor_seo');
    if (lead.runs_ads || lead.issues?.includes('runs_ads')) badges.push('runs_ads');
    if (lead.slow_site || lead.issues?.includes('slow_site')) badges.push('slow_site');
    if (lead.built_by || lead.issues?.includes('built_by_other')) badges.push('built_by_other');
    return badges;
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSearch} className="rounded-xl border border-sand-200 bg-white p-6 shadow-sm">
        <h3 className="font-serif text-lg font-semibold text-brand-900">Sök leads</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-600">Bransch</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="t.ex. städfirma"
              className="mt-1 w-48 rounded-lg border border-sand-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-600">Stad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="t.ex. Västerås"
              className="mt-1 w-48 rounded-lg border border-sand-200 px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? 'Söker…' : 'Starta prospektering'}
            </button>
          </div>
        </div>
      </form>

      {leads.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-semibold text-brand-900">Resultat</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-brand-900 truncate">{lead.company_name}</h4>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-sm text-brand-600 hover:underline"
                    >
                      {lead.website}
                    </a>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-0.5 text-sm font-medium ${getScoreColor(lead.score)}`}
                      >
                        Score: {lead.score}
                      </span>
                      {getIssueBadges(lead).map((key) => (
                        <span
                          key={key}
                          className="inline-flex rounded-full bg-sand-100 px-2 py-0.5 text-xs text-sand-700"
                        >
                          {ISSUE_LABELS[key] || key}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddToCrm(lead)}
                    disabled={addingId === lead.id}
                    className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {addingId === lead.id ? 'Lägger till…' : 'Lägg till i CRM'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="rounded-xl border border-sand-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sand-200">
            Ange bransch och stad, klicka på &quot;Starta prospektering&quot; för att söka leads.
          </p>
        </div>
      )}
    </div>
  );
}
