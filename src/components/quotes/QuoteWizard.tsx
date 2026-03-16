'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COMPANY = {
  name: 'Philip Dejager',
  email: 'philip@easypartnerisverige.se',
  phone: '+46705751013',
  company: 'EasyPartner AB',
};

const SERVICE_PILLS = [
  'HEMSIDA',
  'SEO',
  'MOLNVÄXEL',
  'TELEFONI',
  'SOCIALA MEDIER',
  'GRAFISK FORMGIVNING',
  'OFFICE 365',
  'KÖRJOURNAL',
  'KASSASYSTEM',
  'SEM',
  'COPY/PRINT',
  'GOOGLE ADS',
  'HÅRDVARA',
] as const;

interface LineItemOneTime {
  type: 'one_time';
  specification: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
}
interface LineItemMonthly {
  type: 'monthly';
  specification: string;
  quantity: number;
  unit_price: number;
  binding_period: string;
  contract_period: string;
  discount_percent: number;
}

type LineItem = LineItemOneTime | LineItemMonthly;

interface Customer {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Recipient {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  customer_id?: string;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function QuoteWizard({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerManual, setCustomerManual] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
  });
  const [lineItemsOneTime, setLineItemsOneTime] = useState<LineItemOneTime[]>([
    { type: 'one_time', specification: '', quantity: 1, unit_price: 0, discount_percent: 0 },
  ]);
  const [lineItemsMonthly, setLineItemsMonthly] = useState<LineItemMonthly[]>([
    { type: 'monthly', specification: '', quantity: 1, unit_price: 0, binding_period: '', contract_period: '', discount_percent: 0 },
  ]);
  const [offerDiscountPercent, setOfferDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [newRecipient, setNewRecipient] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '' });
  const [emailSubject, setEmailSubject] = useState('Offert från EasyPartner – {{document.name}}');
  const [emailMessage, setEmailMessage] = useState(
    'Hej {{recipient.first_name}},\n\nHär kommer din offert från EasyPartner. Klicka på länken nedan för att läsa och signera.\n\nMed vänliga hälsningar,\nEasyPartner'
  );
  const [createdQuoteId, setCreatedQuoteId] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const customerSearch = recipientSearch.toLowerCase().trim();
  const filteredCustomers = useMemo(
    () =>
      customerSearch
        ? customers.filter(
            (c) =>
              c.name.toLowerCase().includes(customerSearch) ||
              (c.company || '').toLowerCase().includes(customerSearch) ||
              (c.email || '').toLowerCase().includes(customerSearch)
          )
        : customers.slice(0, 10),
    [customers, customerSearch]
  );

  const addOneTimeRow = () =>
    setLineItemsOneTime((p) => [...p, { type: 'one_time', specification: '', quantity: 1, unit_price: 0, discount_percent: 0 }]);
  const updateOneTime = (i: number, field: keyof LineItemOneTime, value: string | number) =>
    setLineItemsOneTime((p) => p.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  const removeOneTime = (i: number) =>
    setLineItemsOneTime((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p));

  const addMonthlyRow = () =>
    setLineItemsMonthly((p) => [
      ...p,
      { type: 'monthly', specification: '', quantity: 1, unit_price: 0, binding_period: '', contract_period: '', discount_percent: 0 },
    ]);
  const updateMonthly = (i: number, field: keyof LineItemMonthly, value: string | number) =>
    setLineItemsMonthly((p) => p.map((row, j) => (j === i ? { ...row, [field]: value } : row)));
  const removeMonthly = (i: number) =>
    setLineItemsMonthly((p) => (p.length > 1 ? p.filter((_, j) => j !== i) : p));

  const addServicePill = (name: string) => {
    setLineItemsOneTime((p) => {
      const last = p[p.length - 1];
      if (last && !last.specification) {
        return p.map((row, i) => (i === p.length - 1 ? { ...row, specification: name } : row));
      }
      return [...p, { type: 'one_time', specification: name, quantity: 1, unit_price: 0, discount_percent: 0 }];
    });
  };

  const rowSum = (qty: number, unit: number, discountPct: number) => {
    const raw = (qty || 0) * (unit || 0);
    return raw * (1 - (discountPct || 0) / 100);
  };

  const oneTimeTotal = lineItemsOneTime.reduce(
    (sum, r) => sum + rowSum(Number(r.quantity), Number(r.unit_price), Number(r.discount_percent)),
    0
  );
  const monthlyTotal = lineItemsMonthly.reduce(
    (sum, r) => sum + rowSum(Number(r.quantity), Number(r.unit_price), Number(r.discount_percent)),
    0
  );
  const subtotal = oneTimeTotal + monthlyTotal;
  const quoteDiscountAmount = subtotal * ((offerDiscountPercent || 0) / 100);
  const oneTimeAfterDiscount = subtotal > 0 ? oneTimeTotal - (quoteDiscountAmount * oneTimeTotal / subtotal) : 0;
  const monthlyAfterDiscount = subtotal > 0 ? monthlyTotal - (quoteDiscountAmount * monthlyTotal / subtotal) : 0;
  const moms25 = oneTimeAfterDiscount * 0.25;
  const oneTimeInclMoms = oneTimeAfterDiscount + moms25;
  const monthlyInclMoms = monthlyAfterDiscount * 1.25;
  const totalAmount = oneTimeAfterDiscount + monthlyAfterDiscount;

  const addRecipientFromCustomer = (c: Customer) => {
    const name = c.name || '';
    const parts = name.split(/\s+/);
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';
    if (recipients.some((r) => r.email === c.email && c.email)) return;
    setRecipients((p) => [
      ...p,
      {
        first_name,
        last_name,
        email: c.email || '',
        phone: c.phone || '',
        company: c.company || '',
        customer_id: c.id,
      },
    ]);
    setRecipientSearch('');
  };

  const addNewRecipient = () => {
    if (!newRecipient.email?.includes('@')) {
      alert('Ange en giltig e-postadress');
      return;
    }
    setRecipients((p) => [
      ...p,
      {
        first_name: newRecipient.first_name,
        last_name: newRecipient.last_name,
        email: newRecipient.email,
        phone: newRecipient.phone,
        company: newRecipient.company,
      },
    ]);
    setNewRecipient({ first_name: '', last_name: '', email: '', phone: '', company: '' });
  };

  const removeRecipient = (email: string) => setRecipients((p) => p.filter((r) => r.email !== email));

  const saveDraft = async (): Promise<string | null> => {
    setSaving(true);
    try {
      const customerId = selectedCustomerId || null;
      const oneTimeItems = lineItemsOneTime.filter((r) => r.specification.trim()).map((r) => ({ ...r }));
      const monthlyItems = lineItemsMonthly.filter((r) => r.specification.trim()).map((r) => ({ ...r }));
      const payload = {
        customer_id: customerId,
        quote_date: quoteDate,
        valid_until: validUntil,
        one_time_items: oneTimeItems,
        monthly_items: monthlyItems,
        one_time_cost: oneTimeTotal,
        monthly_cost: monthlyTotal,
        discount_percent: offerDiscountPercent || 0,
        total_amount: totalAmount,
        notes: notes || null,
        recipient_name: selectedCustomer?.name || customerManual.name || null,
        recipient_email: selectedCustomer?.email || customerManual.email || null,
      };
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Kunde inte spara');
      }
      const data = await res.json();
      setCreatedQuoteId(data.id);
      return data.id;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunde inte spara offert');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const goStep2 = async () => {
    const id = createdQuoteId || (await saveDraft());
    if (id) setStep(2);
  };

  const goStep3 = async () => {
    if (recipients.length === 0) {
      alert('Lägg till minst en mottagare');
      return;
    }
    if (!createdQuoteId) await saveDraft();
    setStep(3);
  };

  const sendQuote = async () => {
    const recipient = recipients[0];
    if (!recipient?.email) {
      alert('Mottagare saknar e-post');
      return;
    }
    const quoteId = createdQuoteId || (await saveDraft());
    if (!quoteId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: `${recipient.first_name} ${recipient.last_name}`.trim() || recipient.email,
          recipient_email: recipient.email,
          email_subject: emailSubject,
          email_message: emailMessage,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Kunde inte skicka');
      }
      router.push('/quotes');
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kunde inte skicka offert');
    } finally {
      setSending(false);
    }
  };

  const previewSubject = emailSubject
    .replace(/\{\{recipient\.first_name\}\}/g, recipients[0]?.first_name || '')
    .replace(/\{\{document\.name\}\}/g, 'Offert');
  const previewMessage = emailMessage
    .replace(/\{\{recipient\.first_name\}\}/g, recipients[0]?.first_name || '')
    .replace(/\{\{document\.name\}\}/g, 'Offert');

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/quotes" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          ← Tillbaka till offerter
        </Link>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                step >= s ? 'bg-indigo-500 text-white' : 'bg-white/10 text-[var(--muted-foreground)]'
              }`}
            >
              {s}
            </div>
          ))}
          <span className="ml-1 text-sm text-[var(--muted-foreground)]">
            {step}/3
          </span>
        </div>
      </div>

      {step === 1 && (
        <div className="card space-y-8 p-6">
          <h2 className="font-heading text-xl font-semibold text-[var(--foreground)]">Steg 1 – Fyll i offert</h2>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Offertinformation
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-[var(--muted-foreground)]">Datum</label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)]">Giltig till</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)]"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Ditt företag
            </h3>
            <div className="rounded-lg border border-[var(--border)] bg-white/5 p-4 text-sm text-[var(--muted-foreground)]">
              <p className="font-medium text-[var(--foreground)]">{COMPANY.name}</p>
              <p>{COMPANY.company}</p>
              <p>{COMPANY.email}</p>
              <p>{COMPANY.phone}</p>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Kundinformation
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--muted-foreground)]">Välj befintlig kund</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)]"
                >
                  <option value="">— Välj kund —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedCustomer && (
                <div className="rounded-lg border border-[var(--border)] bg-white/5 p-4 text-sm">
                  <p className="font-medium text-[var(--foreground)]">{selectedCustomer.name}</p>
                  {selectedCustomer.company && <p className="text-[var(--muted-foreground)]">{selectedCustomer.company}</p>}
                  {selectedCustomer.email && <p className="text-[var(--muted-foreground)]">{selectedCustomer.email}</p>}
                  {selectedCustomer.phone && <p className="text-[var(--muted-foreground)]">{selectedCustomer.phone}</p>}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Namn (om ej kund)"
                  value={customerManual.name}
                  onChange={(e) => setCustomerManual((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
                <input
                  type="text"
                  placeholder="Företag"
                  value={customerManual.company}
                  onChange={(e) => setCustomerManual((p) => ({ ...p, company: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
                <input
                  type="email"
                  placeholder="E-post"
                  value={customerManual.email}
                  onChange={(e) => setCustomerManual((p) => ({ ...p, email: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  value={customerManual.phone}
                  onChange={(e) => setCustomerManual((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Tjänster – klicka för att lägga till
            </h3>
            <div className="flex flex-wrap gap-2">
              {SERVICE_PILLS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addServicePill(name)}
                  className="rounded-full bg-teal-500/20 px-4 py-2 text-sm font-medium text-teal-300 transition-colors hover:bg-teal-500/30"
                >
                  {name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Engångskostnad
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
                    <th className="pb-2 pr-2">Specifikation</th>
                    <th className="pb-2 pr-2 w-16">Antal</th>
                    <th className="pb-2 pr-2 w-24">Á pris</th>
                    <th className="pb-2 pr-2 w-20">Rabatt (%)</th>
                    <th className="pb-2 w-24 text-right">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItemsOneTime.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/50">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={r.specification}
                          onChange={(e) => updateOneTime(i, 'specification', e.target.value)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          value={r.quantity}
                          onChange={(e) => updateOneTime(i, 'quantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={r.unit_price ?? ''}
                          onChange={(e) => updateOneTime(i, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={r.discount_percent ?? ''}
                          onChange={(e) => updateOneTime(i, 'discount_percent', parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(rowSum(r.quantity, r.unit_price, r.discount_percent ?? 0))}
                        <button type="button" onClick={() => removeOneTime(i)} className="ml-2 text-red-400">×</button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[var(--border)] font-medium">
                    <td colSpan={4} className="py-2 text-right text-[var(--foreground)]">Totalt engångskostnad</td>
                    <td className="py-2 text-right">{formatCurrency(oneTimeTotal)}</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" onClick={addOneTimeRow} className="mt-2 text-sm text-indigo-400 hover:underline">
                + Lägg till rad
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Månadskostnad
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted-foreground)]">
                    <th className="pb-2 pr-2">Specifikation</th>
                    <th className="pb-2 pr-2 w-20">Bindningstid</th>
                    <th className="pb-2 pr-2 w-20">Avtalstid</th>
                    <th className="pb-2 pr-2 w-16">Antal</th>
                    <th className="pb-2 pr-2 w-20">Á pris</th>
                    <th className="pb-2 pr-2 w-16">Rabatt (%)</th>
                    <th className="pb-2 w-24 text-right">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItemsMonthly.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border)]/50">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={r.specification}
                          onChange={(e) => updateMonthly(i, 'specification', e.target.value)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          placeholder="t.ex. 12 mån"
                          value={r.binding_period}
                          onChange={(e) => updateMonthly(i, 'binding_period', e.target.value)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          placeholder="t.ex. 24 mån"
                          value={r.contract_period}
                          onChange={(e) => updateMonthly(i, 'contract_period', e.target.value)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={1}
                          value={r.quantity}
                          onChange={(e) => updateMonthly(i, 'quantity', parseInt(e.target.value, 10) || 0)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={r.unit_price ?? ''}
                          onChange={(e) => updateMonthly(i, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={r.discount_percent ?? ''}
                          onChange={(e) => updateMonthly(i, 'discount_percent', parseFloat(e.target.value) || 0)}
                          className="w-full rounded border border-[var(--border)] bg-white/5 px-2 py-1 text-[var(--foreground)]"
                        />
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(rowSum(r.quantity, r.unit_price, r.discount_percent ?? 0))}
                        <button type="button" onClick={() => removeMonthly(i)} className="ml-2 text-red-400">×</button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[var(--border)] font-medium">
                    <td colSpan={6} className="py-2 text-right text-[var(--foreground)]">Totalt per månad</td>
                    <td className="py-2 text-right">{formatCurrency(monthlyTotal)}</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" onClick={addMonthlyRow} className="mt-2 text-sm text-indigo-400 hover:underline">
                + Lägg till rad
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Rabatt på hela offerten
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={offerDiscountPercent || ''}
                onChange={(e) => setOfferDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-24 rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)]"
              />
              <span className="text-sm text-[var(--muted-foreground)]">%</span>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border)] bg-white/5 p-4">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Summering
            </h3>
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Delsumma</span>
                <span>{formatCurrency(subtotal)}</span>
              </li>
              {offerDiscountPercent > 0 && (
                <li className="flex justify-between text-amber-400">
                  <span>Rabatt ({offerDiscountPercent}%)</span>
                  <span>-{formatCurrency(quoteDiscountAmount)}</span>
                </li>
              )}
              <li className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Totalt ex. moms</span>
                <span>{formatCurrency(totalAmount)}</span>
              </li>
              <li className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Moms 25%</span>
                <span>{formatCurrency(moms25)}</span>
              </li>
              <li className="flex justify-between font-semibold text-[var(--foreground)]">
                <span>Totalt engång inkl. moms</span>
                <span>{formatCurrency(oneTimeInclMoms)}</span>
              </li>
              <li className="flex justify-between font-semibold text-[var(--foreground)]">
                <span>Månadskostnad inkl. moms</span>
                <span>{formatCurrency(monthlyInclMoms)} / mån</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              Övriga villkor
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Fritext..."
              className="w-full rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
          </section>

          <div className="flex justify-end border-t border-[var(--border)] pt-6">
            <p className="mr-4 self-center text-sm text-[var(--muted-foreground)]">
              Totalt ex. moms: <strong className="text-[var(--foreground)]">{formatCurrency(totalAmount)}</strong>
            </p>
            <button
              type="button"
              onClick={goStep2}
              disabled={saving}
              className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Sparar…' : 'Fortsätt till mottagare'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-6 p-6">
          <h2 className="font-heading text-xl font-semibold text-[var(--foreground)]">Steg 2 – Lägg till mottagare</h2>

          <div>
            <label className="block text-sm text-[var(--muted-foreground)]">Sök befintlig kund</label>
            <input
              type="text"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Sök på namn, företag eller e-post..."
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--border)] bg-white/5">
              {filteredCustomers.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => addRecipientFromCustomer(c)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-300">
                      {getInitials(c.name)}
                    </span>
                    <span className="font-medium text-[var(--foreground)]">{c.name}</span>
                    {c.company && <span className="text-[var(--muted-foreground)]">{c.company}</span>}
                    {c.email && <span className="text-[var(--muted-foreground)]">{c.email}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="block text-sm text-[var(--muted-foreground)]">Eller lägg till ny mottagare</label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Förnamn"
                value={newRecipient.first_name}
                onChange={(e) => setNewRecipient((p) => ({ ...p, first_name: e.target.value }))}
                className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--foreground)]"
              />
              <input
                type="text"
                placeholder="Efternamn"
                value={newRecipient.last_name}
                onChange={(e) => setNewRecipient((p) => ({ ...p, last_name: e.target.value }))}
                className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--foreground)]"
              />
              <input
                type="email"
                placeholder="E-post *"
                value={newRecipient.email}
                onChange={(e) => setNewRecipient((p) => ({ ...p, email: e.target.value }))}
                className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--foreground)]"
              />
              <input
                type="tel"
                placeholder="Telefon"
                value={newRecipient.phone}
                onChange={(e) => setNewRecipient((p) => ({ ...p, phone: e.target.value }))}
                className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--foreground)]"
              />
              <input
                type="text"
                placeholder="Företag"
                value={newRecipient.company}
                onChange={(e) => setNewRecipient((p) => ({ ...p, company: e.target.value }))}
                className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={addNewRecipient}
                className="btn-primary rounded-lg px-4 py-2 text-sm"
              >
                Lägg till
              </button>
            </div>
          </div>

          {recipients.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-[var(--muted-foreground)]">Mottagare (signerare)</p>
              <ul className="space-y-2">
                {recipients.map((r) => (
                  <li
                    key={r.email}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-sm font-medium text-teal-300">
                        {getInitials(`${r.first_name} ${r.last_name}`.trim() || r.email)}
                      </span>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {`${r.first_name} ${r.last_name}`.trim() || r.email}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">{r.email} · Signerare</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRecipient(r.email)}
                      className="text-sm text-red-400 hover:underline"
                    >
                      Ta bort
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-outline rounded-lg px-4 py-2 text-sm"
            >
              Tillbaka
            </button>
            <button
              type="button"
              onClick={goStep3}
              disabled={recipients.length === 0}
              className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              Fortsätt till skicka
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-6 p-6">
          <h2 className="font-heading text-xl font-semibold text-[var(--foreground)]">Steg 3 – Skicka</h2>

          <div>
            <label className="block text-sm text-[var(--muted-foreground)]">E-postämne</label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)]"
              placeholder="Variabler: {{recipient.first_name}}, {{document.name}}"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted-foreground)]">Meddelande</label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-[var(--foreground)]"
              placeholder="Variabler: {{recipient.first_name}}, {{document.name}}"
            />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-white/5 p-4">
            <p className="text-xs font-medium uppercase text-[var(--muted-foreground)]">Förhandsgranska</p>
            <p className="mt-1 font-medium text-[var(--foreground)]">{previewSubject}</p>
            <div className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">
              {previewMessage}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-6">
            <button type="button" onClick={() => setStep(2)} className="btn-outline rounded-lg px-4 py-2 text-sm">
              Tillbaka
            </button>
            <button
              type="button"
              onClick={sendQuote}
              disabled={sending}
              className="btn-primary rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {sending ? 'Skickar…' : 'Skicka offert'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
