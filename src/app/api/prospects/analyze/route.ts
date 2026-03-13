import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { searchSerp } from '@/lib/serpapi';
import { perplexitySearch } from '@/lib/perplexity';
import Anthropic from '@anthropic-ai/sdk';
import { analyzeWebsite } from '@/lib/prospect-analyzer';
import {
  lookupPtsOperator,
  searchMerinfo,
  fetchAllabolag,
  normalizePhone,
} from '@/lib/company-info';
import { fetchRoaringCompanyInfo } from '@/lib/roaring';
import { fetchAgencyReputation } from '@/lib/agency-reputation';
import { searchDecisionMakers } from '@/lib/linkedin-search';

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
const LEAD_SERVICE_DOMAINS = ['offerta.se', 'städa.se', 'stada.se', 'servicefinder.se', 'hittahem.se'];

const SKIP_FOR_EXTRA_DOMAINS = [
  ...BLOCKED_DOMAINS,
  ...ALL_CATALOG_DOMAINS,
  ...LEAD_SERVICE_DOMAINS,
  'google.com',
  'youtube.com',
  'twitter.com',
  'instagram.com',
  'maps.google',
  'youtu.be',
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

function parseSerpForCompany(
  nameResults: { link?: string }[],
  website: string,
  siteHost: string
): {
  poor_seo: boolean;
  pays_catalog: boolean;
  buys_leads: boolean;
  extra_domains: string[];
  catalog_presence: string[];
  name_rank: number | null;
} {
  let poor_seo = true;
  let pays_catalog = false;
  let buys_leads = false;
  let name_rank: number | null = null;
  const domainSet = new Set<string>();
  const catalogFound = new Set<string>();

  for (let i = 0; i < nameResults.length; i++) {
    const x = nameResults[i];
    if (!x?.link) continue;
    const d = getDomain(x.link);
    if (!d) continue;

    const isMainSite =
      d === siteHost || siteHost.endsWith(d) || d.endsWith(siteHost);
    if (isMainSite) {
      poor_seo = i >= 20;
      name_rank = i + 1;
    }
    if (CATALOG_DOMAINS.some((c) => d.includes(c))) pays_catalog = true;
    for (const cat of ALL_CATALOG_DOMAINS) {
      if (d.includes(cat)) catalogFound.add(cat);
    }
    if (LEAD_SERVICE_DOMAINS.some((c) => d.includes(c))) buys_leads = true;
    if (
      !isMainSite &&
      !SKIP_FOR_EXTRA_DOMAINS.some((s) => d.includes(s)) &&
      d.length > 4
    ) {
      domainSet.add(d);
    }
  }

  const extra_domains = Array.from(domainSet).slice(0, 5);
  return {
    poor_seo,
    pays_catalog,
    buys_leads,
    extra_domains,
    catalog_presence: Array.from(catalogFound),
    name_rank,
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
  pays_catalog?: boolean;
  buys_leads?: boolean;
  extra_domains_count?: number;
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
  score += Math.min(50, (flags.extra_domains_count || 0) * 10);
  if (flags.agency_trustpilot_under_3) score += 30;
  if (flags.agency_on_warning_list) score += 30;
  if (flags.agency_negative_reviews_10_plus) score += 20;
  if (flags.agency_defunct) score += 25;
  return Math.min(100, Math.max(1, score));
}

const ISSUE_TO_LABEL: Record<string, string> = {
  built_by_other: 'Byggd av annan byrå',
  runs_ads: 'Google Ads',
  has_facebook_pixel: 'Facebook Pixel',
  pays_catalog: 'Betalar katalog',
  buys_leads: 'Köper leads',
  slow_site: 'Långsam sida',
  no_mobile: 'Ingen mobil',
  no_title_or_short: 'Saknar title',
  no_meta_desc: 'Saknar meta description',
  poor_seo: 'Dålig SEO',
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

        const supabase = getSupabaseAdmin();
        if (!supabase) {
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

        const serpResult = await searchSerp(q, 'Sweden', 20);
        const allOrgs = serpResult?.organic_results || [];
        const orgs = allOrgs
          .filter((r: { link?: string }) => r.link && !isBlockedDomain(r.link))
          .slice(0, 20);

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
              extra_domains: [] as string[],
              catalog_presence: [] as string[],
              name_rank: null as number | null,
            };
            if (!companyName || !website) return empty;
            try {
              const nameSearch = await searchSerp(`"${companyName}"`, 'Sweden');
              const nameResults = nameSearch?.organic_results || [];
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

        let perplexityInfoMap: Record<number, string> = {};
        if (
          process.env.PERPLEXITY_API_KEY &&
          !process.env.PERPLEXITY_API_KEY.startsWith('din_')
        ) {
          const pResults = await Promise.all(
            analyses.map(({ companyName, website }) =>
              perplexitySearch(
                `Har ${companyName} (${website}) Google Ads eller annan digital marknadsföring? Svara kort ja eller nej på svenska.`
              ).catch(() => null)
            )
          );
          perplexityInfoMap = Object.fromEntries(
            analyses.map((_, i) => [
              i,
              (pResults[i]?.choices?.[0]?.message?.content as string) || '',
            ])
          );
        }

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
          const extra_domains = se.extra_domains;
          const catalog_presence = se.catalog_presence;
          const name_rank = se.name_rank;
          const industry_city_rank = index + 1;
          let runs_ads = analysis.runs_ads;
          const perplexityInfo = perplexityInfoMap[index] || '';
          if (/ja|kör|har ads|google ads/i.test(perplexityInfo)) {
            runs_ads = true;
          }

          const issues: string[] = [];
          if (analysis.built_by_other) issues.push('built_by_other');
          if (runs_ads) issues.push('runs_ads');
          if (analysis.has_facebook_pixel) issues.push('has_facebook_pixel');
          if (pays_catalog) issues.push('pays_catalog');
          if (buys_leads) issues.push('buys_leads');
          if (analysis.slow_site) issues.push('slow_site');
          if (analysis.no_mobile) issues.push('no_mobile');
          if (analysis.no_title_or_short) issues.push('no_title_or_short');
          if (analysis.no_meta_desc) issues.push('no_meta_desc');
          if (poor_seo) issues.push('poor_seo');

          const builtByAgency = analysis.built_by_agency || analysis.built_by_text;

          let decision_makers: { name: string; title: string; linkedin_url: string }[] = [];
          try {
            decision_makers = await searchDecisionMakers(companyName);
          } catch {
            //
          }

          const vdFound = decision_makers.some((dm) => /vd|ceo|chief\s+executive/i.test(dm.title));
          if (vdFound) issues.push('vd_hittad');

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

          if (builtByAgency) {
            try {
              agency_reputation = await fetchAgencyReputation(
                builtByAgency,
                (q) => searchSerp(q, 'Sweden', 10)
              );
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
            slow_site: analysis.slow_site,
            no_mobile: analysis.no_mobile,
            no_title_or_short: analysis.no_title_or_short,
            no_meta_desc: analysis.no_meta_desc,
            poor_seo,
            extra_domains_count: extra_domains.length,
            agency_trustpilot_under_3: agency_reputation?.trustpilot_rating != null && agency_reputation.trustpilot_rating < 3,
            agency_on_warning_list: agency_reputation?.on_warning_list ?? false,
            agency_negative_reviews_10_plus: (agency_reputation?.negative_review_count ?? 0) > 10,
            agency_defunct: agency_reputation?.agency_defunct ?? false,
          });

          let sales_pitch = '';
          const dmName = decision_makers.find((dm) => /vd|ceo|chief/i.test(dm.title))?.name;
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

          const allPhones = (analysis as { phones?: string[] }).phones ?? [];
          const directPhones = allPhones.filter((p) => {
            const d = p.replace(/\D/g, '');
            const norm = d.startsWith('46') ? '0' + d.slice(2) : d.startsWith('0') ? d : '0' + d;
            return /^07/.test(norm);
          });
          let contact_phone: string | null = allPhones[0] ?? null;
          let company_info: {
            org_number?: string | null;
            revenue?: string | null;
            employees?: string | null;
            ceo?: string | null;
            board_members?: string[];
            companies_owned?: number | null;
            subscriptions?: number | null;
            active?: boolean;
          } = {};
          let pts_operator: string | null = null;
          let pts_is_switchboard = false;
          let pts_switchboard_provider: string | null = null;

          try {
            const merinfo = await searchMerinfo(companyName);
            if (merinfo.phone && !contact_phone) contact_phone = merinfo.phone;
            if (merinfo.subscriptions != null) company_info.subscriptions = merinfo.subscriptions;
            if (merinfo.orgNumber) {
              company_info.org_number = merinfo.orgNumber;
              const allabolag = await fetchAllabolag(merinfo.orgNumber);
              company_info = { ...company_info, ...allabolag };
            }
            const roaring = await fetchRoaringCompanyInfo(companyName, company_info.org_number ?? merinfo.orgNumber);
            if (roaring) {
              if (roaring.org_number) company_info.org_number = roaring.org_number;
              if (roaring.revenue) company_info.revenue = roaring.revenue;
              if (roaring.employees) company_info.employees = roaring.employees;
              if (roaring.ceo) company_info.ceo = roaring.ceo;
              if (roaring.board_members?.length) company_info.board_members = roaring.board_members;
              company_info.active = roaring.active;
            }
            if (contact_phone) {
              const norm = normalizePhone(contact_phone);
              const ptsResult = await lookupPtsOperator(norm);
              pts_operator = ptsResult.operator;
              pts_is_switchboard = ptsResult.isSwitchboard;
              pts_switchboard_provider = ptsResult.switchboardProvider ?? null;
              if (pts_is_switchboard && directPhones.length > 0) {
                contact_phone = directPhones[0];
              }
            }
          } catch {
            //
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
            slow_site: analysis.slow_site,
            no_mobile: analysis.no_mobile,
            has_facebook_pixel: analysis.has_facebook_pixel,
            pays_catalog,
            buys_leads,
            extra_domains,
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
            decision_makers: decision_makers.length > 0 ? decision_makers : null,
            sales_pitch: sales_pitch || null,
          };

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
              status: 'new',
              notes: lead.sales_pitch,
            });
          } catch (err) {
            console.error('[prospects/analyze] insert lead', err);
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
