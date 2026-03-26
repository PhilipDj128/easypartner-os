import * as cheerio from 'cheerio';
import type { SEOAnalysis, CategoryResult, Issue } from '@/types/audit';

export async function analyzeSEO(url: string): Promise<SEOAnalysis> {
  const categories: CategoryResult[] = [];
  const allIssues: Issue[] = [];
  const recommendations: string[] = [];

  let html = '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EasyPartner SEO Audit Bot/1.0' },
    });
    clearTimeout(timeout);
    html = await res.text();
  } catch (e) {
    console.error('Failed to fetch URL:', e);
    return { score: 0, maxScore: 100, categories: [], issues: [{ category: 'Fetch', message: `Kunde inte ladda ${url}`, severity: 'critical' }], recommendations: ['Kontrollera att URL:en är tillgänglig'] };
  }

  const $ = cheerio.load(html);
  const parsedUrl = new URL(url);

  // 1. Title tag (10p)
  {
    const cat: CategoryResult = { name: 'Title tag', score: 0, maxScore: 10, issues: [] };
    const title = $('title').text().trim();
    if (!title) {
      cat.issues.push({ category: 'Title', message: 'Title-tag saknas', severity: 'critical' });
      recommendations.push('Lägg till en unik title-tag på sidan');
    } else {
      cat.score += 4;
      if (title.length >= 30 && title.length <= 60) {
        cat.score += 4;
      } else {
        cat.issues.push({ category: 'Title', message: `Title är ${title.length} tecken (rekommenderat: 30-60)`, severity: 'warning' });
        recommendations.push('Justera title-taggen till 30-60 tecken');
        cat.score += 2;
      }
      // Check if title seems keyword-relevant (has >2 words)
      if (title.split(/\s+/).length >= 2) cat.score += 2;
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 2. Meta description (8p)
  {
    const cat: CategoryResult = { name: 'Meta description', score: 0, maxScore: 8, issues: [] };
    const desc = $('meta[name="description"]').attr('content')?.trim() || '';
    if (!desc) {
      cat.issues.push({ category: 'Meta', message: 'Meta description saknas', severity: 'critical' });
      recommendations.push('Lägg till en meta description (120-155 tecken)');
    } else {
      cat.score += 3;
      if (desc.length >= 120 && desc.length <= 155) {
        cat.score += 3;
      } else {
        cat.issues.push({ category: 'Meta', message: `Meta description är ${desc.length} tecken (rekommenderat: 120-155)`, severity: 'warning' });
        cat.score += 1;
      }
      // Check for CTA-like words
      if (/kontakta|boka|läs|upptäck|prova|gratis|ring|click|learn|get|try|free/i.test(desc)) {
        cat.score += 2;
      } else {
        cat.issues.push({ category: 'Meta', message: 'Meta description saknar tydlig CTA', severity: 'info' });
        cat.score += 1;
      }
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 3. H1 (8p)
  {
    const cat: CategoryResult = { name: 'H1-rubrik', score: 0, maxScore: 8, issues: [] };
    const h1s = $('h1');
    if (h1s.length === 0) {
      cat.issues.push({ category: 'H1', message: 'H1-rubrik saknas', severity: 'critical' });
      recommendations.push('Lägg till exakt en H1-rubrik på sidan');
    } else if (h1s.length === 1) {
      cat.score += 5;
      const h1Text = h1s.first().text().trim();
      if (h1Text.length > 5) cat.score += 3;
    } else {
      cat.score += 2;
      cat.issues.push({ category: 'H1', message: `${h1s.length} H1-rubriker hittades (ska vara exakt 1)`, severity: 'warning' });
      recommendations.push('Behåll bara en H1-rubrik per sida');
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 4. Heading hierarchy (5p)
  {
    const cat: CategoryResult = { name: 'Rubrikhierarki', score: 0, maxScore: 5, issues: [] };
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    if (h2Count >= 2) {
      cat.score += 3;
    } else if (h2Count >= 1) {
      cat.score += 2;
      cat.issues.push({ category: 'Headings', message: 'Bara 1 H2-rubrik (rekommenderat: minst 2)', severity: 'info' });
    } else {
      cat.issues.push({ category: 'Headings', message: 'Inga H2-rubriker hittades', severity: 'warning' });
      recommendations.push('Lägg till H2-rubriker för att strukturera innehållet');
    }
    if (h3Count > 0 && h2Count > 0) cat.score += 2;
    else if (h2Count > 0) cat.score += 1;
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 5. Images (8p)
  {
    const cat: CategoryResult = { name: 'Bilder', score: 0, maxScore: 8, issues: [] };
    const imgs = $('img');
    const total = imgs.length;
    if (total === 0) {
      cat.score += 8; // No images = no issues
    } else {
      let withAlt = 0;
      let webp = 0;
      let lazy = 0;
      imgs.each((_, el) => {
        const $el = $(el);
        if ($el.attr('alt')?.trim()) withAlt++;
        const src = $el.attr('src') || '';
        if (src.includes('.webp') || src.includes('format=webp')) webp++;
        if ($el.attr('loading') === 'lazy' || $el.attr('decoding') === 'async') lazy++;
      });
      const altRatio = withAlt / total;
      if (altRatio >= 1) cat.score += 4;
      else if (altRatio >= 0.7) { cat.score += 2; cat.issues.push({ category: 'Images', message: `${total - withAlt} bilder saknar alt-text`, severity: 'warning' }); }
      else { cat.issues.push({ category: 'Images', message: `${total - withAlt} av ${total} bilder saknar alt-text`, severity: 'critical' }); recommendations.push('Lägg till beskrivande alt-text på alla bilder'); }

      if (webp / total >= 0.5) cat.score += 2;
      else cat.issues.push({ category: 'Images', message: 'Bilder använder inte WebP-format', severity: 'info' });

      if (lazy / total >= 0.5) cat.score += 2;
      else cat.issues.push({ category: 'Images', message: 'Bilder saknar lazy loading', severity: 'info' });
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 6. Schema markup (10p)
  {
    const cat: CategoryResult = { name: 'Schema markup', score: 0, maxScore: 10, issues: [] };
    const jsonLd = $('script[type="application/ld+json"]');
    if (jsonLd.length > 0) {
      cat.score += 5;
      let hasLocal = false;
      jsonLd.each((_, el) => {
        const text = $(el).html() || '';
        if (/LocalBusiness|Service|FAQ|Organization|WebSite/i.test(text)) hasLocal = true;
      });
      if (hasLocal) cat.score += 5;
      else { cat.score += 2; cat.issues.push({ category: 'Schema', message: 'Schema-typ LocalBusiness/Service/FAQ saknas', severity: 'info' }); }
    } else {
      cat.issues.push({ category: 'Schema', message: 'Ingen JSON-LD schema markup hittades', severity: 'warning' });
      recommendations.push('Lägg till JSON-LD schema markup (t.ex. LocalBusiness)');
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 7. Internal links (7p)
  {
    const cat: CategoryResult = { name: 'Intern länkstruktur', score: 0, maxScore: 7, issues: [] };
    const internalLinks = $('a[href]').filter((_, el) => {
      const href = $(el).attr('href') || '';
      return href.startsWith('/') || href.includes(parsedUrl.hostname);
    }).length;
    if (internalLinks >= 5) cat.score += 7;
    else if (internalLinks >= 3) cat.score += 5;
    else if (internalLinks >= 1) { cat.score += 2; cat.issues.push({ category: 'Links', message: `Bara ${internalLinks} interna länkar (rekommenderat: minst 3)`, severity: 'warning' }); }
    else { cat.issues.push({ category: 'Links', message: 'Inga interna länkar hittades', severity: 'critical' }); recommendations.push('Lägg till minst 3 interna länkar'); }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 8. Canonical URL (5p)
  {
    const cat: CategoryResult = { name: 'Canonical URL', score: 0, maxScore: 5, issues: [] };
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) {
      cat.score += 5;
    } else {
      cat.issues.push({ category: 'Canonical', message: 'Canonical URL saknas', severity: 'warning' });
      recommendations.push('Lägg till en canonical URL-tag');
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 9. Open Graph (5p)
  {
    const cat: CategoryResult = { name: 'Open Graph', score: 0, maxScore: 5, issues: [] };
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogTitle) cat.score += 2;
    else cat.issues.push({ category: 'OG', message: 'og:title saknas', severity: 'info' });
    if (ogDesc) cat.score += 1;
    if (ogImage) cat.score += 2;
    else cat.issues.push({ category: 'OG', message: 'og:image saknas', severity: 'info' });
    if (cat.score < 5) recommendations.push('Lägg till Open Graph-taggar för bättre delning i sociala medier');
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 10. Hreflang (3p)
  {
    const cat: CategoryResult = { name: 'Hreflang', score: 0, maxScore: 3, issues: [] };
    const hreflang = $('link[rel="alternate"][hreflang]');
    if (hreflang.length > 0) {
      cat.score += 3;
    } else {
      // Not critical — only relevant for multilingual sites
      cat.score += 2;
      cat.issues.push({ category: 'Hreflang', message: 'Ingen hreflang-tagg (OK om enspråkig sajt)', severity: 'info' });
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 11. Robots meta (5p)
  {
    const cat: CategoryResult = { name: 'Robots meta', score: 0, maxScore: 5, issues: [] };
    const robots = $('meta[name="robots"]').attr('content') || '';
    if (robots.includes('noindex')) {
      cat.issues.push({ category: 'Robots', message: 'Sidan är markerad som noindex', severity: 'critical' });
      recommendations.push('Ta bort noindex om sidan ska synas i Google');
    } else {
      cat.score += 5;
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 12. URL structure (5p)
  {
    const cat: CategoryResult = { name: 'URL-struktur', score: 0, maxScore: 5, issues: [] };
    const path = parsedUrl.pathname;
    if (path === path.toLowerCase()) cat.score += 1;
    else cat.issues.push({ category: 'URL', message: 'URL innehåller versaler', severity: 'info' });
    if (!parsedUrl.search) cat.score += 1;
    else cat.issues.push({ category: 'URL', message: 'URL innehåller query-parametrar', severity: 'info' });
    if (path.includes('-') || path === '/') cat.score += 1;
    if (path.length <= 80) cat.score += 1;
    else cat.issues.push({ category: 'URL', message: 'URL-path är längre än 80 tecken', severity: 'info' });
    if (!path.includes('_') && !path.includes('%20')) cat.score += 1;
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 13. Mobile friendliness (8p)
  {
    const cat: CategoryResult = { name: 'Mobilvänlighet', score: 0, maxScore: 8, issues: [] };
    const viewport = $('meta[name="viewport"]').attr('content') || '';
    if (viewport.includes('width=device-width')) {
      cat.score += 8;
    } else if (viewport) {
      cat.score += 4;
      cat.issues.push({ category: 'Mobile', message: 'Viewport-tagg finns men saknar width=device-width', severity: 'warning' });
    } else {
      cat.issues.push({ category: 'Mobile', message: 'Viewport meta-tag saknas', severity: 'critical' });
      recommendations.push('Lägg till <meta name="viewport" content="width=device-width, initial-scale=1">');
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  // 14. HTTPS (3p)
  {
    const cat: CategoryResult = { name: 'HTTPS-säkerhet', score: 0, maxScore: 3, issues: [] };
    if (parsedUrl.protocol === 'https:') {
      cat.score += 3;
    } else {
      cat.issues.push({ category: 'Security', message: 'Sajten använder inte HTTPS', severity: 'critical' });
      recommendations.push('Aktivera HTTPS med SSL-certifikat');
    }
    categories.push(cat);
    allIssues.push(...cat.issues);
  }

  const totalScore = categories.reduce((s, c) => s + c.score, 0);

  return {
    score: totalScore,
    maxScore: 100,
    categories,
    issues: allIssues.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    }),
    recommendations,
  };
}
