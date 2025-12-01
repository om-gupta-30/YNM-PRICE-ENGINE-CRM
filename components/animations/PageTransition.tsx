'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  // Removed animations for instant page loads
  return (
    <div className="w-full relative z-0" style={{ pointerEvents: 'auto' }}>
      {children}
    </div>
  );
}

