'use client';

import { useMemo, useEffect, useState } from 'react';
import ParticleBackground from '@/components/animations/ParticleBackground';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import LogoutButton from '@/components/layout/LogoutButton';
import ActivityTracker from '@/components/utils/ActivityTracker';
import UserStatusIndicator from '@/components/ui/UserStatusIndicator';
import NotificationBell from '@/components/ui/NotificationBell';
import { ReactNode } from 'react';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // Memoize children to prevent unnecessary re-renders
  const memoizedChildren = useMemo(() => children, [children]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

  return (
    <>
      {/* ParticleBackground disabled for performance on Windows laptops */}
      {/* <ParticleBackground /> */}
      {/* Activity Tracker - monitors user activity for employees */}
      <ActivityTracker isAdmin={isAdmin} />
      <div className="relative z-0 pointer-events-auto">
        <div className="w-full flex items-center justify-center pt-3 sm:pt-4 md:pt-6 pb-2 relative px-2 sm:px-4 md:px-8">
          <div className="absolute left-2 sm:left-4 md:left-8 top-3 sm:top-4 md:top-6 flex items-center gap-3">
            <LogoutButton />
            {/* Status Indicator - shows online/away/logged out status */}
            <UserStatusIndicator isAdmin={isAdmin} />
          </div>
          <Breadcrumbs />
          <div className="absolute right-2 sm:right-4 md:right-8 top-3 sm:top-4 md:top-6">
            {mounted && username && <NotificationBell userId={username} isAdmin={isAdmin} />}
          </div>
        </div>
        {memoizedChildren}
      </div>
    </>
  );
}

