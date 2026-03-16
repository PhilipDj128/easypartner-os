import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  page1Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#4a6fa5',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a2a4a',
  },
  tagline: {
    fontSize: 9,
    color: '#3a5a8a',
    marginTop: 2,
  },
  idSection: {
    textAlign: 'right',
  },
  idLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  idValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a2a4a',
  },
  date: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  customerSection: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#f5f8fa',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#4a6fa5',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a2a4a',
  },
  customerCompany: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  table: {
    marginTop: 16,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4a6fa5',
    color: 'white',
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8dfd0',
    fontSize: 9,
  },
  colSpec: { width: '32%' },
  colBind: { width: '12%' },
  colContract: { width: '12%' },
  colQty: { width: '8%', textAlign: 'right' },
  colPrice: { width: '12%', textAlign: 'right' },
  colDisc: { width: '10%', textAlign: 'right' },
  colSum: { width: '12%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f0f4ff',
    marginTop: 4,
    fontWeight: 'bold',
    fontSize: 10,
  },
  summaryBlock: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f5f8fa',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 10,
  },
  summaryRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  termsSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8dfd0',
  },
  termsText: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  signSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8dfd0',
  },
  signTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a2a4a',
    marginBottom: 8,
  },
  signPlaceholder: {
    fontSize: 9,
    color: '#9ca3af',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

interface OneTimeItem {
  specification: string;
  quantity?: number;
  unit_price?: number;
  discount_percent?: number;
}

interface MonthlyItem {
  specification: string;
  quantity?: number;
  unit_price?: number;
  discount_percent?: number;
  binding_period?: string;
  contract_period?: string;
}

interface QuotePDFProps {
  quoteId: string;
  quoteNumber?: string | null;
  createdAt: string;
  customerName: string;
  customerCompany: string | null;
  oneTimeItems?: OneTimeItem[];
  monthlyItems?: MonthlyItem[];
  discountPercent?: number;
  oneTimeCost?: number;
  monthlyCost?: number;
  totalAmount: number;
  validUntil?: string | null;
  notes?: string | null;
}

function rowSum(qty: number, unit: number, discountPct: number): number {
  const raw = qty * unit;
  return raw * (1 - discountPct / 100);
}

export function QuotePDF({
  quoteId,
  quoteNumber,
  createdAt,
  customerName,
  customerCompany,
  oneTimeItems = [],
  monthlyItems = [],
  discountPercent = 0,
  oneTimeCost: oneTimeCostProp,
  monthlyCost: monthlyCostProp,
  totalAmount,
  validUntil: validUntilProp,
  notes,
}: QuotePDFProps) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(n);

  const displayId = quoteNumber || `#${quoteId.slice(0, 8)}`;
  const validUntilDate = validUntilProp
    ? formatDate(validUntilProp)
    : (() => {
        const d = new Date(createdAt);
        d.setDate(d.getDate() + 30);
        return formatDate(d.toISOString());
      })();

  const oneTimeTotal =
    oneTimeCostProp ??
    oneTimeItems.reduce(
      (s, r) =>
        s + rowSum(r.quantity ?? 1, r.unit_price ?? 0, r.discount_percent ?? 0),
      0
    );
  const monthlyTotal =
    monthlyCostProp ??
    monthlyItems.reduce(
      (s, r) =>
        s + rowSum(r.quantity ?? 1, r.unit_price ?? 0, r.discount_percent ?? 0),
      0
    );
  const subtotal = oneTimeTotal + monthlyTotal;
  const quoteDiscountAmount = subtotal * (discountPercent / 100);
  const oneTimeAfter =
    subtotal > 0 ? oneTimeTotal - (quoteDiscountAmount * oneTimeTotal) / subtotal : 0;
  const monthlyAfter =
    subtotal > 0 ? monthlyTotal - (quoteDiscountAmount * monthlyTotal) / subtotal : 0;
  const moms25 = oneTimeAfter * 0.25;
  const oneTimeInclMoms = oneTimeAfter + moms25;
  const monthlyInclMoms = monthlyAfter * 1.25;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.page1Header}>
          <View style={styles.logoSection}>
            <View>
              <Text style={styles.logoText}>EasyPartner</Text>
              <Text style={styles.tagline}>CRM & Affärssystem</Text>
            </View>
          </View>
          <View style={styles.idSection}>
            <Text style={styles.idLabel}>Offertnummer</Text>
            <Text style={styles.idValue}>{displayId}</Text>
            <Text style={styles.date}>{formatDate(createdAt)}</Text>
          </View>
        </View>

        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Offert till</Text>
          <Text style={styles.customerName}>{customerName}</Text>
          {customerCompany && (
            <Text style={styles.customerCompany}>{customerCompany}</Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>EasyPartner — Offert {displayId}</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Engångskostnad</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.colSpec}>Specifikation</Text>
            <Text style={styles.colQty}>Antal</Text>
            <Text style={styles.colPrice}>Á pris</Text>
            <Text style={styles.colDisc}>Rabatt</Text>
            <Text style={styles.colSum}>Summa</Text>
          </View>
          {oneTimeItems.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colSpec}>{r.specification}</Text>
              <Text style={styles.colQty}>{(r.quantity ?? 1).toString()}</Text>
              <Text style={styles.colPrice}>{formatCurrency(r.unit_price ?? 0)}</Text>
              <Text style={styles.colDisc}>
                {(r.discount_percent ?? 0) > 0 ? `${r.discount_percent}%` : '—'}
              </Text>
              <Text style={styles.colSum}>
                {formatCurrency(
                  rowSum(r.quantity ?? 1, r.unit_price ?? 0, r.discount_percent ?? 0)
                )}
              </Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={styles.colSpec}>Totalt engångskostnad</Text>
            <Text style={styles.colQty}></Text>
            <Text style={styles.colPrice}></Text>
            <Text style={styles.colDisc}></Text>
            <Text style={styles.colSum}>{formatCurrency(oneTimeTotal)}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Månadskostnad</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.colSpec}>Specifikation</Text>
            <Text style={styles.colBind}>Bindning</Text>
            <Text style={styles.colContract}>Avtalstid</Text>
            <Text style={styles.colQty}>Antal</Text>
            <Text style={styles.colPrice}>Á pris</Text>
            <Text style={styles.colDisc}>Rabatt</Text>
            <Text style={styles.colSum}>Summa</Text>
          </View>
          {monthlyItems.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colSpec}>{r.specification}</Text>
              <Text style={styles.colBind}>{r.binding_period || '—'}</Text>
              <Text style={styles.colContract}>{r.contract_period || '—'}</Text>
              <Text style={styles.colQty}>{(r.quantity ?? 1).toString()}</Text>
              <Text style={styles.colPrice}>{formatCurrency(r.unit_price ?? 0)}</Text>
              <Text style={styles.colDisc}>
                {(r.discount_percent ?? 0) > 0 ? `${r.discount_percent}%` : '—'}
              </Text>
              <Text style={styles.colSum}>
                {formatCurrency(
                  rowSum(r.quantity ?? 1, r.unit_price ?? 0, r.discount_percent ?? 0)
                )}
              </Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={styles.colSpec}>Totalt per månad</Text>
            <Text style={styles.colBind}></Text>
            <Text style={styles.colContract}></Text>
            <Text style={styles.colQty}></Text>
            <Text style={styles.colPrice}></Text>
            <Text style={styles.colDisc}></Text>
            <Text style={styles.colSum}>{formatCurrency(monthlyTotal)}</Text>
          </View>
        </View>

        <View style={styles.summaryBlock}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Summering</Text>
          <View style={styles.summaryRow}>
            <Text>Engångskostnad:</Text>
            <Text>{formatCurrency(oneTimeTotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Månadskostnad:</Text>
            <Text>{formatCurrency(monthlyTotal)} kr/mån</Text>
          </View>
          {discountPercent > 0 && (
            <View style={styles.summaryRow}>
              <Text>Offertrabatt:</Text>
              <Text>-{formatCurrency(quoteDiscountAmount)}</Text>
            </View>
          )}
          <View style={styles.summaryRowBold}>
            <Text>Totalt engång ex. moms:</Text>
            <Text>{formatCurrency(oneTimeAfter)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Moms (25%):</Text>
            <Text>{formatCurrency(moms25)}</Text>
          </View>
          <View style={styles.summaryRowBold}>
            <Text>Totalt engång inkl. moms:</Text>
            <Text>{formatCurrency(oneTimeInclMoms)}</Text>
          </View>
          <View style={styles.summaryRowBold}>
            <Text>Månadskostnad inkl. moms:</Text>
            <Text>{formatCurrency(monthlyInclMoms)} kr/mån</Text>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            <Text style={{ fontWeight: 'bold' }}>Betalningsvillkor:</Text> 30 dagar netto från
            fakturadatum.
          </Text>
          <Text style={[styles.termsText, { marginTop: 8 }]}>
            <Text style={{ fontWeight: 'bold' }}>Giltighetstid:</Text> Offerten gäller till{' '}
            {validUntilDate}.
          </Text>
          {notes && (
            <Text style={[styles.termsText, { marginTop: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Övriga villkor:</Text> {notes}
            </Text>
          )}
        </View>

        <View style={styles.signSection}>
          <Text style={styles.signTitle}>Signering</Text>
          <Text style={styles.signPlaceholder}>
            Signera offerten digitalt via länken som skickats till er e-post.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>EasyPartner — Kontakta oss för frågor om denna offert</Text>
        </View>
      </Page>
    </Document>
  );
}
