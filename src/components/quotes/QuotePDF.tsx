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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
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
    fontSize: 18,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a2a4a',
  },
  date: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  customerSection: {
    marginBottom: 30,
    padding: 16,
    backgroundColor: '#faf8f5',
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
    marginTop: 20,
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4a6fa5',
    color: 'white',
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8dfd0',
  },
  col1: { width: '60%' },
  col2: { width: '20%', textAlign: 'center' },
  col3: { width: '20%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f0f4ff',
    marginTop: 4,
    fontWeight: 'bold',
    fontSize: 12,
  },
  termsSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e8dfd0',
  },
  termsText: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
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

interface QuoteService {
  name: string;
  price: number;
  quantity?: number;
}

interface LineItemRow {
  type?: string;
  specification: string;
  quantity?: number;
  unit_price?: number;
  binding_period?: string;
  contract_period?: string;
}

interface QuotePDFProps {
  quoteId: string;
  quoteNumber?: string | null;
  createdAt: string;
  customerName: string;
  customerCompany: string | null;
  services?: QuoteService[];
  lineItems?: LineItemRow[];
  totalAmount: number;
  validUntil?: string | null;
  notes?: string | null;
}

export function QuotePDF({
  quoteId,
  quoteNumber,
  createdAt,
  customerName,
  customerCompany,
  services = [],
  lineItems = [],
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

  const oneTime = lineItems.filter((i) => i.type === 'one_time');
  const monthly = lineItems.filter((i) => i.type === 'monthly');
  const hasLineItems = oneTime.length > 0 || monthly.length > 0;
  const rows = hasLineItems
    ? [
        ...oneTime.map((r) => ({ spec: r.specification, qty: r.quantity ?? 1, price: r.unit_price ?? 0 })),
        ...monthly.map((r) => ({ spec: r.specification, qty: r.quantity ?? 1, price: r.unit_price ?? 0 })),
      ]
    : services.map((s) => ({ spec: s.name, qty: s.quantity ?? 1, price: s.price }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View>
              <Text style={styles.logoText}>EasyPartner OS</Text>
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

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.col1}>Specifikation</Text>
            <Text style={styles.col2}>Antal</Text>
            <Text style={styles.col3}>Pris</Text>
          </View>
          {rows.map((r, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{r.spec}</Text>
              <Text style={styles.col2}>{r.qty.toString()}</Text>
              <Text style={styles.col3}>{formatCurrency(r.price)}</Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={styles.col1}>Totalsumma</Text>
            <Text style={styles.col2}></Text>
            <Text style={styles.col3}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            <Text style={{ fontWeight: 'bold' }}>Betalningsvillkor:</Text> 30 dagar netto från fakturadatum.
          </Text>
          <Text style={[styles.termsText, { marginTop: 8 }]}>
            <Text style={{ fontWeight: 'bold' }}>Giltighetstid:</Text> Offerten gäller till {validUntilDate}.
          </Text>
          {notes && (
            <Text style={[styles.termsText, { marginTop: 8 }]}>
              <Text style={{ fontWeight: 'bold' }}>Övriga villkor:</Text> {notes}
            </Text>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>EasyPartner OS — Kontakta oss för frågor om denna offert</Text>
        </View>
      </Page>
    </Document>
  );
}
