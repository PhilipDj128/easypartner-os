'use client';

import type { GSCData } from '@/types/audit';

export function SearchConsoleData({ data }: { data: GSCData }) {
  return (
    <div className="space-y-6">
      {/* Top Queries */}
      <div>
        <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          Topp-sökord (senaste 28 dagarna)
        </h4>
        {data.topQueries.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Ingen data tillgänglig</p>
        ) : (
          <div className="card overflow-hidden rounded-xl">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="border-b border-[var(--border)]/[0.06] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Sökord
                  </th>
                  <th className="border-b border-[var(--border)]/[0.06] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Klick
                  </th>
                  <th className="border-b border-[var(--border)]/[0.06] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Visningar
                  </th>
                  <th className="border-b border-[var(--border)]/[0.06] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    CTR
                  </th>
                  <th className="border-b border-[var(--border)]/[0.06] px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Position
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topQueries.slice(0, 20).map((q) => (
                  <tr key={q.query} className="table-row-hover border-b border-[var(--border)]/[0.04]">
                    <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{q.query}</td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                      {q.clicks.toLocaleString('sv-SE')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">
                      {q.impressions.toLocaleString('sv-SE')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-[var(--muted-foreground)]">{q.ctr}%</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span
                        className={
                          q.position <= 3
                            ? 'font-semibold text-emerald-400'
                            : q.position <= 10
                              ? 'text-amber-400'
                              : 'text-[var(--muted-foreground)]'
                        }
                      >
                        {q.position}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sitemap Status */}
      {data.sitemapStatus.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Sitemap-status
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.sitemapStatus.map((sm) => (
              <div key={sm.path} className="card rounded-xl p-4">
                <p className="truncate text-sm font-medium text-[var(--foreground)]" title={sm.path}>
                  {sm.path}
                </p>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-[var(--muted-foreground)]">
                    Inskickade: <span className="text-[var(--foreground)]">{sm.submitted}</span>
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    Indexerade: <span className="text-emerald-400">{sm.indexed}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
