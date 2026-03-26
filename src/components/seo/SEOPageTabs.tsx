'use client';

import { useState, ReactNode } from 'react';
import { SEOAudit } from './SEOAudit';

export function SEOPageTabs({ keywordTab }: { keywordTab: ReactNode }) {
  const [activeTab, setActiveTab] = useState<'audit' | 'keywords'>('audit');

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border border-[var(--border)]/10 bg-white/5 p-1">
        <button
          onClick={() => setActiveTab('audit')}
          className={`rounded-md px-5 py-2.5 text-sm font-medium transition ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Search Console Audit
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className={`rounded-md px-5 py-2.5 text-sm font-medium transition ${
            activeTab === 'keywords'
              ? 'bg-indigo-600 text-white'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Sökordsbevakning
        </button>
      </div>

      {activeTab === 'audit' ? <SEOAudit /> : keywordTab}
    </div>
  );
}
