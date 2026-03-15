'use client';

import { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: ReactNode;
}

export function KPICard({ label, value, trend, icon }: KPICardProps) {
  return (
    <div className="card relative p-5">
      {icon && (
        <div className="absolute right-4 top-4 text-[var(--muted-foreground)]">
          {icon}
        </div>
      )}
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 font-heading text-[22px] font-semibold text-[var(--foreground)]" style={{ fontWeight: 600 }}>
        {value}
      </p>
      {trend !== undefined && (
        <p
          className={`mt-1 text-xs ${
            trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-400' : 'text-[var(--muted)]'
          }`}
        >
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'neutral' && '−'}
        </p>
      )}
    </div>
  );
}
