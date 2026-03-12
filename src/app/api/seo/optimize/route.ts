import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.startsWith('din_')) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY är inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json();
    const customerId = body.customer_id as string;
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id krävs' }, { status: 400 });
    }

    const { data: rankings } = await supabase
      .from('seo_rankings')
      .select('*')
      .eq('customer_id', customerId);

    const rankingList = (rankings ?? []) as { keyword: string; position: number | null; previous_position: number | null; search_volume: number | null; domain: string | null }[];

    if (rankingList.length === 0) {
      return NextResponse.json({ error: 'Inga sökord att analysera. Lägg till sökord först.' }, { status: 400 });
    }

    const prompt = `Du är en SEO-expert. Analysera följande rankingdata för en kund och ge konkreta förbättringsförslag på svenska.

Rankingdata (sökord, position idag, föregående position, sökvolym):
${JSON.stringify(rankingList, null, 2)}

Returnera ett JSON-objekt med exakt denna struktur (inga andra fält):
{
  "meta_title": "Förslag på ny meta-titel (max 60 tecken)",
  "meta_description": "Förslag på ny meta-beskrivning (max 155 tecken)",
  "content_suggestions": ["Förslag 1", "Förslag 2", "Förslag 3"],
  "technical_actions": ["Teknisk åtgärd 1", "Teknisk åtgärd 2"]
}

Svara ENDAST med JSON, ingen annan text.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (message.content[0] as { type: string; text?: string }).text ?? '{}';
    let suggestions: { meta_title: string; meta_description: string; content_suggestions: string[]; technical_actions: string[] };
    try {
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      suggestions = {
        meta_title: parsed.meta_title ?? '',
        meta_description: parsed.meta_description ?? '',
        content_suggestions: Array.isArray(parsed.content_suggestions) ? parsed.content_suggestions : [],
        technical_actions: Array.isArray(parsed.technical_actions) ? parsed.technical_actions : [],
      };
    } catch {
      suggestions = {
        meta_title: '',
        meta_description: '',
        content_suggestions: [text],
        technical_actions: [],
      };
    }

    try {
      await supabase.from('seo_suggestions').insert({
        customer_id: customerId,
        suggestions,
      });
    } catch {
      // Tabellen kanske saknas
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error('[POST /api/seo/optimize]', err);
    return NextResponse.json({ error: 'Kunde inte analysera.' }, { status: 500 });
  }
}
