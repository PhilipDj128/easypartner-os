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
    <div
      className="group relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
            {label}
          </p>
          {icon && (
            <div style={{ color: 'var(--muted-foreground)' }}>
              {icon}
            </div>
          )}
        </div>
        <p
          className="mt-3 font-heading text-2xl font-bold tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          {value}
        </p>
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs"
              style={{
                background:
                  trend === 'up'
                    ? 'rgba(34,197,94,0.1)'
                    : trend === 'down'
                    ? 'rgba(239,68,68,0.1)'
                    : 'rgba(255,255,255,0.05)',
                color:
                  trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : 'var(--muted-foreground)',
              }}
            >
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'neutral' && '−'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
