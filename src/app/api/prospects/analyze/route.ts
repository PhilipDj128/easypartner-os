import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { searchSerp } from '@/lib/serpapi';
import Anthropic from '@anthropic-ai/sdk';
import { analyzeWebsite } from '@/lib/prospect-analyzer';
import { lookupPtsOperator, normalizePhone } from '@/lib/company-info';
import { fetchAgencyReputation, fetchTrustpilotRatingForAgency } from '@/lib/agency-reputation';
import { fetchPlaceByCompanyAndCity } from '@/lib/google-places';
import { runPageSpeed } from '@/lib/google-pagespeed';

const BLOCKED_DOMAINS = [
  'wikipedia.org',
  'blocket.se',
  'hitta.se',
  'eniro.se',
  'ratsit.se',
  'facebook.com',
  'linkedin.com',
];

const ALL_CATALOG_DOMAINS = [
  'hitta.se',
  'eniro.se',
  'merinfo.se',
  'upplysning.se',
  'ratsit.se',
  'allabolag.se',
  'foretagsinfo.se',
  'gulasidorna.se',
];
const CATALOG_DOMAINS = ['hitta.se', 'eniro.se', 'merinfo.se', 'upplysning.se'];

/** Kataloger som kräver exakt domän/org.nr-match för "Finns på" */
const STRICT_CATALOG_DOMAINS = ['hitta.se', 'eniro.se', 'merinfo.se'];

/** Svenska leadtjänster och kataloger (utan prisuppgifter) */
const LEAD_SERVICES: { domain: string; name: string }[] = [
  { domain: 'flytta.se', name: 'flytta.se' },
  { domain: 'allaflyttfirmor.se', name: 'allaflyttfirmor.se' },
  { domain: 'reco.se', name: 'reco.se' },
  { domain: 'hittaproffs.se', name: 'hittaproffs.se' },
  { domain: 'mittanbud.se', name: 'mittanbud.se' },
  { domain: 'buildingpartner.se', name: 'buildingpartner.se' },
  { domain: 'offerta.se', name: 'offerta.se' },
  { domain: 'servicefinder.se', name: 'servicefinder.se' },
  { domain: 'städa.se', name: 'städa.se' },
  { domain: 'stada.se', name: 'städa.se' },
  { domain: 'hittahem.se', name: 'hittahem.se' },
  { domain: 'kk.se', name: 'kk.se' },
  { domain: 'taskrunner.se', name: 'taskrunner.se' },
];

function isBlockedDomain(link: string): boolean {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
    return BLOCKED_DOMAINS.some((d) => host.includes(d));
  } catch {
    return true;
  }
}

