import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeProspect(websiteData: unknown) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analysera detta prospekt och ge en score 1-100 samt säljargument på svenska: ${JSON.stringify(websiteData)}`,
      },
    ],
  });
  return message.content[0];
}

export async function generateSEOUpdate(pageData: unknown) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Du är en SEO-expert. Uppdatera följande siddata för bättre ranking. Returnera JSON med uppdaterade värden: ${JSON.stringify(pageData)}`,
      },
    ],
  });
  return message.content[0];
}

export async function generateRevenueForecast(data: unknown) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analysera dessa intäkts- och utgiftsdata och ge en prognos på svenska för 3, 6 och 12 månader. Ge också konkreta råd om vad som krävs för nästa nivå: ${JSON.stringify(data)}`,
      },
    ],
  });
  return message.content[0];
}
