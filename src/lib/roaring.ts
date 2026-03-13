/**
 * Roaring.io API-integration för svensk företagsdata.
 * Läs ROARING_CLIENT_ID och ROARING_CLIENT_SECRET från miljövariabler.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.ROARING_CLIENT_ID;
  const clientSecret = process.env.ROARING_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://api.roaring.io/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (data.access_token) {
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      return data.access_token;
    }
  } catch {
    //
  }
  return null;
}

export interface RoaringCompanyInfo {
  org_number: string | null;
  revenue: string | null;
  employees: string | null;
  ceo: string | null;
  board_members: string[];
  registration_date: string | null;
  active: boolean;
}

function formatRevenueKr(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '';
  return new Intl.NumberFormat('sv-SE', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value) + ' kr';
}

/** Extrahera sökterm från domän: ta bort TLD, ersätt bindestreck med mellanslag */
export function extractSearchNameFromDomain(website: string): string {
  try {
    const host = new URL(website).hostname.replace(/^www\./, '').toLowerCase();
    const parts = host.split('.');
    const namePart = parts[0] ?? '';
    return namePart.replace(/-/g, ' ').trim() || '';
  } catch {
    return '';
  }
}

/** Org.nr för kända felaktiga träffar (t.ex. kommuner som dyker upp vid städ-sökningar) */
const BLOCKED_ORG_NUMBERS = new Set(['2265716567']); // Västerås stad

/** Normalisera för jämförelse: åäö -> aao, små bokstäver */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/\s+/g, '')
    .replace(/\W/g, '');
}

/** Undvik kommuner/regioner som felaktiga träffar vid städ/hem-sökningar */
function looksLikeMunicipality(companyName: string): boolean {
  const n = String(companyName).toLowerCase();
  return /\b(stad|kommun|region|län)\s*$/i.test(n) || /^(västerås|stockholm|göteborg|malmö)\s+stad$/i.test(n);
}

/** Sök företag via namn, returnera org.nr + företagsnamn för validering */
export async function searchRoaringCompany(
  name: string
): Promise<{ org: string; companyName: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;
  if (!name || name.length < 2) return null;

  try {
    const url = `https://api.roaring.io/se/company/search?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as Record<string, unknown>;
    const hits = (data?.hits ?? data?.companies ?? data?.results) as Array<Record<string, unknown>> | undefined;
    const first = hits?.[0];
    if (!first) return null;

    const org = (first?.organizationNumber ?? first?.organization_number ?? first?.companyId ?? first?.company_id) as string | undefined;
    if (!org) return null;
    const orgClean = String(org).replace(/\D/g, '');
    if (BLOCKED_ORG_NUMBERS.has(orgClean)) return null;

    const companyName = (first?.companyName ?? first?.company_name ?? first?.name ?? '') as string;
    const companyNameStr = String(companyName || '').trim();
    if (looksLikeMunicipality(companyNameStr)) return null;

    const searchNorm = normalizeForMatch(name);
    const nameNorm = normalizeForMatch(companyNameStr);
    if (searchNorm.length < 3) return null;

    // Söktermen (från domän) måste finnas i företagsnamnet: "klarastad" i "Klarastad AB"
    const searchInName = nameNorm.includes(searchNorm);
    // Eller: första betydande ordet i företagsnamnet måste finnas i söktermen (t.ex. "karolf" i "karolf städservice")
    const firstWord = companyNameStr.split(/\s+/)[0] || '';
    const firstWordNorm = normalizeForMatch(firstWord);
    const nameInSearch = firstWordNorm.length >= 4 && searchNorm.includes(firstWordNorm);

    if (!searchInName && !nameInSearch) return null;

    return { org: orgClean, companyName: companyNameStr };
  } catch {
    return null;
  }
}

/** Hämta företagsöversikt via org.nr */
export async function fetchRoaringOverview(orgNumber: string): Promise<RoaringCompanyInfo | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const clean = String(orgNumber).replace(/\D/g, '');
  if (clean.length < 6) return null;

  try {
    const url = `https://api.roaring.io/se/company/overview/${clean}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as Record<string, unknown>;

    const info: RoaringCompanyInfo = {
      org_number: null,
      revenue: null,
      employees: null,
      ceo: null,
      board_members: [],
      registration_date: null,
      active: true,
    };

    const org = (data?.organizationNumber ?? data?.organization_number ?? clean) as string | undefined;
    if (org) info.org_number = String(org).replace(/(\d{6})(\d{4})/, '$1-$2');

    const rev = data?.netTurnover ?? data?.net_turnover ?? data?.turnover;
    let revNum: number | null = null;
    if (typeof rev === 'number') {
      revNum = rev;
    } else if (typeof rev === 'string') {
      revNum = parseFloat(rev.replace(/\s/g, ''));
      if (isNaN(revNum)) revNum = null;
    }
    if (revNum != null && revNum > 1000) {
      info.revenue = formatRevenueKr(revNum);
    }

    const emp = data?.numberOfEmployees ?? data?.number_of_employees ?? data?.employees;
    if (typeof emp === 'number') info.employees = String(emp);
    else if (typeof emp === 'string') info.employees = emp;

    const ceo = data?.managingDirector ?? data?.ceo ?? data?.vd;
    if (typeof ceo === 'string') info.ceo = ceo;
    else if (ceo && typeof ceo === 'object' && 'name' in ceo) {
      info.ceo = String((ceo as { name?: string }).name ?? '');
    }

    const board = data?.boardMembers ?? data?.board_members ?? data?.styrelse;
    if (Array.isArray(board)) {
      info.board_members = board
        .map((b) => (typeof b === 'string' ? b : (b as { name?: string })?.name))
        .filter(Boolean) as string[];
    }

    const reg = data?.companyRegistrationDate ?? data?.registration_date ?? data?.established;
    if (reg) info.registration_date = String(reg);

    const status = (data?.status ?? data?.companyStatus ?? '').toString().toLowerCase();
    info.active = !/likviderad|konkurs|avvecklad|inaktiv|dissolved/i.test(status);

    return info;
  } catch {
    return null;
  }
}

/** Sök företag och hämta full översikt. Använder domän för sökning (mer tillförlitligt än företagsnamn). */
export async function fetchRoaringCompanyInfo(
  website: string,
  existingOrgNumber?: string | null
): Promise<RoaringCompanyInfo | null> {
  let org: string | null = existingOrgNumber ? String(existingOrgNumber).replace(/\D/g, '') : null;
  if (!org) {
    const searchName = extractSearchNameFromDomain(website);
    if (!searchName || searchName.length < 2) return null;
    const hit = await searchRoaringCompany(searchName);
    org = hit?.org ?? null;
  }
  if (!org) return null;
  return fetchRoaringOverview(org);
}
