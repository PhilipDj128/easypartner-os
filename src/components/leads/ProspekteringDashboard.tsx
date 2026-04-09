'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScoreCircle } from './ScoreCircle';
import { SpeedBar } from '@/components/ui/SpeedBar';

interface CompanyInfo {
  google_places_name?: string | null;
  google_places_phone?: string | null;
  google_places_rating?: number | null;
  google_places_review_count?: number | null;
  pagespeed_score?: number | null;
  load_time_seconds?: number | null;
  built_by_agency?: string | null;
  agency_trustpilot_rating?: number | null;
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
  buys_leads_sites?: string[];
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
  runs_ads: 'Kör Google Ads',
  has_facebook_pixel: 'Kör Facebook-annonsering',
  pays_catalog: 'Betalar katalog',
  buys_leads: 'Köper leads',
  slow_site: 'Långsam hemsida',
  no_mobile: 'Ingen mobil',
  no_title_or_short: 'Saknar title',
  poor_seo_meta: 'Dålig SEO-meta',
  no_meta_desc: 'Saknar meta',
  built_by_other: 'Byggd av annan byrå',
  low_ranking: 'Låg ranking',
  bad_google_reviews: 'Dåliga Google-recensioner',
  agency_bad_reviews: 'Byrån har dåliga recensioner',
  pts_switchboard: 'Växel',
  agency_warned: 'Varning: Byrån har dåliga recensioner',
  agency_hot_lead: 'Missnöjd med byrå',
  agency_defunct: 'Byrån är nedlagd',
  vd_hittad: 'VD hittad',
};

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500/20 text-emerald-400';
  if (score >= 40) return 'bg-amber-500/20 text-amber-400';
  return 'badge-gray';
}

