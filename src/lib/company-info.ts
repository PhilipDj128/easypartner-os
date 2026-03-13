/**
 * Företagsinformation från allabolag, merinfo, PTS m.m.
 */

export interface CompanyInfo {
  org_number: string | null;
  revenue: string | null;
  employees: string | null;
  ceo: string | null;
  board_members: string[];
  companies_owned: number | null;
  subscriptions: number | null;
}

/** Svenska telefonnummer: 07X-XXX XX XX, 08-XXX XX XX, 0X-XX XX XX */
const PHONE_REGEX = /0[1-9][0-9][\s\-]?[0-9]{2,3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g;

export function extractPhonesFromHtml(html: string): string[] {
  const matches = html.match(PHONE_REGEX) || [];
  const normalized = matches.map((m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 11 ? digits : '';
  }).filter(Boolean);
  return [...new Set(normalized)];
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('46') && digits.length >= 10) {
    return '0' + digits.slice(2);
  }
  return digits.startsWith('0') ? digits : '0' + digits;
}

/** Slå upp operatör på PTS nummer.pts.se */
export async function lookupPtsOperator(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('46') ? '0' + digits.slice(2) : digits.startsWith('0') ? digits : '0' + digits;
  if (normalized.length < 9) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://nummer.pts.se/NbrSearch/Search?SearchString=${encodeURIComponent(normalized)}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EasyPartnerBot/1.0; +https://easypartner.se)',
        },
        redirect: 'follow',
      }
    );
    clearTimeout(t);
    const html = await res.text();
    const operatorMatch = html.match(/operatör[:\s]+([^<]+)/i) || html.match(/(Telia|Tele2|Telenor|Tre|Comviq|Halebop|Hallon|Vimla)[^<]*/i);
    if (operatorMatch) {
      return operatorMatch[1].trim().replace(/\s+/g, ' ').slice(0, 50);
    }
    return null;
  } catch {
    return null;
  }
}

/** Hämta företagsinfo från allabolag.se (org-nummer krävs) */
export async function fetchAllabolag(orgNumber: string): Promise<Partial<CompanyInfo>> {
  const clean = orgNumber.replace(/\D/g, '');
  if (clean.length < 6) return {};
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`https://www.allabolag.se/${clean}/`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(t);
    const html = await res.text();
    const info: Partial<CompanyInfo> = { org_number: orgNumber.replace(/\D/g, '').replace(/(\d{6})(\d{4})/, '$1-$2') };
    const revMatch = html.match(/Omsättning\s+20\d{2}[^<]*?([\d\s]+)/i) || html.match(/omsättning[^<]*?([\d\s]+)\s*(?:tkr|Mkr|000)/i);
    if (revMatch) info.revenue = revMatch[1].trim().replace(/\s+/g, ' ') + ' (senaste år)';
    const empMatch = html.match(/Anställda\s*(\d+)/i) || html.match(/antal\s+anställda[^<]*?(\d+)/i);
    if (empMatch) info.employees = empMatch[1];
    const vdMatch = html.match(/Verkställande\s+direktör[^<]*?([A-ZÅÄÖa-zåäö\s]+?)(?:<\/a>|\(f\s+\d)/i) || html.match(/VD[^<]*?([A-ZÅÄÖa-zåäö\s]+?)(?:<|\(f)/i);
    if (vdMatch) info.ceo = vdMatch[1].trim().replace(/\s+/g, ' ').slice(0, 80);
    return info;
  } catch {
    return {};
  }
}

/** Sök merinfo.se efter företagsnamn, returnera org-nr och telefon */
export async function searchMerinfo(companyName: string): Promise<{ orgNumber: string | null; phone: string | null; subscriptions?: number }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://www.merinfo.se/search?q=${encodeURIComponent(companyName)}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    clearTimeout(t);
    const html = await res.text();
    const orgMatch = html.match(/(\d{6}[\-\s]?\d{4})/);
    const phoneMatch = html.match(/(0[78][0-9][\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2})/);
    const subMatch = html.match(/(\d+)\s*abonnemang/i);
    return {
      orgNumber: orgMatch ? orgMatch[1].replace(/\D/g, '') : null,
      phone: phoneMatch ? phoneMatch[1].replace(/\s/g, '-') : null,
      subscriptions: subMatch ? parseInt(subMatch[1], 10) : undefined,
    };
  } catch {
    return { orgNumber: null, phone: null };
  }
}
