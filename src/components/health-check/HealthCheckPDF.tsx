import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { HealthCheckResult } from '@/lib/health-check';

const colors = {
  slate: '#475569',
  slateBlue: '#334155',
  sand: '#faf8f5',
  sandBorder: '#e8e4dc',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.slateBlue,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.slateBlue,
  },
  tagline: {
    fontSize: 9,
    color: colors.slate,
    marginTop: 2,
  },
  sender: {
    textAlign: 'right',
  },
  senderLabel: {
    fontSize: 9,
    color: colors.slate,
    marginBottom: 2,
  },
  senderValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.slateBlue,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.slateBlue,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.slateBlue,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionText: {
    fontSize: 10,
    color: colors.slate,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  table: {
    marginTop: 8,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.slateBlue,
    color: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.sandBorder,
  },
  colName: { width: '45%' },
  colDomain: { width: '35%' },
  colRank: { width: '20%', textAlign: 'right' },
  highlightBox: {
    backgroundColor: '#f0f4ff',
    padding: 16,
    borderRadius: 4,
    marginTop: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.slateBlue,
  },
  lostAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.slateBlue,
  },
  lostLabel: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 4,
  },
  cta: {
    marginTop: 30,
    padding: 20,
    backgroundColor: colors.sand,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.sandBorder,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.slateBlue,
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: 10,
    color: colors.slate,
    textAlign: 'center',
    marginTop: 6,
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

interface HealthCheckPDFProps {
  data: HealthCheckResult;
}

export function HealthCheckPDF({ data }: HealthCheckPDFProps) {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      maximumFractionDigits: 0,
    }).format(n);

  const estimatedLossKr = data.estimated_lost_customers_per_month * 500;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View>
              <Text style={styles.logoText}>{data.company_name}</Text>
              <Text style={styles.tagline}>{data.website}</Text>
            </View>
          </View>
          <View style={styles.sender}>
            <Text style={styles.senderLabel}>Avsändare</Text>
            <Text style={styles.senderValue}>EasyPartner OS</Text>
          </View>
        </View>

        <Text style={styles.title}>Digital Hälsokoll — {data.company_name}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vad vi hittade</Text>
          <Text style={styles.sectionText}>SEO-poäng: {data.seo_score}/100</Text>
          <Text style={styles.sectionText}>Laddningstid: {data.load_time_ms} ms</Text>
          {data.title && <Text style={styles.sectionText}>Title: {data.title}</Text>}
          {data.meta_description && (
            <Text style={styles.sectionText}>Meta description: {data.meta_description.slice(0, 100)}…</Text>
          )}
          {data.seo_findings.length > 0 && (
            <>
              <Text style={[styles.sectionText, { marginTop: 8 }]}>Upptäckta problem:</Text>
              {data.seo_findings.map((f, i) => (
                <Text key={i} style={styles.sectionText}>• {f}</Text>
              ))}
            </>
          )}
          {data.name_rank != null && (
            <Text style={[styles.sectionText, { marginTop: 4 }]}>
              Google-ranking för företagsnamn: #{data.name_rank}
            </Text>
          )}
        </View>

        {data.competitors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Konkurrentjämförelse</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.colName}>Konkurrent</Text>
                <Text style={styles.colDomain}>Domän</Text>
                <Text style={styles.colRank}>Ranking</Text>
              </View>
              {data.competitors.map((c, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.colName}>{c.name}</Text>
                  <Text style={styles.colDomain}>{c.domain}</Text>
                  <Text style={styles.colRank}>#{c.rank}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vad det kostar er</Text>
          <View style={styles.highlightBox}>
            <Text style={styles.lostAmount}>{formatCurrency(estimatedLossKr)}</Text>
            <Text style={styles.lostLabel}>
              Beräknad intäktsförlust per månad (ca {data.estimated_lost_customers_per_month} förlorade kunder × 500 kr/kund)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vad vi kan göra</Text>
          <Text style={styles.sectionText}>
            Vi på EasyPartner kan hjälpa er att förbättra er digitala närvaro, öka synligheten i Google
            och växa era intäkter. Kontakta oss för ett kostnadsfritt samtal.
          </Text>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Kontakta oss idag</Text>
          <Text style={styles.ctaSub}>EasyPartner OS — Din digitala partner</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Digital Hälsokoll genererad av EasyPartner OS</Text>
        </View>
      </Page>
    </Document>
  );
}
