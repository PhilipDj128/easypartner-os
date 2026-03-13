export async function searchSerp(
  query: string,
  location?: string,
  num = 20
) {
  const safeNum = num <= 10 ? 10 : num <= 40 ? 40 : 100;
  const params = new URLSearchParams({
    q: query,
    api_key: process.env.SERPAPI_KEY || '',
    num: String(safeNum),
  });
  if (location) params.set('location', location);

  const response = await fetch(
    `https://serpapi.com/search?${params.toString()}`
  );
  return response.json();
}