function getDomain(link: string): string | null {
  try {
    return new URL(link).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

interface SerpResult {
  link?: string;
  title?: string;
  snippet?: string;
}

function parseSerpForCompany(
  nameResults: SerpResult[],
  website: string,
  siteHost: string,
  orgNumber?: string | null
): {
  poor_seo: boolean;
  pays_catalog: boolean;
  buys_leads: boolean;
  buys_leads_sites: string[];
  catalog_presence: string[];
  name_rank: number | null;
} {
  let poor_seo = true;
  let pays_catalog = false;
  const buysLeadsSites = new Set<string>();
  const catalogFound = new Set<string>();

  for (let i = 0; i < nameResults.length; i++) {
    const x = nameResults[i];
    if (!x?.link) continue;
    const d = getDomain(x.link);
    if (!d) continue;

    const combined = `${x.link || ''} ${x.title || ''} ${x.snippet || ''}`.toLowerCase();

    const isMainSite =
      d === siteHost || siteHost.endsWith(d) || d.endsWith(siteHost);
    if (isMainSite) {
      poor_seo = i >= 20;
    }

    if (CATALOG_DOMAINS.some((c) => d.includes(c))) {
      const linkLower = (x.link || '').toLowerCase();
      if (linkLower.includes(siteHost.toLowerCase().replace(/^www\./, ''))) {
        pays_catalog = true;
      }
    }

    for (const cat of ALL_CATALOG_DOMAINS) {
      if (!d.includes(cat)) continue;
      if (STRICT_CATALOG_DOMAINS.includes(cat)) {
        const siteHostNorm = siteHost.toLowerCase().replace(/^www\./, '');
        const hasDomain = combined.includes(siteHostNorm) || combined.includes(siteHost);
        const hasOrgNr = orgNumber && combined.replace(/\s/g, '').includes(orgNumber.replace(/\s/g, ''));
        if (hasDomain || hasOrgNr) {
          catalogFound.add(cat);
        }
      } else {
        catalogFound.add(cat);
      }
    }

    for (const svc of LEAD_SERVICES) {
      if (d.includes(svc.domain)) {
        buysLeadsSites.add(svc.name);
      }
    }
  }

  const buys_leads = buysLeadsSites.size > 0;
  const buys_leads_sites = Array.from(buysLeadsSites);

  const rankIdx = nameResults.findIndex((x) => {
    const d = x.link ? getDomain(x.link) : null;
    if (!d) return false;
    return d === siteHost || siteHost.endsWith(d) || d.endsWith(siteHost);
  });
  const name_rank = rankIdx >= 0 ? rankIdx + 1 : null;
  if (name_rank != null && name_rank > 0) poor_seo = name_rank >= 20;

  return {
    poor_seo,
    pays_catalog,
    buys_leads,
    buys_leads_sites,
    catalog_presence: Array.from(catalogFound),
    name_rank: name_rank != null && name_rank > 0 ? name_rank : null,
  };
}

/** Score-faktorer. Max 100. */
function calculateLeadScore(flags: {
  built_by_other?: boolean;
  runs_ads?: boolean;
  has_facebook_pixel?: boolean;
  slow_site?: boolean;
  no_mobile?: boolean;
  no_title_or_short?: boolean;
  no_meta_desc?: boolean;
  poor_seo?: boolean;
  low_ranking?: boolean;
  pays_catalog?: boolean;
  buys_leads?: boolean;
  agency_trustpilot_under_3?: boolean;
  agency_on_warning_list?: boolean;
  agency_negative_reviews_10_plus?: boolean;
  agency_defunct?: boolean;
}): number {
  let score = 0;
  if (flags.built_by_other) score += 25;
  if (flags.runs_ads) score += 20;
  if (flags.buys_leads) score += 20;
  if (flags.has_facebook_pixel) score += 15;
  if (flags.pays_catalog) score += 15;
  if (flags.slow_site) score += 20;
  if (flags.no_mobile) score += 15;
  if (flags.no_title_or_short) score += 10;
  if (flags.no_meta_desc) score += 10;
  if (flags.poor_seo) score += 20;
  if (flags.low_ranking) score += 15;
  if (flags.agency_trustpilot_under_3) score += 30;
  if (flags.agency_on_warning_list) score += 30;
  if (flags.agency_negative_reviews_10_plus) score += 20;
  if (flags.agency_defunct) score += 25;
  return Math.min(100, Math.max(1, score));
}

const ISSUE_TO_LABEL: Record<string, string> = {
  built_by_other: 'Byggd av annan byrå',
  runs_ads: 'Kör Google Ads',
  has_facebook_pixel: 'Facebook Pixel',
  pays_catalog: 'Betalar katalog',
  buys_leads: 'Köper leads',
  slow_site: 'Långsam hemsida',
  no_mobile: 'Ingen mobil',
  no_title_or_short: 'Saknar title',
  no_meta_desc: 'Saknar meta description',
  poor_seo: 'Dålig SEO',
  low_ranking: 'Låg ranking',
  bad_google_reviews: 'Dåliga Google-recensioner',
  agency_bad_reviews: 'Byrån har dåliga recensioner',
};

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json().catch(() => ({}));
        const industry = (body.industry || '').toString().trim() || 'företag';
        const city = (body.city || '').toString().trim() || 'Sverige';
        const saveToDb = body.save_to_db !== false;
        const maxResults = Math.min(Math.max(Number(body.max_results) || 20, 1), 20);

        const supabase = getSupabaseAdmin();
        if (!supabase && saveToDb) {
          send({ type: 'error', message: 'Supabase inte konfigurerad' });
          controller.close();
          return;
        }

        const serpKey = process.env.SERPAPI_KEY;
        if (!serpKey || serpKey.startsWith('din_')) {
          send({ type: 'error', message: 'SERPAPI_KEY saknas' });
          controller.close();
          return;
        }

        const q = `${industry} ${city}`;
        send({ type: 'progress', message: 'Hämtar företag...', progress: 5 });

        const serpResult = await searchSerp(q, 'Sweden', maxResults);
        const allOrgs = serpResult?.organic_results || [];
        const orgs = allOrgs
          .filter((r: { link?: string }) => r.link && !isBlockedDomain(r.link))
          .slice(0, maxResults);
        const serpAds = (serpResult?.ads ?? serpResult?.paid_results ?? []) as { link?: string; displayed_link?: string }[];
        const adLinks = serpAds.map((a) => (a.link || a.displayed_link || '').toLowerCase()).filter(Boolean);

        if (orgs.length === 0) {
          send({ type: 'done', leads: [], progress: 100 });
          controller.close();
          return;
        }

        send({ type: 'progress', message: 'Analyserar hemsidor...', progress: 15 });

        const claude =
          process.env.ANTHROPIC_API_KEY?.startsWith('sk-')
            ? new Anthropic()
            : null;

        const analyses = await Promise.all(
          orgs.map(async (r: { title?: string; link?: string }, i: number) => {
            const website = r.link || '';
            const companyName = (r.title || `Företag ${i + 1}`).replace(
              / - .*$/,
              ''
            );
            let analysis = {
              built_by_other: false,
              built_by_agency: null as string | null,
              runs_ads: false,
              has_facebook_pixel: false,
              slow_site: false,
              no_mobile: false,
              no_title_or_short: false,
              no_meta_desc: false,
              built_by_text: null as string | null,
              load_time_ms: 0,
              phones: [] as string[],
            };
            if (website) {
              try {
                analysis = await analyzeWebsite(website);
              } catch {
                analysis.slow_site = true;
              }
            }
            return { companyName, website, analysis, index: i };
          })
        );

        send({ type: 'progress', message: 'Kontrollerar kataloger, leads och domäner...', progress: 45 });

        const serpExtras = await Promise.all(
          analyses.map(async ({ companyName, website }) => {
            const empty = {
              poor_seo: false,
              pays_catalog: false,
              buys_leads: false,
              buys_leads_sites: [] as string[],
              catalog_presence: [] as string[],
              name_rank: null as number | null,
            };
            if (!companyName || !website) return empty;
            try {
              const nameSearch = await searchSerp(`"${companyName}"`, 'Sweden');
              const nameResults = (nameSearch?.organic_results || []) as SerpResult[];
              let siteHost = '';
              try {
                siteHost = new URL(website).hostname.replace(/^www\./, '');
              } catch {
                siteHost = website;
              }
              return parseSerpForCompany(nameResults, website, siteHost);
            } catch {
              return empty;
            }
          })
        );

        const savedLeads: unknown[] = [];
        const total = analyses.length;
        let doneCount = 0;

        send({ type: 'progress', message: 'Genererar säljargument...', progress: 70 });

        for (let i = 0; i < analyses.length; i++) {
          const { companyName, website, analysis, index } = analyses[i];
          const se = serpExtras[i];
          const poor_seo = se.poor_seo;
          const pays_catalog = se.pays_catalog;
          const buys_leads = se.buys_leads;
          const buys_leads_sites = se.buys_leads_sites ?? [];
          const catalog_presence = se.catalog_presence;
          const name_rank = se.name_rank;
          const industry_city_rank = index + 1;
          let siteHost = '';
          try {
            siteHost = new URL(website).hostname.replace(/^www\./, '').toLowerCase();
          } catch {
            siteHost = website.toLowerCase();
          }
          const runs_ads =
            analysis.runs_ads ||
            adLinks.some((adUrl) => adUrl.includes(siteHost));
          const low_ranking = industry_city_rank >= 4;

          const issues: string[] = [];
          if (analysis.built_by_other) issues.push('built_by_other');
          if (runs_ads) issues.push('runs_ads');
          if (analysis.has_facebook_pixel) issues.push('has_facebook_pixel');
          if (pays_catalog) issues.push('pays_catalog');
          if (buys_leads) issues.push('buys_leads');
          if (low_ranking) issues.push('low_ranking');
          if (analysis.no_mobile) issues.push('no_mobile');
          if (analysis.no_title_or_short) issues.push('no_title_or_short');
          if (analysis.no_meta_desc) issues.push('no_meta_desc');
          if (poor_seo) issues.push('poor_seo');

          const builtByAgency = analysis.built_by_agency || analysis.built_by_text;

          const allPhones = (analysis as { phones?: string[] }).phones ?? [];
          const directPhones = allPhones.filter((p) => {
            const d = p.replace(/\D/g, '');
            const norm = d.startsWith('46') ? '0' + d.slice(2) : d.startsWith('0') ? d : '0' + d;
            return /^07/.test(norm);
          });
          let contact_phone: string | null = allPhones[0] ?? null;
          let company_info: {
            google_places_name?: string | null;
            google_places_phone?: string | null;
            google_places_rating?: number | null;
            google_places_review_count?: number | null;
            pagespeed_score?: number | null;
            load_time_seconds?: number | null;
            built_by_agency?: string | null;
            agency_trustpilot_rating?: number | null;
          } = {};
          let pts_operator: string | null = null;
          let pts_is_switchboard = false;
          let pts_switchboard_provider: string | null = null;
          let slow_site = false;
          let agency_trustpilot_rating: number | null = null;
          let agency_reputation: {
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
          } | null = null;

          try {
            const [placeInfo, pageSpeedResult] = await Promise.all([
              fetchPlaceByCompanyAndCity(companyName, city),
              website ? runPageSpeed(website) : Promise.resolve({ performance_score: null, load_time_seconds: null }),
            ]);
            if (placeInfo.phone && !contact_phone) contact_phone = placeInfo.phone;
            company_info.google_places_name = placeInfo.name ?? undefined;
            company_info.google_places_phone = placeInfo.phone ?? undefined;
            company_info.google_places_rating = placeInfo.rating ?? undefined;
            company_info.google_places_review_count = placeInfo.user_ratings_total ?? undefined;
            company_info.pagespeed_score = pageSpeedResult.performance_score ?? undefined;
            company_info.load_time_seconds = pageSpeedResult.load_time_seconds ?? undefined;
            if (typeof placeInfo.rating === 'number' && placeInfo.rating < 3.5) {
              issues.push('bad_google_reviews');
            }
            if (typeof pageSpeedResult.performance_score === 'number') {
              slow_site = pageSpeedResult.performance_score < 50;
              if (slow_site) issues.push('slow_site');
            }
            company_info.built_by_agency = builtByAgency ?? undefined;
          } catch {
            //
          }

          if (builtByAgency) {
            try {
              const tp = await fetchTrustpilotRatingForAgency(builtByAgency, (query) => searchSerp(query, 'Sweden'));
              agency_trustpilot_rating = tp.rating;
              company_info.agency_trustpilot_rating = tp.rating ?? undefined;
              if (tp.rating != null && tp.rating < 3.5) {
                issues.push('agency_bad_reviews');
              }
              agency_reputation = await fetchAgencyReputation(builtByAgency, (q) => searchSerp(q, 'Sweden', 10));
            } catch {
              //
            }
          }

          if (contact_phone) {
            try {
              const norm = normalizePhone(contact_phone);
              const ptsResult = await lookupPtsOperator(norm);
              pts_operator = ptsResult.operator;
              pts_is_switchboard = ptsResult.isSwitchboard;
              pts_switchboard_provider = ptsResult.switchboardProvider ?? null;
              if (pts_is_switchboard && directPhones.length > 0) {
                contact_phone = directPhones[0];
              }
            } catch {
              //
            }
          }

          const score = calculateLeadScore({
            built_by_other: analysis.built_by_other,
            runs_ads,
            has_facebook_pixel: analysis.has_facebook_pixel,
            pays_catalog,
            buys_leads,
            slow_site,
            low_ranking,
            no_mobile: analysis.no_mobile,
            no_title_or_short: analysis.no_title_or_short,
            no_meta_desc: analysis.no_meta_desc,
            poor_seo,
            agency_trustpilot_under_3: agency_trustpilot_rating != null && agency_trustpilot_rating < 3.5,
            agency_on_warning_list: agency_reputation?.on_warning_list ?? false,
            agency_negative_reviews_10_plus: (agency_reputation?.negative_review_count ?? 0) > 10,
            agency_defunct: agency_reputation?.agency_defunct ?? false,
          });

          let sales_pitch = '';
          const dmName: string | undefined = undefined;
          if (claude && issues.length > 0) {
            try {
              const issueLabels = issues
                .map((k) => ISSUE_TO_LABEL[k] || k)
                .join(', ');
              const dmHint = dmName
                ? ` Inkludera beslutsfattaren ${dmName} i säljargumentet, t.ex. "Ring ${dmName} på ${companyName}".`
                : '';
              const msg = await claude.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 150,
                messages: [
                  {
                    role: 'user',
                    content: `Du är säljare på EasyPartner. Skriv ett konkret säljargument på svenska till ${companyName} baserat på dessa problem: ${issueLabels}. Max 2 meningar. Inga hälsningsfraser. Direkt till poängen.${dmHint}`,
                  },
                ],
              });
              const txt = (msg.content[0] as { text?: string })?.text ?? '';
              sales_pitch = txt.slice(0, 350).trim();
            } catch {
              //
            }
          }
          if (!sales_pitch && issues.length > 0) {
            const top = ISSUE_TO_LABEL[issues[0]] || issues[0];
            sales_pitch = dmName
              ? `Ring ${dmName} på ${companyName} — de behöver hjälp med ${top.toLowerCase()}.`
              : `Vi hjälper ${companyName} med ${top.toLowerCase()} och kan stärka er digitala närvaro.`;
          }

          if (pts_is_switchboard) issues.push('pts_switchboard');
          if (agency_reputation?.agency_defunct) issues.push('agency_defunct');
          if (agency_reputation?.warned) issues.push('agency_warned');
          if (agency_reputation?.hot_lead) issues.push('agency_hot_lead');

          const lead = {
            id: `analyzed-${index}-${Date.now()}`,
            company_name: companyName,
            website,
            contact_email: null as string | null,
            contact_phone: contact_phone as string | null,
            score,
            issues,
            poor_seo,
            runs_ads,
            slow_site,
            no_mobile: analysis.no_mobile,
            has_facebook_pixel: analysis.has_facebook_pixel,
            pays_catalog,
            buys_leads,
            buys_leads_sites,
            catalog_presence,
            industry_city_rank,
            name_rank,
            industry,
            city,
            company_info: Object.keys(company_info).length ? company_info : null,
            pts_operator,
            pts_is_switchboard,
            pts_switchboard_provider,
            direct_phones: pts_is_switchboard ? directPhones : [],
            agency_reputation,
            built_by: analysis.built_by_other ? 'annan_byra' : null,
            built_by_agency: analysis.built_by_agency || analysis.built_by_text || null,
            hosted_at: (analysis as { hosted_at?: string | null }).hosted_at ?? null,
            decision_makers: null,
            sales_pitch: sales_pitch || null,
          };

          if (saveToDb && supabase) {
            try {
              await supabase.from('leads').insert({
                company_name: lead.company_name,
                website: lead.website,
                contact_email: lead.contact_email,
                contact_phone: lead.contact_phone,
                score: lead.score,
                issues: lead.issues,
                built_by: lead.built_by,
                runs_ads: lead.runs_ads,
                poor_seo: lead.poor_seo,
                slow_site: lead.slow_site,
                status: 'ny',
                notes: lead.sales_pitch,
              });
            } catch (err) {
              console.error('[prospects/analyze] insert lead', err);
            }
          }

          savedLeads.push(lead);
          doneCount++;
          const prog = 70 + Math.floor((doneCount / total) * 28);
          send({
            type: 'lead',
            lead,
            progress: Math.min(98, prog),
          });
        }

        send({ type: 'done', leads: savedLeads, progress: 100 });
      } catch (err) {
        console.error('[prospects/analyze]', err);
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'Okänt fel',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
