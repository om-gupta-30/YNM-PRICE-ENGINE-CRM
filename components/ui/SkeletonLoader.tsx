'use client';

import { memo } from 'react';

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
  variant?: 'card' | 'text' | 'button' | 'input';
}

function SkeletonLoader({ className = '', lines = 1, variant = 'text' }: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div className={`glassmorphic-premium rounded-3xl p-12 animate-pulse ${className}`}>
        <div className="h-8 bg-white/10 rounded-lg mb-4 w-3/4"></div>
        <div className="h-4 bg-white/10 rounded-lg mb-2 w-full"></div>
        <div className="h-4 bg-white/10 rounded-lg mb-2 w-5/6"></div>
        <div className="h-4 bg-white/10 rounded-lg w-4/6"></div>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <div className={`h-12 bg-white/10 rounded-xl animate-pulse ${className}`}></div>
    );
  }

  if (variant === 'input') {
    return (
      <div className={`h-12 bg-white/10 rounded-xl animate-pulse ${className}`}></div>
    );
  }

  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-white/10 rounded-lg mb-2 animate-pulse"
          style={{
            width: index === lines - 1 ? '75%' : '100%',
            animationDelay: `${index * 0.1}s`,
          }}
        ></div>
      ))}
    </div>
  );
}

export default memo(SkeletonLoader);

