'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CompanyInfo {
  org_number?: string | null;
  revenue?: string | null;
  employees?: string | null;
  ceo?: string | null;
  board_members?: string[];
  companies_owned?: number | null;
  subscriptions?: number | null;
}

interface AgencyReputation {
  agency_name: string;
  trustpilot_rating: number | null;
  trustpilot_url: string | null;
  negative_review_count: number;
  on_warning_list: boolean;
  warned: boolean;
  hot_lead: boolean;
  google_reviews_count?: number | null;
  google_rating_avg?: number | null;
  agency_defunct?: boolean;
}

interface Lead {
  id: string;
  company_name: string;
  website: string;
  contact_email: string | null;
  contact_phone?: string | null;
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
  catalog_presence?: string[];
  industry_city_rank?: number;
  name_rank?: number | null;
  industry?: string;
  city?: string;
  company_info?: CompanyInfo | null;
  pts_operator?: string | null;
  pts_is_switchboard?: boolean;
  pts_switchboard_provider?: string | null;
  direct_phones?: string[];
  agency_reputation?: AgencyReputation | null;
  built_by?: string | null;
  built_by_agency?: string | null;
  hosted_at?: string | null;
  decision_makers?: { name: string; title: string; linkedin_url: string }[] | null;
  sales_pitch?: string | null;
}

