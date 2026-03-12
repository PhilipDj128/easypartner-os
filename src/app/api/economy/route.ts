import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

function getMonthYear(date: Date) {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function getLast12Months() {
  const result: { month: number; year: number; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { month, year } = getMonthYear(d);
    const labels = 'jan feb mar apr maj jun jul aug sep okt nov dec'.split(' ');
    result.push({ month, year, label: `${labels[month - 1]} ${year}` });
  }
  return result;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase inte konfigurerad' },
      { status: 503 }
    );
  }
  try {
    const { month: thisMonth, year: thisYear } = getMonthYear(new Date());

    const { data: allRevenue, error: revErr } = await supabase.from('revenue').select('amount, month, year, created_at');
    if (revErr) {
      if (revErr.message?.includes('does not exist') || revErr.code === '42P01') {
        return NextResponse.json(
          { error: 'Tabellen "revenue" finns inte. Kör SQL-schemat i Supabase SQL Editor (se spec Steg 3).' },
          { status: 503 }
        );
      }
      throw revErr;
    }

    const { data: allExpenses, error: expErr } = await supabase.from('expenses').select('amount, month, year, created_at');
    if (expErr) {
      if (expErr.message?.includes('does not exist') || expErr.code === '42P01') {
        return NextResponse.json(
          { error: 'Tabellen "expenses" finns inte. Kör SQL-schemat i Supabase SQL Editor (se spec Steg 3).' },
          { status: 503 }
        );
      }
      throw expErr;
    }

    const revenueList = (allRevenue ?? []) as { amount: number; month: number | null; year: number | null; created_at: string }[];
    const expenseList = (allExpenses ?? []) as { amount: number; month: number | null; year: number | null; created_at: string }[];

    const sumForMonth = (
      items: { amount: number; month: number | null; year: number | null; created_at: string }[],
      m: number,
      y: number
    ) =>
      items.reduce((acc, r) => {
        const month = r.month ?? new Date(r.created_at).getMonth() + 1;
        const year = r.year ?? new Date(r.created_at).getFullYear();
        return month === m && year === y ? acc + Number(r.amount) : acc;
      }, 0);

    const thisMonthRevenue = sumForMonth(revenueList, thisMonth, thisYear);
    const thisMonthExpenses = sumForMonth(expenseList, thisMonth, thisYear);

    const months = getLast12Months();
    const monthlyData = months.map(({ month, year, label }) => ({
      month,
      year,
      label,
      revenue: sumForMonth(revenueList, month, year),
      expenses: sumForMonth(expenseList, month, year),
    }));

    return NextResponse.json({
      thisMonthRevenue,
      thisMonthExpenses,
      margin: thisMonthRevenue > 0 ? ((thisMonthRevenue - thisMonthExpenses) / thisMonthRevenue) * 100 : 0,
      monthlyData,
    });
  } catch (err) {
    console.error('[GET /api/economy]', err);
    return NextResponse.json({ error: 'Kunde inte hämta ekonomidata.' }, { status: 500 });
  }
}
