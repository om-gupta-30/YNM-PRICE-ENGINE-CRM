'use client';

import ButtonCard from '@/components/ui/ButtonCard';

export default function MBCBPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-20 pt-28 pb-40 relative">
      <div className="w-full max-w-7xl mx-auto px-4">

        {/* Header with enhanced glow */}
        <div className="w-full flex flex-col items-center mb-24 title-glow fade-up">
          <h1 className="text-7xl md:text-8xl font-extrabold text-white mb-8 text-center tracking-tight drop-shadow-2xl text-neon-gold" style={{ 
            textShadow: '0 0 40px rgba(209, 168, 90, 0.4), 0 0 80px rgba(209, 168, 90, 0.2), 0 0 120px rgba(116, 6, 13, 0.1)',
            letterSpacing: '-0.02em'
          }}>
            MBCB Price Engine
          </h1>
          <p className="text-xl text-slate-200 text-center max-w-2xl mb-10">
            Select a section to calculate weights and prices.
          </p>
          <div className="gold-divider"></div>
        </div>

        {/* Section Cards with staggered animation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-6xl mx-auto">
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
