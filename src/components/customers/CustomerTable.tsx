'use client';

import Link from 'next/link';
import { format, differenceInDays, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
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
      <div className="rounded-xl border border-sand-200 bg-white p-20 text-center shadow-sm">
        <p className="text-lg text-sand-200">Inga kunder ännu. Lägg till din första kund ovan.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-sand-200">
        <thead>
          <tr>
            <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
              Namn
            </th>
            <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
              Företag
            </th>
            <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
              Avtalsvärde
            </th>
            <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
              Tjänster
            </th>
            <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
              Status
            </th>
            <th className="px-6 py-5 text-left text-xs font-medium uppercase tracking-wider text-brand-600">
              Flaggor
            </th>
            <th className="px-6 py-5 text-right text-xs font-medium uppercase tracking-wider text-brand-600">
              Åtgärd
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200">
          {customers.map((customer) => {
            const flags = getCustomerFlags(customer);
            return (
              <tr key={customer.id} className="transition-colors hover:bg-sand-50">
                <td className="whitespace-nowrap px-6 py-5">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-brand-900 hover:text-brand-600"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td className="px-6 py-5 text-sand-200">{customer.company || '—'}</td>
                <td className="px-6 py-5 text-sand-200">
                  {formatCurrency(customer.contract_value)}
                </td>
                <td className="max-w-[140px] truncate px-6 py-5 text-sm text-sand-200">
                  {customer.services?.join(', ') || '—'}
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      customer.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-sand-100 text-sand-700'
                    }`}
                  >
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex gap-1.5">
                    {flags.map((flag, i) => (
                      <span
                        key={i}
                        title={flag.label}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                          flag.type === 'red'
                            ? 'bg-red-500 text-white'
                            : flag.type === 'yellow'
                              ? 'bg-amber-400 text-amber-900'
                              : 'bg-green-500 text-white'
                        }`}
                      >
                        {flag.type === 'red' ? '!' : flag.type === 'yellow' ? '⚠' : '🎂'}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-5 text-right">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="text-sm text-brand-600 hover:text-brand-900"
                  >
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
