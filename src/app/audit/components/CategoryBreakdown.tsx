'use client';

import type { CategoryResult } from '@/types/audit';

export function CategoryBreakdown({ categories }: { categories: CategoryResult[] }) {
  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const pct = Math.round((cat.score / cat.maxScore) * 100);
        const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
        return (
          <div key={cat.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--foreground)]">{cat.name}</span>
              <span className="text-[var(--muted-foreground)]">{cat.score}/{cat.maxScore}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/5">
              <div
                className={`h-2.5 rounded-full ${color} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
