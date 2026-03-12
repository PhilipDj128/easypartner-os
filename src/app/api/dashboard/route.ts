import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

function getMonthYear(date: Date) {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { todos: [], stats: {}, leads: [], reminders: [] },
      { status: 200 }
    );
  }
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msPerDay = 86400000;
    const twoDaysAgo = new Date(today.getTime() - 2 * msPerDay);
    const sixtyDaysAgo = new Date(today.getTime() - 60 * msPerDay);
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * msPerDay);

    const { data: customers } = await supabase.from('customers').select('id, name, status, last_contact, contract_start, contract_end');
    const { data: quotes } = await supabase.from('quotes').select('id, created_at, sent_at, opened_at, status, customers(name)');
    const { data: revenue } = await supabase.from('revenue').select('amount, month, year, created_at');
    let newLeadsCount = 0;
    let leadList: unknown[] = [];
    try {
      const leadsRes = await supabase.from('leads').select('*', { count: 'exact' }).eq('status', 'new').order('created_at', { ascending: false }).limit(5);
      leadList = leadsRes.data ?? [];
      newLeadsCount = leadsRes.count ?? leadList.length;
    } catch {
      // leads-tabellen kanske saknas
    }
    let reminderList: unknown[] = [];
    try {
      const { data: reminders } = await supabase.from('reminders').select('*').eq('completed', false).order('due_date').limit(10);
      reminderList = reminders ?? [];
    } catch {
      // reminders-tabellen kanske saknas
    }

    const customerList = (customers ?? []) as { id: string; name: string; status?: string; last_contact: string | null; contract_start: string | null; contract_end: string | null }[];
    const quoteList = (quotes ?? []) as { id: string; sent_at: string | null; opened_at: string | null; status: string; customers?: { name?: string } | { name?: string }[] | null }[];
    const revenueList = (revenue ?? []) as { amount: number; month: number | null; year: number | null; created_at: string }[];

    const todos: { type: string; text: string; href: string }[] = [];

    for (const c of customerList) {
      const ref = c.last_contact ?? c.contract_start;
      if (ref && new Date(ref) < sixtyDaysAgo) {
        todos.push({ type: 'customer', text: `Kontakta ${c.name} (ej hörts av på 60+ dagar)`, href: `/customers/${c.id}` });
      }
      if (c.contract_end) {
        const end = new Date(c.contract_end);
        if (end >= today && end <= thirtyDaysFromNow) {
          todos.push({ type: 'contract', text: `Avtal för ${c.name} löper ut inom 30 dagar`, href: `/customers/${c.id}` });
        }
      }
    }

    for (const q of quoteList) {
      if (q.status === 'sent' && !q.opened_at && q.sent_at && new Date(q.sent_at) < twoDaysAgo) {
        const cust = q.customers;
        const name = (Array.isArray(cust) ? cust[0] : cust)?.name ?? 'Kund';
        todos.push({ type: 'quote', text: `Offert till ${name} ej öppnad på 2+ dagar`, href: '/quotes' });
      }
    }

    const activeCustomers = customerList.filter((c) => (c as { status?: string }).status !== 'inactive').length;
    const { month: m, year: y } = getMonthYear(today);
    const thisMonthRevenue = revenueList.reduce((acc, r) => {
      const month = r.month ?? new Date(r.created_at).getMonth() + 1;
      const year = r.year ?? new Date(r.created_at).getFullYear();
      return month === m && year === y ? acc + Number(r.amount) : acc;
    }, 0);

    const openQuotes = quoteList.filter((q) => q.status === 'draft' || q.status === 'sent').length;
    const newLeads = newLeadsCount;

    return NextResponse.json({
      todos,
      stats: { activeCustomers, thisMonthRevenue, openQuotes, newLeads },
      leads: leadList,
      reminders: reminderList,
    });
  } catch (err) {
    console.error('[GET /api/dashboard]', err);
    return NextResponse.json({ todos: [], stats: {}, leads: [], reminders: [] }, { status: 200 });
  }
}
