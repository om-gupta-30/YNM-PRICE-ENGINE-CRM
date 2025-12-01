'use client';

import { useMemo } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import ParticleBackground from '@/components/animations/ParticleBackground';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import LogoutButton from '@/components/layout/LogoutButton';
import { ReactNode } from 'react';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // Memoize children to prevent unnecessary re-renders
  const memoizedChildren = useMemo(() => children, [children]);

  return (
    <>
      <ParticleBackground />
      <div className="relative z-0 pointer-events-auto">
        <div className="w-full flex items-center justify-center pt-6 pb-2 relative px-8">
          <div className="absolute left-8 top-6">
            <LogoutButton />
          </div>
          <Breadcrumbs />
          <div className="absolute right-8 top-6 flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
        {memoizedChildren}
      </div>
    </>
  );
}

