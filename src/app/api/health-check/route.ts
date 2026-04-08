import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getSupabaseAdmin } from '@/lib/supabase';
import { runHealthCheck } from '@/lib/health-check';
import { HealthCheckPDF } from '@/components/health-check/HealthCheckPDF';

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'health-check' });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  try {
    const body = await request.json().catch(() => ({}));
    const website = body.website ?? body.url ?? body.website_url;
    const companyName = body.company_name ?? body.companyName ?? null;

    if (!website || typeof website !== 'string') {
      return NextResponse.json(
        { error: 'Ange website eller url (och valfritt company_name)' },
        { status: 400 }
      );
    }

    const data = await runHealthCheck(website.trim(), companyName?.trim() || null);

    const pdfElement = React.createElement(HealthCheckPDF, { data });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(pdfElement as any);

    const filename = `halsokoll-${data.company_name.replace(/[^a-z0-9]/gi, '-').slice(0, 30)}-${Date.now()}.pdf`;

    if (supabase) {
      try {
        const bucket = 'health-checks';
        const path = `${filename}`;
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(path, new Uint8Array(buffer), {
            contentType: 'application/pdf',
            upsert: true,
          });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        }
      } catch {
        // Bucket kanske inte finns, ignorerar
      }
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[health-check]', err);
    return NextResponse.json(
      {
        error: 'Hälsokoll misslyckades',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
