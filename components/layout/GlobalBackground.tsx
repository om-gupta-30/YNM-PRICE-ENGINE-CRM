'use client';

import { memo } from 'react';

// Memoized particle component to prevent re-renders
const Particle = memo(({ i }: { i: number }) => {
  const size = 50 + (i * 8);
  const left = (i * 7) % 100;
  const top = (i * 11) % 100;
  const delay = i * 1.5;
  const duration = 20 + (i % 8);
  
  return (
    <div
      className="particle"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        left: `${left}%`,
        top: `${top}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
});

Particle.displayName = 'Particle';

// Memoized ambient node component
const AmbientNode = memo(({ i }: { i: number }) => {
  const left = (i * 13) % 100;
  const top = (i * 17) % 100;
  const delay = i * 0.3;
  const duration = 3 + (i % 3);
  
  return (
    <div
      className="ambient-node"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
});

AmbientNode.displayName = 'AmbientNode';

// Memoized glow orb component
const GlowOrb = memo(({ 
  className, 
  style 
}: { 
  className: string; 
  style: React.CSSProperties 
}) => {
  return <div className={`glow-orb ${className}`} style={style} />;
});

GlowOrb.displayName = 'GlowOrb';

// Main GlobalBackground component - rendered once, never re-renders
const GlobalBackground = memo(() => {
  // Reduced particle count for better performance (8 particles instead of 15)
  const particles = Array.from({ length: 8 }, (_, i) => i + 1);
  // Reduced ambient nodes (10 instead of 20)
  const ambientNodes = Array.from({ length: 10 }, (_, i) => i + 1);
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0" style={{ transform: 'translateZ(0)' }}>
      {/* Floating particles - optimized count */}
      <div className="particles">
        {particles.map((i) => (
          <Particle key={i} i={i} />
        ))}
      </div>
      
      {/* Ambient glow nodes - optimized count */}
      <div className="ambient-nodes">
        {ambientNodes.map((i) => (
          <AmbientNode key={i} i={i} />
        ))}
      </div>
      
      {/* Floating glow orbs - memoized */}
      <GlowOrb 
        className="bg-brand-gold/30" 
        style={{
          width: '400px',
          height: '400px',
          left: '10%',
          top: '20%',
          animationDelay: '0s',
        }} 
      />
      <GlowOrb 
        className="bg-brand-primary/30" 
        style={{
          width: '300px',
          height: '300px',
          right: '15%',
          bottom: '30%',
          animationDelay: '5s',
        }} 
      />
      <GlowOrb 
        className="bg-brand-gold/20" 
        style={{
          width: '350px',
          height: '350px',
          left: '50%',
          top: '60%',
          animationDelay: '10s',
        }} 
      />
    </div>
  );
});

GlobalBackground.displayName = 'GlobalBackground';

export default GlobalBackground;

