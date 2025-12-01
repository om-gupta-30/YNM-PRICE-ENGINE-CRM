'use client';

import { memo } from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  className?: string;
}

function ProgressBar({ progress, label, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-300 font-medium">{label}</span>
          <span className="text-sm text-brand-gold font-semibold">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-primary via-brand-gold to-brand-primary rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
}

export default memo(ProgressBar);

