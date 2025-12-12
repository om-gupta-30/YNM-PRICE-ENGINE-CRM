'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [mounted, setMounted] = useState(false);
  const lastPathname = useRef<string>('');
  const hasRedirected = useRef(false);

  // Mount guard - only run on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client after mount
    if (!mounted || typeof window === 'undefined') {
      return;
    }

    // Prevent re-running for the same pathname
    if (lastPathname.current === safePathname && hasRedirected.current) {
      return;
    }
    
    // Reset redirect flag when pathname actually changes
    if (lastPathname.current !== safePathname) {
      hasRedirected.current = false;
    }
    lastPathname.current = safePathname;

      setIsChecking(true);
      const auth = localStorage.getItem('auth');
      const isAuth = auth === 'true';
      
      // Public routes - allow access
      if (safePathname === '/login' || safePathname === '/change-password') {
        // If already authenticated on login page, redirect to home
      if (safePathname === '/login' && isAuth && !hasRedirected.current) {
        hasRedirected.current = true;
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
    if (safePathname === '/') {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        if (isAuth) {
          router.replace('/home');
        } else {
          router.replace('/login');
        }
      }
      setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }

      // Protected route - require authentication
    // This includes: /home, /mbcb, /mbcb/*, /paint, /signages, /crm, etc.
      if (!isAuth) {
      // Redirect to login immediately (only once)
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        router.replace('/login');
      }
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      // Authenticated - allow access
      setIsAuthenticated(true);
      setIsChecking(false);
  }, [pathname, mounted, router]);

  // Show nothing while checking auth (prevents flash)
  if (isChecking || isAuthenticated === null) {
    return null;
  }

  // Don't render protected content if not authenticated
  if (safePathname !== '/login' && safePathname !== '/change-password' && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

