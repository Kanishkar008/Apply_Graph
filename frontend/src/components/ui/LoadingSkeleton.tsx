import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ lines = 3, className = '' }) => (
  <div className={`space-y-3 animate-pulse ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="h-4 bg-[#21262d] rounded"
        style={{ width: `${100 - (i % 3) * 15}%` }}
      />
    ))}
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr className="border-b border-[#21262d] animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-4 px-4">
        <div className="h-3.5 bg-[#21262d] rounded" style={{ width: i === 0 ? '70%' : '50%' }} />
      </td>
    ))}
  </tr>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-[#161b22] border border-[#30363d] rounded-xl p-4 animate-pulse ${className}`}>
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-[#21262d] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-[#21262d] rounded w-1/3" />
        <div className="h-6 bg-[#21262d] rounded w-1/2" />
      </div>
    </div>
  </div>
);
