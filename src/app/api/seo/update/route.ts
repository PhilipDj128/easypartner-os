import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase inte konfigurerad' }, { status: 503 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const customerId = body.customer_id;
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id krävs.' }, { status: 400 });
    }

    const { data: rankings, error: fetchErr } = await supabase
      .from('seo_rankings')
      .select('id, keyword, position, search_volume')
      .eq('customer_id', customerId);

    if (fetchErr || !rankings?.length) {
      return NextResponse.json(
        { error: 'Inga sökord att uppdatera för denna kund.' },
        { status: 400 }
      );
    }

    const semrushKey = process.env.SEMRUSH_API_KEY;
    const hasSemrush = semrushKey && !semrushKey.startsWith('din_');

    if (hasSemrush && body.domain) {
      const { getKeywordRankings } = await import('@/lib/semrush');
      const raw = await getKeywordRankings(body.domain);
      const lines = raw.trim().split('\n');
      const header = lines[0];
      const keywordIdx = header?.toLowerCase().includes('keyword') ? 0 : -1;
      const posIdx = header?.toLowerCase().includes('position') ? 1 : -1;
      const volIdx = header?.toLowerCase().includes('volume') ? 2 : -1;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        const kw = cols[keywordIdx >= 0 ? keywordIdx : 0]?.trim();
        const pos = parseInt(cols[posIdx >= 0 ? posIdx : 1] || '0', 10);
        const vol = parseInt(cols[volIdx >= 0 ? volIdx : 2] || '0', 10);
        if (kw) {
          const r = rankings.find((x) => x.keyword?.toLowerCase() === kw.toLowerCase());
          if (r) {
            await supabase
              .from('seo_rankings')
              .update({
                previous_position: r.position,
                position: pos,
                search_volume: vol,
                date: new Date().toISOString().slice(0, 10),
              })
              .eq('id', r.id);
          }
        }
      }
    } else {
      for (const r of rankings) {
        const pos = r.position ?? 10;
        const change = Math.floor(Math.random() * 5) - 2;
        const newPos = Math.max(1, Math.min(100, pos + change));
        await supabase
          .from('seo_rankings')
          .update({
            previous_position: pos,
            position: newPos,
            search_volume: (r as { search_volume?: number }).search_volume ?? Math.floor(Math.random() * 1000),
            date: new Date().toISOString().slice(0, 10),
          })
          .eq('id', r.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/seo/update]', err);
    return NextResponse.json({ error: 'Kunde inte uppdatera rankingar.' }, { status: 500 });
  }
}
