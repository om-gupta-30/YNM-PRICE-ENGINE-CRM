'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { shouldDisableAnimations } from '@/lib/utils/performanceUtils';

interface LandingAnimationProps {
  onComplete: () => void;
}

export default function LandingAnimation({ onComplete }: LandingAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 200); // Reduced from 500ms to 200ms
    }, 1000); // Reduced from 2 seconds to 1 second

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Particles disabled for performance

  // Simplified for performance - minimal animation
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-auto"
      style={{
        background: 'linear-gradient(135deg, #f8eee7 0%, rgba(116, 6, 13, 0.1) 50%, rgba(209, 168, 90, 0.15) 100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
          {/* Particles disabled for performance */}

          {/* Main content - simplified for performance */}
          <div className="flex flex-col items-center justify-center relative z-10">
            {/* Mascot - static for performance */}
            <div className="relative w-48 h-48 mb-8">
              <Image
                src="/YNM_Mascot-removebg-preview.png"
                alt="YNM Mascot"
                fill
                sizes="192px"
                className="object-contain drop-shadow-2xl"
                priority
                unoptimized
              />
            </div>

            {/* Company name */}
            <h1
              className="text-5xl md:text-7xl font-extrabold text-brand-primary mb-2"
              style={{
                textShadow: '0 0 20px rgba(116, 6, 13, 0.3)',
                letterSpacing: '-0.02em',
              }}
            >
              YNM SAFETY
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-brand-primary/80 font-semibold">
              Price Engine
            </p>
          </div>

          {/* Shimmer effect - disabled for performance */}
        </div>
  );
}

