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
  no_mobile?: boolean;
  has_facebook_pixel?: boolean;
  pays_catalog?: boolean;
  buys_leads?: boolean;
  extra_domains?: string[];
  built_by?: string | null;
  built_by_agency?: string | null;
  sales_pitch?: string | null;
}

const ISSUE_LABELS: Record<string, string> = {
  poor_seo: 'Dålig SEO',
  runs_ads: 'Google Ads',
  has_facebook_pixel: 'Facebook Pixel',
  pays_catalog: 'Betalar katalog',
  buys_leads: 'Köper leads',
  slow_site: 'Långsam sida',
  no_mobile: 'Ingen mobil',
  no_title_or_short: 'Saknar title',
  poor_seo_meta: 'Dålig SEO-meta',
  no_meta_desc: 'Saknar meta',
  built_by_other: 'Byggd av annan byrå',
};

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-red-100 text-red-800';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-600';
}

function getPriorityStar(score: number): { icon: string; title: string; color: string } {
  if (score >= 70) return { icon: '★', title: 'Prioritet: Hög', color: 'text-red-600' };
  if (score >= 40) return { icon: '★', title: 'Prioritet: Medel', color: 'text-amber-500' };
  return { icon: '☆', title: 'Prioritet: Låg', color: 'text-gray-400' };
}

export function ProspekteringDashboard() {
  const router = useRouter();
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [filterHighScore, setFilterHighScore] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
      setLoading(true);
    setLeads([]);
    setProgress(0);
    setLoadingMessage('Startar prospektering...');
    try {
      const res = await fetch('/api/prospects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: industry || 'städfirma', city: city || 'Västerås' }),
      });
      if (!res.ok || !res.body) {
        setProgress(0);
        setLoadingMessage('');
        setLoading(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const newLeads: Lead[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                setLoadingMessage(data.message || 'Analyserar...');
                if (typeof data.progress === 'number') setProgress(data.progress);
              } else if (data.type === 'lead') {
                newLeads.push(data.lead);
                setLeads([...newLeads]);
                if (typeof data.progress === 'number') setProgress(data.progress);
              } else if (data.type === 'done') {
                if (data.leads?.length) setLeads(data.leads);
                setProgress(100);
                setLoadingMessage('');
                setLoading(false);
                router.refresh();
                return;
              } else if (data.type === 'error') {
                alert(data.message || 'Ett fel inträffade');
                setProgress(0);
                setLoadingMessage('');
                setLoading(false);
                return;
              }
            } catch {
              // Ignorera parsefel
            }
          }
        }
      }
      setLeads(newLeads);
      setLoadingMessage('');
      router.refresh();
    } catch {
      setLeads([]);
      setProgress(0);
      setLoadingMessage('');
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
    if (lead.has_facebook_pixel || lead.issues?.includes('has_facebook_pixel')) badges.push('has_facebook_pixel');
    if (lead.pays_catalog || lead.issues?.includes('pays_catalog')) badges.push('pays_catalog');
    if (lead.buys_leads || lead.issues?.includes('buys_leads')) badges.push('buys_leads');
    if (lead.slow_site || lead.issues?.includes('slow_site')) badges.push('slow_site');
    if (lead.no_mobile || lead.issues?.includes('no_mobile')) badges.push('no_mobile');
    if (lead.issues?.includes('no_title_or_short')) badges.push('no_title_or_short');
    if (lead.issues?.includes('no_meta_desc')) badges.push('no_meta_desc');
    if (lead.built_by || lead.issues?.includes('built_by_other')) badges.push('built_by_other');
    return badges;
  };

  const displayedLeads = filterHighScore ? leads.filter((l) => l.score >= 70) : leads;

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
          <div className="flex items-end gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? 'Analyserar…' : 'Starta prospektering'}
            </button>
          </div>
          {loading && (
            <div className="mt-4 w-full">
              <div className="flex items-center justify-between gap-2 text-sm text-brand-600">
                <span>{loadingMessage}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-sand-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {leads.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-serif text-lg font-semibold text-brand-900">Resultat</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filterHighScore}
                onChange={(e) => setFilterHighScore(e.target.checked)}
                className="rounded border-sand-200"
              />
              Visa endast leads med score 70+
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {displayedLeads.map((lead) => {
              const priority = getPriorityStar(lead.score);
              return (
              <div
                key={lead.id}
                className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span title={priority.title} className={`text-lg ${priority.color}`}>
                        {priority.icon}
                      </span>
                      <h4 className="font-medium text-brand-900 truncate">{lead.company_name}</h4>
                    </div>
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
                          {key === 'built_by_other' && lead.built_by_agency
                            ? `Byggd av ${lead.built_by_agency}`
                            : (ISSUE_LABELS[key] || key)}
                        </span>
                      ))}
                    </div>
                    {((lead.pays_catalog || lead.buys_leads || lead.runs_ads) && (
                      <p className="mt-2 text-xs text-sand-600">
                        <span className="font-medium">Spenderar pengar på:</span>{' '}
                        {[
                          lead.pays_catalog && 'katalog',
                          lead.buys_leads && 'leads',
                          lead.runs_ads && 'ads',
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    ))}
                    {lead.built_by_agency && (
                      <p className="mt-1 text-xs text-sand-600">
                        <span className="font-medium">Hemsida byggd av:</span> {lead.built_by_agency}
                      </p>
                    )}
                    {lead.extra_domains && lead.extra_domains.length > 0 && (
                      <p className="mt-1 text-xs text-sand-600">
                        <span className="font-medium">Fler domäner:</span>{' '}
                        {lead.extra_domains.map((d, i) => (
                          <a
                            key={d}
                            href={`https://${d}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:underline"
                          >
                            {d}
                            {i < lead.extra_domains!.length - 1 ? ', ' : ''}
                          </a>
                        ))}
                      </p>
                    )}
                    {lead.sales_pitch && (
                      <p className="mt-2 text-sm italic text-sand-800 line-clamp-2" title={lead.sales_pitch}>
                        {lead.sales_pitch}
                      </p>
                    )}
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
            );
            })}
          </div>
          {filterHighScore && displayedLeads.length === 0 && (
            <p className="text-center text-sm text-sand-200">Inga leads med score 70+</p>
          )}
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
