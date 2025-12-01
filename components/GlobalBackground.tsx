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

// Main GlobalBackground component - disabled for performance
const GlobalBackground = memo(() => {
  // All background effects disabled for Windows laptop performance
  return null;
});

GlobalBackground.displayName = 'GlobalBackground';

export default GlobalBackground;

