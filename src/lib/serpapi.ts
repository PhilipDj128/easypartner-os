export async function searchSerp(query: string, location?: string) {
  const params = new URLSearchParams({
    q: query,
    api_key: process.env.SERPAPI_KEY || '',
  });
  if (location) params.set('location', location);

  const response = await fetch(
    `https://serpapi.com/search?${params.toString()}`
  );
  return response.json();
}
