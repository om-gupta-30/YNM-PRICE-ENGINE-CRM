'use client';

import Image from 'next/image';
import { shouldDisableAnimations } from '@/lib/utils/performanceUtils';

interface GlobalLoaderProps {
  isLoading: boolean;
  message?: string;
}

export default function GlobalLoader({ isLoading, message = 'Loading...' }: GlobalLoaderProps) {
  if (!isLoading) return null;

  // Simplified for performance - no framer-motion
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center backdrop-blur-sm pointer-events-auto"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        opacity: isLoading ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      {/* Blurred background overlay - reduced for performance */}
      <div className="absolute inset-0 backdrop-blur-sm" />

      {/* Loader content - simplified for performance */}
      <div className="relative z-10 flex flex-col items-center">
            {/* Circular loader - simplified */}
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 border-4 border-transparent border-t-brand-primary border-r-brand-gold rounded-full" style={{ animation: 'spin 1s linear infinite' }} />
            </div>

            {/* Mascot - static for performance */}
            <div className="relative w-16 h-16 mb-2">
              <Image
                src="/YNM_Mascot-removebg-preview.png"
                alt="YNM Mascot"
                fill
                sizes="64px"
                className="object-contain"
                priority
                unoptimized
              />
            </div>

            {/* Loading message */}
            <p
              className="text-white font-semibold text-lg"
              style={{
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              }}
            >
              {message}
            </p>
      </div>
    </div>
  );
}

