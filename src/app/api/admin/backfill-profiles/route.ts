import { getSupabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 500 });
  }

  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const { data: existingProfiles } = await admin.from('profiles').select('id');
  const existingIds = new Set((existingProfiles ?? []).map((p: { id: string }) => p.id));

  const missing = users.filter(u => !existingIds.has(u.id));
  if (missing.length === 0) {
    return NextResponse.json({ ok: true, created: 0, message: 'All users already have profiles' });
  }

  const rows = missing.map(u => ({
    id: u.id,
    email: u.email ?? null,
    name: u.user_metadata?.full_name ?? u.email ?? null,
  }));

  const { error: upsertErr } = await admin.from('profiles').upsert(rows, { onConflict: 'id' });
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, created: missing.length });
}