const ISSUE_LABELS: Record<string, string> = {
  bytt_byra_nyligen: 'Bytt byrå nyligen',
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
  pts_switchboard: 'Växel',
  agency_warned: 'Varning: Byrån har dåliga recensioner',
  agency_hot_lead: 'Missnöjd med byrå',
  agency_defunct: 'Byrån är nedlagd',
  vd_hittad: 'VD hittad',
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

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('07')) return `${d.slice(0, 3)}-${d.slice(3, 6)} ${d.slice(6)}`;
  if (d.length === 9 && d.startsWith('08')) return `${d.slice(0, 2)}-${d.slice(2, 5)} ${d.slice(5)}`;
  return phone;
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
  const [monitoringRunning, setMonitoringRunning] = useState(false);
  const [healthCheckId, setHealthCheckId] = useState<string | null>(null);

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
          contact_phone: lead.contact_phone ?? null,
          score: lead.score,
          issues: lead.issues,
          company_info: lead.company_info,
          name_rank: lead.name_rank,
          industry_city_rank: lead.industry_city_rank,
          industry: lead.industry,
          city: lead.city,
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
    if (lead.pts_is_switchboard || lead.issues?.includes('pts_switchboard')) badges.push('pts_switchboard');
    if (lead.agency_reputation?.agency_defunct || lead.issues?.includes('agency_defunct')) badges.push('agency_defunct');
    if (lead.agency_reputation?.warned || lead.issues?.includes('agency_warned')) badges.push('agency_warned');
    if (lead.agency_reputation?.hot_lead || lead.issues?.includes('agency_hot_lead')) badges.push('agency_hot_lead');
    if (lead.issues?.includes('vd_hittad')) badges.push('vd_hittad');
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
            <button
              type="button"
              disabled={loading || monitoringRunning}
              onClick={async () => {
                setMonitoringRunning(true);
                try {
                  const res = await fetch('/api/monitoring', { method: 'POST' });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data.new_leads > 0) {
                    router.refresh();
                    alert(`Bevakning klar. ${data.new_leads} nya lead skapade (byråbyte upptäckt).`);
                  } else if (res.ok) {
                    alert(`Bevakning klar. ${data.checked} domäner kontrollerade. Inga byråbyten hittades.`);
                  } else {
                    alert(data.error || 'Bevakning misslyckades');
                  }
                } catch {
                  alert('Bevakning misslyckades');
                } finally {
                  setMonitoringRunning(false);
                }
              }}
              className="rounded-lg border border-sand-300 bg-white px-4 py-2.5 text-sm font-medium text-sand-700 hover:bg-sand-50 disabled:opacity-50"
            >
              {monitoringRunning ? 'Kör bevakning…' : 'Starta bevakning'}
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
                className={`rounded-xl border shadow-sm transition-shadow hover:shadow-md overflow-hidden ${
                  lead.agency_reputation?.on_warning_list
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-sand-200 bg-white'
                }`}
              >
                {(lead.agency_reputation?.on_warning_list ||
                  (lead.agency_reputation?.trustpilot_rating != null && lead.agency_reputation.trustpilot_rating < 3)) && (
                  <div className="bg-red-100 border-b border-red-200 px-4 py-2 text-sm font-medium text-red-800">
                    ⚠️ Varning: Byrån har dåliga recensioner
                  </div>
                )}
                {lead.agency_reputation?.agency_defunct && (
                  <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-sm font-medium text-amber-800">
                    Byrån är nedlagd — kunden har ingen support
                  </div>
                )}
                {lead.agency_reputation?.hot_lead && (
                  <div className="bg-amber-100 border-b border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-900">
                    🔥 Missnöjd med sin byrå — ring idag
                  </div>
                )}
                <div className="p-5">
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
                    {(lead.contact_phone && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={`tel:${lead.contact_phone.replace(/\D/g, '').replace(/^0/, '+46')}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-200"
                        >
                          <span>📞</span>
                          {formatPhone(lead.contact_phone)}
                        </a>
                        <a
                          href={`tel:${lead.contact_phone.replace(/\D/g, '').replace(/^0/, '+46')}`}
                          className="rounded bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600"
                        >
                          Ring nu
                        </a>
                        {lead.pts_operator && (
                          <span className="text-xs text-sand-600">Operatör: {lead.pts_operator}</span>
                        )}
                        {lead.pts_is_switchboard && lead.pts_switchboard_provider && (
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            Växel: {lead.pts_switchboard_provider}
                          </span>
                        )}
                        {lead.pts_is_switchboard && lead.direct_phones && lead.direct_phones.length > 0 && (
                          <span className="text-xs text-sand-600">
                            Direktnummer: {lead.direct_phones.slice(0, 2).map(formatPhone).join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                    {(lead.name_rank || lead.industry_city_rank) && (
                      <p className="mt-2 text-xs text-sand-600">
                        <span className="font-medium">Google-ranking:</span>{' '}
                        {lead.name_rank && `#${lead.name_rank} för "${lead.company_name}"`}
                        {lead.name_rank && lead.industry_city_rank && ' • '}
                        {lead.industry_city_rank && lead.industry && lead.city && (
                          <>#{lead.industry_city_rank} för &quot;{lead.industry} {lead.city}&quot;</>
                        )}
                      </p>
                    )}
                    {lead.catalog_presence && lead.catalog_presence.length > 0 && (
                      <p className="mt-1 text-xs text-sand-600">
                        <span className="font-medium">Finns på:</span> {lead.catalog_presence.join(', ')}
                      </p>
                    )}
                    {lead.hosted_at && (
                      <p className="mt-1 text-xs text-sand-600">
                        <span className="font-medium">Hostad på:</span>{' '}
                        <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                          {lead.hosted_at}
                        </span>
                      </p>
                    )}
                    {lead.decision_makers && lead.decision_makers.length > 0 && (
                      <div className="mt-2 rounded-lg border border-sand-100 bg-sand-50 p-2 text-xs">
                        <p className="font-medium text-sand-800">Beslutsfattare</p>
                        <ul className="mt-1 space-y-1">
                          {lead.decision_makers.map((dm, i) => (
                            <li key={i} className="text-sand-600">
                              <a
                                href={dm.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-brand-600 hover:underline"
                              >
                                {dm.name}
                              </a>
                              {' — '}
                              <span>{dm.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-0.5 text-sm font-medium ${getScoreColor(lead.score)}`}
                      >
                        Score: {lead.score}
                      </span>
                      {getIssueBadges(lead).map((key) => (
                        <span
                          key={key}
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            key === 'agency_warned' ? 'bg-red-100 text-red-800' :
                            key === 'agency_defunct' ? 'bg-amber-100 text-amber-800' :
                            key === 'pts_switchboard' && lead.pts_switchboard_provider
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-sand-100 text-sand-700'
                          }`}
                        >
                          {key === 'built_by_other' && lead.built_by_agency
                            ? `Byggd av ${lead.built_by_agency}`
                            :                             key === 'pts_switchboard' && lead.pts_switchboard_provider
                            ? `Växel: ${lead.pts_switchboard_provider}`
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
                    {(lead.agency_reputation || lead.built_by_agency) && (
                      <div className="mt-2 rounded-lg border border-sand-100 bg-sand-50 p-2 text-xs">
                        <p className="font-medium text-sand-800">Byråanalys</p>
                        <p className="mt-1 text-sand-600">
                          <span className="font-medium">Byrå:</span> {lead.built_by_agency || '—'}
                        </p>
                        {lead.agency_reputation?.trustpilot_rating != null && (
                          <p className="mt-0.5 text-sand-600">
                            Trustpilot: {lead.agency_reputation.trustpilot_rating.toFixed(1)}/5
                            {' ★'.repeat(Math.round(lead.agency_reputation.trustpilot_rating))}
                            {' ☆'.repeat(5 - Math.round(lead.agency_reputation.trustpilot_rating))}
                          </p>
                        )}
                        {lead.agency_reputation?.trustpilot_url && (
                          <a
                            href={lead.agency_reputation.trustpilot_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-brand-600 hover:underline"
                          >
                            Se Trustpilot →
                          </a>
                        )}
                        {lead.agency_reputation?.google_reviews_count != null && (
                          <p className="mt-0.5 text-sand-600">
                            Google: {lead.agency_reputation.google_reviews_count} recensioner
                            {lead.agency_reputation?.google_rating_avg != null &&
                              ` • ${lead.agency_reputation.google_rating_avg.toFixed(1)}/5`}
                          </p>
                        )}
                        {lead.agency_reputation?.on_warning_list && (
                          <p className="mt-0.5 font-medium text-red-700">⚠️ Finns på varningslistan</p>
                        )}
                        {lead.agency_reputation?.agency_defunct && (
                          <p className="mt-0.5 font-medium text-amber-700">Byrån är nedlagd</p>
                        )}
                        {lead.agency_reputation && !lead.agency_reputation.agency_defunct && lead.built_by_agency && (
                          <p className="mt-0.5 text-sand-500">Byrån är aktiv</p>
                        )}
                      </div>
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
                    {lead.company_info && Object.keys(lead.company_info).length > 0 && (
                      <div className="mt-2 rounded-lg border border-sand-100 bg-sand-50 p-2 text-xs">
                        <p className="font-medium text-sand-800">Företagsinfo</p>
                        <ul className="mt-1 space-y-0.5 text-sand-600">
                          {lead.company_info.org_number && (
                            <li>Org.nr: {lead.company_info.org_number}</li>
                          )}
                          {lead.company_info.revenue && (
                            <li>Omsättning: {lead.company_info.revenue}</li>
                          )}
                          {lead.company_info.employees && (
                            <li>Anställda: {lead.company_info.employees}</li>
                          )}
                          {lead.company_info.ceo && (
                            <li>VD: {lead.company_info.ceo}</li>
                          )}
                          {lead.company_info.board_members && lead.company_info.board_members.length > 0 && (
                            <li>Styrelse: {lead.company_info.board_members.join(', ')}</li>
                          )}
                          {lead.company_info.companies_owned != null && (
                            <li>Registrerade företag (ägare): {lead.company_info.companies_owned}</li>
                          )}
                          {lead.company_info.subscriptions != null && (
                            <li>Abonnemang: {lead.company_info.subscriptions}</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {lead.sales_pitch && (
                      <p className="mt-2 text-sm italic text-sand-800 line-clamp-2" title={lead.sales_pitch}>
                        {lead.sales_pitch}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCrm(lead)}
                      disabled={addingId === lead.id}
                      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                    >
                      {addingId === lead.id ? 'Lägger till…' : 'Lägg till i CRM'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setHealthCheckId(lead.id);
                        try {
                          const res = await fetch('/api/health-check', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              website: lead.website,
                              company_name: lead.company_name,
                            }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            throw new Error(err.error || 'Kunde inte generera hälsokoll');
                          }
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `halsokoll-${lead.company_name.replace(/[^a-z0-9]/gi, '-')}.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (e) {
                          alert(e instanceof Error ? e.message : 'Hälsokoll misslyckades');
                        } finally {
                          setHealthCheckId(null);
                        }
                      }}
                      disabled={healthCheckId === lead.id}
                      className="rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-xs font-medium text-sand-700 hover:bg-sand-50 disabled:opacity-50"
                    >
                      {healthCheckId === lead.id ? 'Genererar…' : 'Generera hälsokoll'}
                    </button>
                  </div>
                </div>
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
