/**
 * Google Places API: text search + place details.
 * Kräver GOOGLE_PLACES_API_KEY.
 */

export interface GooglePlaceInfo {
  name: string | null;
  phone: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  place_id: string | null;
}

/** Text search: query = företagsnamn + stad */
export async function searchPlacesText(
  query: string,
  options?: { language?: string; region?: string }
): Promise<{ place_id: string }[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key || key.startsWith('din_')) return [];

  const params = new URLSearchParams({
    query,
    key,
    language: options?.language ?? 'sv',
    region: options?.region ?? 'se',
  });

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
      { signal: controller.signal }
    );
    clearTimeout(t);
    const data = (await res.json()) as {
      status?: string;
      results?: { place_id?: string }[];
    };
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return [];
    return (data.results ?? []).map((r) => ({ place_id: r.place_id ?? '' })).filter((r) => r.place_id);
  } catch {
    return [];
  }
}

/** Place Details: namn, telefon, betyg, antal recensioner */
export async function fetchPlaceDetails(placeId: string): Promise<GooglePlaceInfo> {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const out: GooglePlaceInfo = {
    name: null,
    phone: null,
    rating: null,
    user_ratings_total: null,
    place_id: placeId,
  };
  if (!key || key.startsWith('din_') || !placeId) return out;

  const params = new URLSearchParams({
    place_id: placeId,
    key,
    language: 'sv',
    fields: 'name,formatted_phone_number,rating,user_ratings_total',
  });

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
      { signal: controller.signal }
    );
    clearTimeout(t);
    const data = (await res.json()) as {
      status?: string;
      result?: {
        name?: string;
        formatted_phone_number?: string;
        rating?: number;
        user_ratings_total?: number;
      };
    };
    if (data.status !== 'OK' || !data.result) return out;
    const r = data.result;
    out.name = r.name ?? null;
    out.phone = r.formatted_phone_number ?? null;
    out.rating = typeof r.rating === 'number' ? r.rating : null;
    out.user_ratings_total = typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null;
    return out;
  } catch {
    return out;
  }
}

/** Sök på företagsnamn + stad, hämta första träffens detaljer */
export async function fetchPlaceByCompanyAndCity(
  companyName: string,
  city: string
): Promise<GooglePlaceInfo> {
  const query = `${companyName} ${city}`.trim();
  if (!query) return { name: null, phone: null, rating: null, user_ratings_total: null, place_id: null };
  const hits = await searchPlacesText(query);
  if (hits.length === 0) return { name: null, phone: null, rating: null, user_ratings_total: null, place_id: null };
  return fetchPlaceDetails(hits[0].place_id);
}
