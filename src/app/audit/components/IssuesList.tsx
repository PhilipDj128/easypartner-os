'use client';

import type { Issue } from '@/types/audit';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20', label: 'Kritisk' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', label: 'Varning' },
  info: { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', label: 'Info' },
};

export function IssuesList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return (
      <div className="card rounded-xl p-8 text-center">
        <p className="text-emerald-400 font-medium">Inga issues hittades!</p>
      </div>
    );
  }

  const critical = issues.filter((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const info = issues.filter((i) => i.severity === 'info');

  return (
    <div className="space-y-4">
      <div className="flex gap-3 text-sm">
        <span className="rounded-full bg-rose-400/10 px-3 py-1 text-rose-400">{critical.length} kritiska</span>
        <span className="rounded-full bg-amber-400/10 px-3 py-1 text-amber-400">{warnings.length} varningar</span>
        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-cyan-400">{info.length} info</span>
      </div>
      <div className="space-y-2">
        {issues.map((issue, idx) => {
          const config = severityConfig[issue.severity];
          const Icon = config.icon;
          return (
            <div key={idx} className={`flex items-start gap-3 rounded-lg border ${config.border} ${config.bg} p-3`}>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
              <div>
                <span className={`text-xs font-medium uppercase ${config.color}`}>{config.label}</span>
                <p className="text-sm text-[var(--foreground)]">{issue.message}</p>
                {issue.details && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{issue.details}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
