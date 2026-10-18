import React from 'react';

interface ScoreRingProps {
  score: number; // 0–100
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  provisional?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { ring: 60, stroke: 5, fontSize: 'text-lg', labelSize: 'text-[10px]', scoreSuffix: 'text-sm' },
  md: { ring: 88, stroke: 7, fontSize: 'text-2xl', labelSize: 'text-xs', scoreSuffix: 'text-base' },
  lg: { ring: 116, stroke: 8, fontSize: 'text-3xl', labelSize: 'text-xs', scoreSuffix: 'text-lg' },
  xl: { ring: 144, stroke: 10, fontSize: 'text-4xl', labelSize: 'text-sm', scoreSuffix: 'text-xl' },
};

function getScoreColor(score: number): { track: string; stroke: string; text: string } {
  if (score >= 80) return { track: 'rgba(20,184,166,0.15)', stroke: '#14b8a6', text: 'text-teal-300' };
  if (score >= 60) return { track: 'rgba(99,102,241,0.15)', stroke: '#6366f1', text: 'text-brand-300' };
  if (score >= 40) return { track: 'rgba(245,158,11,0.15)', stroke: '#f59e0b', text: 'text-amber-300' };
  return { track: 'rgba(244,63,94,0.15)', stroke: '#f43f5e', text: 'text-rose-300' };
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 'md',
  label,
  provisional = false,
  className = '',
}) => {
  const cfg = sizeConfig[size];
  const colors = getScoreColor(score);
  const clampedScore = Math.max(0, Math.min(100, score));

  const radius = (cfg.ring - cfg.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedScore / 100);
  const center = cfg.ring / 2;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg
        width={cfg.ring}
        height={cfg.ring}
        viewBox={`0 0 ${cfg.ring} ${cfg.ring}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={cfg.stroke}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-black ${cfg.fontSize} ${colors.text} leading-none`}>
          {Math.round(clampedScore)}
        </span>
        {label && (
          <span className={`${cfg.labelSize} text-slate-500 font-medium mt-0.5`}>{label}</span>
        )}
        {provisional && (
          <span className="text-[10px] text-amber-400 mt-0.5">~</span>
        )}
      </div>
    </div>
  );
};
