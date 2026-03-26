'use client';

export function ScoreCircle({ score, maxScore = 100, size = 140 }: { score: number; maxScore?: number; size?: number }) {
  const pct = Math.round((score / maxScore) * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
  const bgColor = pct >= 80 ? 'rgba(34,197,94,0.1)' : pct >= 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)';
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={bgColor}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="transform rotate-90 origin-center"
          fill={color}
          fontSize={size * 0.28}
          fontWeight="700"
        >
          {score}
        </text>
      </svg>
      <p className="text-sm font-medium text-[var(--muted-foreground)]">{score} / {maxScore}</p>
    </div>
  );
}
