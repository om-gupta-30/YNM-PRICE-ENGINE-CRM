'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const lastPathname = useRef<string>('');

  useEffect(() => {
    // Check authentication on mount and route change
    if (typeof window === 'undefined') {
      return;
    }

    // Prevent re-running for the same pathname
    if (lastPathname.current === pathname) {
      return;
    }
    lastPathname.current = pathname;

    setIsChecking(true);
    const auth = localStorage.getItem('auth');
    const isAuth = auth === 'true';
    
    // Public routes - allow access
    if (pathname === '/login' || pathname === '/change-password') {
      // If already authenticated on login page, redirect to home
      if (pathname === '/login' && isAuth) {
        router.replace('/home');
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      } else {
        setIsAuthenticated(true); // Allow public pages to render
        setIsChecking(false);
        return;
      }
    }

    // If user visits root path, redirect based on auth status
    if (pathname === '/') {
      if (isAuth) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }

    // Protected route - require authentication
    // This includes: /home, /mbcb, /mbcb/*, /paint, /signages, /crm, etc.
    if (!isAuth) {
      // Redirect to login immediately
      router.replace('/login');
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }
    
    // Authenticated - allow access
    setIsAuthenticated(true);
    setIsChecking(false);
  }, [pathname]); // Removed router from dependencies as it's stable

  // Show nothing while checking auth (prevents flash)
  if (isChecking || isAuthenticated === null) {
    return null;
  }

  // Don't render protected content if not authenticated
  if (pathname !== '/login' && pathname !== '/change-password' && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

