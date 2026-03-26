export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface Issue {
  category: string;
  message: string;
  severity: IssueSeverity;
  details?: string;
}

export interface CategoryResult {
  name: string;
  score: number;
  maxScore: number;
  issues: Issue[];
}

export interface SEOAnalysis {
  score: number;
  maxScore: number;
  categories: CategoryResult[];
  issues: Issue[];
  recommendations: string[];
}

export interface CoreWebVitals {
  lcp: string;
  cls: string;
  tbt: string;
  speedIndex: string;
}

export interface PageSpeedResult {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  vitals: CoreWebVitals;
}

export interface PageSpeedData {
  mobile: PageSpeedResult | null;
  desktop: PageSpeedResult | null;
}

export interface SearchQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface IndexStatus {
  url: string;
  coverageState: string;
  indexingState: string;
  lastCrawlTime?: string;
}

export interface SitemapResult {
  path: string;
  submitted: number;
  indexed: number;
}

export interface GSCData {
  topQueries: SearchQuery[];
  indexStatus: IndexStatus[];
  sitemapStatus: SitemapResult[];
}

export interface AuditResult {
  id?: string;
  url: string;
  siteUrl?: string;
  seoScore: number;
  onPageAnalysis: SEOAnalysis;
  pagespeedMobile: PageSpeedResult | null;
  pagespeedDesktop: PageSpeedResult | null;
  gscData: GSCData | null;
  issues: Issue[];
  recommendations: string[];
  createdAt?: string;
}
