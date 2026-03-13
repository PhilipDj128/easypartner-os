import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { searchSerp } from '@/lib/serpapi';
import { perplexitySearch } from '@/lib/perplexity';
import Anthropic from '@anthropic-ai/sdk';
import { analyzeWebsite } from '@/lib/prospect-analyzer';

const BLOCKED_DOMAINS = [
  'wikipedia.org',
  'blocket.se',
  'hitta.se',
  'eniro.se',
  'ratsit.se',
  'facebook.com',
  'linkedin.com',
];

function isBlockedDomain(link: string): boolean {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
    return BLOCKED_DOMAINS.some((d) => host.includes(d));
  } catch {
    return true;
  }
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
}): number {
  let score = 0;
  if (flags.built_by_other) score += 25;
  if (flags.runs_ads) score += 20;
  if (flags.has_facebook_pixel) score += 15;
  if (flags.slow_site) score += 20;
  if (flags.no_mobile) score += 15;
  if (flags.no_title_or_short) score += 10;
  if (flags.no_meta_desc) score += 10;
  if (flags.poor_seo) score += 20;
  return Math.min(100, Math.max(1, score));
}

const ISSUE_TO_LABEL: Record<string, string> = {
  built_by_other: 'Byggd av annan byrå',
  runs_ads: 'Google Ads',
  has_facebook_pixel: 'Facebook Pixel',
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
              runs_ads: false,
              has_facebook_pixel: false,
              slow_site: false,
              no_mobile: false,
              no_title_or_short: false,
              no_meta_desc: false,
              built_by_text: null as string | null,
              load_time_ms: 0,
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

        send({ type: 'progress', message: 'Kontrollerar SEO-ranking...', progress: 50 });

        const rankChecks = await Promise.all(
          analyses.map(async ({ companyName, website }) => {
            let poor_seo = false;
            if (companyName && website) {
              try {
                const nameSearch = await searchSerp(`"${companyName}"`, 'Sweden');
                const nameResults = nameSearch?.organic_results || [];
                let siteHost = '';
                try {
                  siteHost = new URL(website).hostname.replace(/^www\./, '');
                } catch {
                  siteHost = website;
                }
                const selfRank = nameResults.findIndex((x: { link?: string }) => {
                  if (!x.link) return false;
                  try {
                    const h = new URL(x.link).hostname.replace(/^www\./, '');
                    return (
                      h === siteHost ||
                      siteHost.endsWith(h) ||
                      h.endsWith(siteHost)
                    );
                  } catch {
                    return false;
                  }
                });
                poor_seo = selfRank < 0 || selfRank >= 20;
              } catch {
                //
              }
            }
            return poor_seo;
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
          const poor_seo = rankChecks[i];
          let runs_ads = analysis.runs_ads;
          const perplexityInfo = perplexityInfoMap[index] || '';
          if (/ja|kör|har ads|google ads/i.test(perplexityInfo)) {
            runs_ads = true;
          }

          const issues: string[] = [];
          if (analysis.built_by_other) issues.push('built_by_other');
          if (runs_ads) issues.push('runs_ads');
          if (analysis.has_facebook_pixel) issues.push('has_facebook_pixel');
          if (analysis.slow_site) issues.push('slow_site');
          if (analysis.no_mobile) issues.push('no_mobile');
          if (analysis.no_title_or_short) issues.push('no_title_or_short');
          if (analysis.no_meta_desc) issues.push('no_meta_desc');
          if (poor_seo) issues.push('poor_seo');

          const score = calculateLeadScore({
            built_by_other: analysis.built_by_other,
            runs_ads,
            has_facebook_pixel: analysis.has_facebook_pixel,
            slow_site: analysis.slow_site,
            no_mobile: analysis.no_mobile,
            no_title_or_short: analysis.no_title_or_short,
            no_meta_desc: analysis.no_meta_desc,
            poor_seo,
          });

          let sales_pitch = '';
          if (claude && issues.length > 0) {
            try {
              const issueLabels = issues
                .map((k) => ISSUE_TO_LABEL[k] || k)
                .join(', ');
              const msg = await claude.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 120,
                messages: [
                  {
                    role: 'user',
                    content: `Du är säljare på EasyPartner. Skriv ett konkret säljargument på svenska till ${companyName} baserat på dessa problem: ${issueLabels}. Max 2 meningar. Inga hälsningsfraser. Direkt till poängen.`,
                  },
                ],
              });
              const txt = (msg.content[0] as { text?: string })?.text ?? '';
              sales_pitch = txt.slice(0, 300).trim();
            } catch {
              //
            }
          }

          const lead = {
            id: `analyzed-${index}-${Date.now()}`,
            company_name: companyName,
            website,
            contact_email: null as string | null,
            contact_phone: null as string | null,
            score,
            issues,
            poor_seo,
            runs_ads,
            slow_site: analysis.slow_site,
            no_mobile: analysis.no_mobile,
            has_facebook_pixel: analysis.has_facebook_pixel,
            built_by: analysis.built_by_other ? 'annan_byra' : null,
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
