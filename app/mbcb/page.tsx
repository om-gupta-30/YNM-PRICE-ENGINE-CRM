'use client';

import ButtonCard from '@/components/ui/ButtonCard';

export default function MBCBPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8 sm:py-12 md:py-20 pt-16 sm:pt-20 md:pt-28 pb-20 sm:pb-32 md:pb-40 relative px-2 sm:px-4">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4">

        {/* Header with enhanced glow */}
        <div className="w-full flex flex-col items-center mb-8 sm:mb-12 md:mb-24 title-glow fade-up px-2">
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white mb-4 sm:mb-6 md:mb-8 text-center tracking-tight drop-shadow-md text-neon-gold" style={{ 
            textShadow: '0 0 10px rgba(209, 168, 90, 0.3)', /* Reduced for performance */
            letterSpacing: '-0.02em'
          }}>
            MBCB Price Engine
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-slate-200 text-center max-w-2xl mb-6 sm:mb-8 md:mb-10 px-2">
            Select a section to calculate weights and prices.
          </p>
          <div className="gold-divider w-full max-w-xs sm:max-w-md"></div>
        </div>

        {/* Section Cards with staggered animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 md:gap-12 lg:gap-16 w-full max-w-6xl mx-auto">
          <ButtonCard 
            title="W Beam" 
            href="/mbcb/w-beam" 
            icon="⚡"
            delay="0ms"
          />
          <ButtonCard 
            title="Thrie Beam" 
            href="/mbcb/thrie" 
            icon="🔧"
            delay="150ms"
          />
          <ButtonCard 
            title="Double W Beam" 
            href="/mbcb/double-w-beam" 
            icon="⚡⚡"
            delay="300ms"
          />
        </div>
      </div>
    </div>
  );
}
