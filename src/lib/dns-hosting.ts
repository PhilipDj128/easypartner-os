/**
 * DNS-namnserveranalys för att identifiera webbhotell.
 * Avslöjar vilket webbhotell en domän använder även när WHOIS-ägaren är dold.
 */

import { promises as dns } from 'dns';

/** Kända webbhotell: namnserver-domän → visningsnamn */
const KNOWN_HOSTS: { pattern: string; name: string }[] = [
  { pattern: 'oderland.com', name: 'Oderland' },
  { pattern: 'loopia.se', name: 'Loopia' },
  { pattern: 'one.com', name: 'One.com' },
  { pattern: 'websupport.se', name: 'WebSupport' },
  { pattern: 'binero.se', name: 'Binero' },
  { pattern: 'bahnhof.se', name: 'Bahnhof' },
];

/**
 * Slå upp namnservrar för en domän och returnera känt webbhotell om något matchar.
 */
export async function lookupHostingProvider(urlOrHost: string): Promise<string | null> {
  let host: string;
  try {
    if (urlOrHost.startsWith('http://') || urlOrHost.startsWith('https://')) {
      host = new URL(urlOrHost).hostname.replace(/^www\./, '');
    } else {
      host = urlOrHost.replace(/^www\./, '');
    }
    if (!host || host.length < 4) return null;
  } catch {
    return null;
  }

  try {
    const nameservers = await Promise.race([
      dns.resolveNs(host),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 5000)
      ),
    ]);

    if (!nameservers || nameservers.length === 0) return null;

    const nsLower = nameservers.map((ns) => ns.toLowerCase());

    for (const { pattern, name } of KNOWN_HOSTS) {
      if (nsLower.some((ns) => ns.includes(pattern.toLowerCase()))) {
        return name;
      }
    }
  } catch {
    // DNS-fel, timeout eller ingen match
  }
  return null;
}
