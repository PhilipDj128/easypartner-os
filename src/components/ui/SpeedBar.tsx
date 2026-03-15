'use client';

export function SpeedBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct < 50 ? '#f87171' : pct <= 70 ? '#fbbf24' : '#4ade80';
  return (
    <div className="speed-bar">
      <div
        className="speed-bar-fill transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
