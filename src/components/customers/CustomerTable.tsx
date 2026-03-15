'use client';

import Link from 'next/link';
import { differenceInDays, parseISO } from 'date-fns';
import type { Customer } from '@/types/database';

interface CustomerTableProps {
  customers: Customer[];
}

function formatCurrency(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

function getCustomerFlags(customer: Customer) {
  const flags: { type: 'red' | 'yellow' | 'green'; label: string }[] = [];
  const today = new Date();

  const refDate = customer.last_contact ?? customer.contract_start ?? customer.created_at;
  if (refDate) {
    const daysSince = differenceInDays(today, parseISO(refDate));
    if (daysSince >= 60) {
      flags.push({
        type: 'red',
        label: customer.last_contact
          ? `Ej kontaktad på ${daysSince} dagar`
          : 'Ej kontaktad på 60+ dagar',
      });
    }
  }

  if (customer.contract_end) {
    const daysUntilEnd = differenceInDays(parseISO(customer.contract_end), today);
    if (daysUntilEnd >= 0 && daysUntilEnd <= 30) {
      flags.push({
        type: 'yellow',
        label: `Avtal löper ut om ${daysUntilEnd} dagar`,
      });
    }
  }

  if (customer.birthday) {
    const bday = parseISO(customer.birthday);
    const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    const daysToBday = differenceInDays(thisYearBday, today);
    if (daysToBday >= 0 && daysToBday <= 7) {
      flags.push({
        type: 'green',
        label: daysToBday === 0 ? 'Födelsedag idag!' : `Födelsedag om ${daysToBday} dagar`,
      });
    }
  }

  return flags;
}

export function CustomerTable({ customers }: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <div className="card p-20 text-center">
        <p className="text-lg text-[var(--muted-foreground)]">Inga kunder ännu. Lägg till din första kund ovan.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="min-w-full table-sticky-header">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
            <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Namn
            </th>
            <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Företag</th>
            <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Avtalsvärde</th>
            <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Tjänster</th>
            <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
            <th className="px-6 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Flaggor</th>
            <th className="px-6 py-4 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">Åtgärd</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const flags = getCustomerFlags(customer);
            return (
              <tr key={customer.id} className="table-row-hover border-b border-white/[0.04]">
                <td className="h-12 whitespace-nowrap px-6 py-0">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="flex h-12 items-center font-medium text-[var(--foreground)] transition-colors hover:text-indigo-400"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td className="h-12 px-6 py-0 text-[var(--muted-foreground)]">{customer.company || '—'}</td>
                <td className="h-12 px-6 py-0 text-[var(--muted-foreground)]">{formatCurrency(customer.contract_value)}</td>
                <td className="h-12 max-w-[140px] truncate px-6 py-0 text-sm text-[var(--muted-foreground)]">{customer.services?.join(', ') || '—'}</td>
                <td className="h-12 px-6 py-0">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      customer.status === 'active' ? 'badge-blue' : 'badge-gray'
                    }`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="h-12 px-6 py-0">
                  <div className="flex gap-1.5">
                    {flags.map((flag, i) => (
                      <span
                        key={i}
                        title={flag.label}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                          flag.type === 'red'
                            ? 'bg-rose-500/30 text-rose-400'
                            : flag.type === 'yellow'
                              ? 'bg-amber-500/30 text-amber-400'
                              : 'bg-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {flag.type === 'red' ? '!' : flag.type === 'yellow' ? '⚠' : '🎂'}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="h-12 whitespace-nowrap px-6 py-0 text-right">
                  <Link href={`/customers/${customer.id}`} className="text-sm text-indigo-400 hover:underline">
                    Visa →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