function getPriorityStar(score: number): { icon: string; title: string; color: string } {
  if (score >= 70) return { icon: '★', title: 'Prioritet: Hög', color: 'text-emerald-400' };
  if (score >= 40) return { icon: '★', title: 'Prioritet: Medel', color: 'text-amber-400' };
  return { icon: '☆', title: 'Prioritet: Låg', color: 'text-[var(--muted)]' };
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
  const [maxResults, setMaxResults] = useState(10);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [filterHighScore, setFilterHighScore] = useState(false);
  const [monitoringRunning, setMonitoringRunning] = useState(false);
  const [healthCheckId, setHealthCheckId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState('');

  // Fetch remaining searches on mount and after each search
  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/prospects/usage');
      if (res.ok) {
        const data = await res.json();
        setRemaining(data.remaining ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const [errorMessage, setErrorMessage] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setLeads([]);
    setProgress(0);
    setErrorMessage('');
    setLoadingMessage('Startar prospektering...');
    try {
      const res = await fetch('/api/prospects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: industry || 'städfirma', city: city || 'Västerås', max_results: maxResults }),
      });
      if (!res.ok) {
        setErrorMessage(`API returnerade ${res.status}: ${res.statusText}`);
        setProgress(0);
        setLoadingMessage('');
        setLoading(false);
        return;
      }
      if (!res.body) {
        setErrorMessage('Kunde inte läsa svar från API (ingen body)');
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
                setErrorMessage(data.message || 'Ett fel inträffade');
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
      if (newLeads.length === 0) {
        setErrorMessage('Inga leads hittades. Testa en annan bransch eller stad.');
      }
      setLeads(newLeads);
      setLoadingMessage('');
      fetchUsage();
      router.refresh();
    } catch (err) {
      setErrorMessage(`Nätverksfel: ${err instanceof Error ? err.message : 'Okänt fel'}`);
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
      <div className="card p-6">
        <h3 className="font-heading text-lg font-semibold text-[var(--foreground)]">Sök leads</h3>
        <div className="mt-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)]">Bransch</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="t.ex. städfirma"
              className="mt-1 w-48 rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[indigo-400] focus:outline-none focus:ring-1 focus:ring-[indigo-400]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)]">Stad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="t.ex. Västerås"
              className="mt-1 w-48 rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[indigo-400] focus:outline-none focus:ring-1 focus:ring-[indigo-400]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--muted-foreground)]">Antal</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="mt-1 w-24 rounded-lg border border-[var(--border)] bg-white/5 px-4 py-2.5 text-[var(--foreground)] focus:border-[indigo-400] focus:outline-none focus:ring-1 focus:ring-[indigo-400]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
          {remaining !== null && (
            <div className="flex items-end">
              <span className={`text-sm font-medium ${remaining === 0 ? 'text-rose-400' : 'text-[var(--muted-foreground)]'}`}>
                {remaining}/100 sökningar kvar idag
              </span>
            </div>
          )}
          <div className="flex items-end gap-4">
            <button
              type="button"
              disabled={loading || remaining === 0}
              onClick={handleSearch}
              className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
            >
              {loading ? 'Analyserar…' : remaining === 0 ? 'Gräns nådd' : 'Starta prospektering'}
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
              className="rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all duration-150 hover:bg-white/5 disabled:opacity-50"
            >
              {monitoringRunning ? 'Kör bevakning…' : 'Starta bevakning'}
            </button>
          </div>
          {errorMessage && (
            <div className="mt-4 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
              {errorMessage}
            </div>
          )}
          {loading && (
            <div className="mt-4 w-full">
              <div className="flex items-center justify-between gap-2 text-sm text-[var(--muted-foreground)]">
                <span>{loadingMessage}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[indigo-400] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {leads.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-heading text-lg font-semibold text-[var(--foreground)]">Resultat</h3>
            <label className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <input
                type="checkbox"
                checked={filterHighScore}
                onChange={(e) => setFilterHighScore(e.target.checked)}
                className="rounded border-[var(--border)] bg-white/5"
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
                className={`card overflow-hidden rounded-xl transition-all duration-150 hover:border-white/[0.12] ${
                  lead.agency_reputation?.on_warning_list ? 'border-rose-500/30' : ''
                }`}
              >
                {(lead.agency_reputation?.on_warning_list ||
                  (lead.agency_reputation?.trustpilot_rating != null && lead.agency_reputation.trustpilot_rating < 3)) && (
                  <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400">
                    ⚠️ Varning: Byrån har dåliga recensioner
                  </div>
                )}
                {lead.agency_reputation?.agency_defunct && (
                  <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400">
                    Byrån är nedlagd — kunden har ingen support
                  </div>
                )}
                {lead.agency_reputation?.hot_lead && (
                  <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-400">
                    🔥 Missnöjd med sin byrå — ring idag
                  </div>
                )}
                <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <ScoreCircle score={lead.score} size={44} />
                      <div>
                        <span title={priority.title} className={`text-sm ${priority.color}`}>
                          {priority.icon}
                        </span>
                        <h4 className="font-medium text-[var(--foreground)] truncate">{lead.company_name}</h4>
                      </div>
                    </div>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-sm text-[indigo-400] hover:underline"
                    >
                      {lead.website}
                    </a>
                    {(lead.contact_phone && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={`tel:${lead.contact_phone.replace(/\D/g, '').replace(/^0/, '+46')}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
                        >
                          <span>📞</span>
                          {formatPhone(lead.contact_phone)}
                        </a>
                        <a
                          href={`tel:${lead.contact_phone.replace(/\D/g, '').replace(/^0/, '+46')}`}
                          className="rounded bg-emerald-500/30 px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/40"
                        >
                          Ring nu
                        </a>
                        {lead.pts_operator && (
                          <span className="text-xs text-[var(--muted-foreground)]">Operatör: {lead.pts_operator}</span>
                        )}
                        {lead.pts_is_switchboard && lead.pts_switchboard_provider && (
                          <span className="inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                            Växel: {lead.pts_switchboard_provider}
                          </span>
                        )}
                        {lead.pts_is_switchboard && lead.direct_phones && lead.direct_phones.length > 0 && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Direktnummer: {lead.direct_phones.slice(0, 2).map(formatPhone).join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                    {(lead.name_rank || lead.industry_city_rank) && (
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                        <span className="font-medium text-[var(--foreground)]/90">Google-ranking:</span>{' '}
                        {lead.name_rank && `#${lead.name_rank} för "${lead.company_name}"`}
                        {lead.name_rank && lead.industry_city_rank && ' • '}
                        {lead.industry_city_rank && lead.industry && lead.city && (
                          <>#{lead.industry_city_rank} för &quot;{lead.industry} {lead.city}&quot;</>
                        )}
                      </p>
                    )}
                    {lead.catalog_presence && lead.catalog_presence.length > 0 && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        <span className="font-medium text-[var(--foreground)]/90">Finns på:</span> {lead.catalog_presence.join(', ')}
                      </p>
                    )}
                    {lead.hosted_at && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        <span className="font-medium text-[var(--foreground)]/90">Hostad på:</span>{' '}
                        <span className="inline-flex rounded bg-white/10 px-1.5 py-0.5 font-medium text-[var(--muted-foreground)]">
                          {lead.hosted_at}
                        </span>
                      </p>
                    )}
                    {lead.decision_makers && lead.decision_makers.length > 0 && (
                      <div className="mt-2 rounded-lg rounded-lg border border-[var(--border)] bg-white/5 p-2 text-xs">
                        <p className="font-medium text-[var(--foreground)]/90">Beslutsfattare</p>
                        <ul className="mt-1 space-y-1">
                          {lead.decision_makers.map((dm, i) => (
                            <li key={i} className="text-[var(--muted-foreground)]">
                              {dm.linkedin_url ? (
                                <a
                                  href={dm.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-[indigo-400] hover:underline"
                                >
                                  {dm.name}
                                </a>
                              ) : (
                                <span className="font-medium text-[var(--foreground)]">{dm.name}</span>
                              )}
                              {' — '}
                              <span>{dm.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getIssueBadges(lead).map((key) => (
                        <span
                          key={key}
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            key === 'agency_warned' ? 'bg-rose-500/20 text-rose-400' :
                            key === 'agency_defunct' ? 'bg-amber-500/20 text-amber-400' :
                            key === 'pts_switchboard' && lead.pts_switchboard_provider
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-white/10 text-[var(--muted-foreground)]'
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
                    {((lead.pays_catalog || lead.buys_leads) &&
                      ((lead.catalog_presence?.length ?? 0) > 0 || (lead.buys_leads_sites?.length ?? 0) > 0)) && (
                      <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                        <p className="font-medium text-[var(--foreground)]/90">Betalar för:</p>
                        <ul className="mt-1 list-inside list-disc space-y-0.5">
                          {[...new Set([...(lead.catalog_presence ?? []), ...(lead.buys_leads_sites ?? [])])]
                            .filter(Boolean)
                            .map((name) => (
                              <li key={name}>{name}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                    {(lead.agency_reputation || lead.built_by_agency) && (
                      <div className="mt-2 rounded-lg rounded-lg border border-[var(--border)] bg-white/5 p-2 text-xs">
                        <p className="font-medium text-[var(--foreground)]/90">Byråanalys</p>
                        <p className="mt-1 text-[var(--muted-foreground)]">
                          <span className="font-medium text-[var(--foreground)]/80">Byrå:</span> {lead.built_by_agency || '—'}
                        </p>
                        {lead.agency_reputation?.trustpilot_rating != null && (
                          <p className="mt-0.5 text-[var(--muted-foreground)]">
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
                            className="mt-1 inline-block text-[indigo-400] hover:underline"
                          >
                            Se Trustpilot →
                          </a>
                        )}
                        {lead.agency_reputation?.google_reviews_count != null && (
                          <p className="mt-0.5 text-[var(--muted-foreground)]">
                            Google: {lead.agency_reputation.google_reviews_count} recensioner
                            {lead.agency_reputation?.google_rating_avg != null &&
                              ` • ${lead.agency_reputation.google_rating_avg.toFixed(1)}/5`}
                          </p>
                        )}
                        {lead.agency_reputation?.on_warning_list && (
                          <p className="mt-0.5 font-medium text-rose-400">⚠️ Finns på varningslistan</p>
                        )}
                        {lead.agency_reputation?.agency_defunct && (
                          <p className="mt-0.5 font-medium text-amber-400">Byrån är nedlagd</p>
                        )}
                        {lead.agency_reputation && !lead.agency_reputation.agency_defunct && lead.built_by_agency && (
                          <p className="mt-0.5 text-[var(--muted-foreground)]">Byrån är aktiv</p>
                        )}
                      </div>
                    )}
                    {lead.company_info && Object.keys(lead.company_info).length > 0 && (
                      <div className="mt-2 rounded-lg rounded-lg border border-[var(--border)] bg-white/5 p-2 text-xs">
                        <p className="font-medium text-[var(--foreground)]/90">Företagsinfo</p>
                        <ul className="mt-1 space-y-0.5 text-[var(--muted-foreground)]">
                          {lead.company_info.google_places_name && (
                            <li>Google: {lead.company_info.google_places_name}</li>
                          )}
                          {lead.company_info.google_places_phone && (
                            <li>Telefon: {lead.company_info.google_places_phone}</li>
                          )}
                          {lead.company_info.google_places_rating != null && (
                            <li>Betyg: {lead.company_info.google_places_rating} ★{lead.company_info.google_places_review_count != null ? ` (${lead.company_info.google_places_review_count} recensioner)` : ''}</li>
                          )}
                          {lead.company_info.pagespeed_score != null && (
                            <li className="flex items-center gap-2">
                              <span>PageSpeed: {lead.company_info.pagespeed_score}/100{lead.company_info.load_time_seconds != null ? `, ${lead.company_info.load_time_seconds} s` : ''}</span>
                              <SpeedBar value={lead.company_info.pagespeed_score} />
                            </li>
                          )}
                          {lead.company_info.built_by_agency && (
                            <li>Byggd av: {lead.company_info.built_by_agency}</li>
                          )}
                          {lead.company_info.agency_trustpilot_rating != null && (
                            <li>Byråns Trustpilot: {lead.company_info.agency_trustpilot_rating}/5</li>
                          )}
                        </ul>
                      </div>
                    )}
                    {lead.sales_pitch && (
                      <p className="mt-2 text-sm italic text-[var(--muted-foreground)] line-clamp-2" title={lead.sales_pitch}>
                        {lead.sales_pitch}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCrm(lead)}
                      disabled={addingId === lead.id}
                      className="btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
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
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all duration-150 hover:bg-white/5 disabled:opacity-50"
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
            <p className="text-center text-sm text-[var(--muted-foreground)]">Inga leads med score 70+</p>
          )}
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div className="card rounded-xl p-12 text-center">
          <p className="text-[var(--muted-foreground)]">
            Ange bransch och stad, klicka på &quot;Starta prospektering&quot; för att söka leads.
          </p>
        </div>
      )}
    </div>
  );
}
