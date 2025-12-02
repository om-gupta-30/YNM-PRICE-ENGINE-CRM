'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';

type UserStatus = 'online' | 'away' | 'logged_out';

interface ActivityTrackerProps {
  isAdmin?: boolean;
}

export default function ActivityTracker({ isAdmin = false }: ActivityTrackerProps) {
  const router = useRouter();
  const { username } = useUser();
  const [mounted, setMounted] = useState(false);
  const lastActivityRef = useRef<number>(0);
  const statusRef = useRef<UserStatus>('online');
  const awayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const updateStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize on mount only (client-side)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      lastActivityRef.current = Date.now();
    }
  }, []);

  // Only track for employees, not admin - but after mount check
  if (!mounted || isAdmin || !username) {
    return null;
  }

  // Update status on server (throttled to avoid too many API calls)
  const updateStatus = useCallback(async (status: UserStatus, reason?: string) => {
    if (!username || statusRef.current === status) return;
    
    // Don't update if already logged out (to prevent unnecessary API calls)
    if (statusRef.current === 'logged_out' && status !== 'online') return;

    try {
      // Throttle status updates - only update if status actually changed
      const response = await fetch('/api/auth/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          status,
          reason,
        }),
      });

      if (response.ok) {
        statusRef.current = status;
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }, [username]);

  // Handle activity detection
  const handleActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // If user was away or logged out, bring them back online
    if (statusRef.current !== 'online') {
      updateStatus('online', 'User activity detected');
      
      // Clear existing timers
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
        awayTimerRef.current = null;
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    }

    // Reset away timer (5 minutes)
    if (awayTimerRef.current) {
      clearTimeout(awayTimerRef.current);
    }
    awayTimerRef.current = setTimeout(() => {
      updateStatus('away', 'No activity for 5 minutes');
    }, 5 * 60 * 1000); // 5 minutes

    // Reset logout timer (15 minutes)
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }
    logoutTimerRef.current = setTimeout(() => {
      updateStatus('logged_out', 'No activity for 15 minutes - auto logout');
      
      // Auto logout after 15 minutes
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // Mark that this was an auto-logout so we can prompt for reason on next login
          localStorage.setItem('auto_logout', 'true');
          localStorage.setItem('auto_logout_time', Date.now().toString());
          localStorage.removeItem('auth');
          localStorage.removeItem('username');
          localStorage.removeItem('userId');
          localStorage.removeItem('department');
          localStorage.removeItem('isAdmin');
          router.replace('/login');
        }
      }, 1000); // Small delay to ensure status is logged
    }, 15 * 60 * 1000); // 15 minutes
  }, [updateStatus, router]);

  // Periodic status update (every 2 minutes) - lightweight check
  useEffect(() => {
    if (!username || isAdmin) return;

    updateStatusTimerRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      // Only update if status should change based on inactivity
      if (timeSinceActivity >= 15 * 60 * 1000 && statusRef.current !== 'logged_out') {
        // Already handled by logout timer, but ensure status is updated
        return;
      } else if (timeSinceActivity >= 5 * 60 * 1000 && statusRef.current === 'online') {
        updateStatus('away', 'No activity for 5 minutes');
      }
    }, 2 * 60 * 1000); // Check every 2 minutes

    return () => {
      if (updateStatusTimerRef.current) {
        clearInterval(updateStatusTimerRef.current);
      }
    };
  }, [username, isAdmin, updateStatus]);

  // Set up activity listeners (throttled for performance)
  useEffect(() => {
    if (!username || isAdmin) return;

    // Throttle activity handler to avoid too many calls
    let throttleTimer: NodeJS.Timeout | null = null;
    const throttledHandleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        handleActivity();
        throttleTimer = null;
      }, 1000); // Throttle to once per second max
    };

    // Initial activity
    handleActivity();

    // Listen for various user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, throttledHandleActivity, { passive: true });
    });

    // Also listen for visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledHandleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
      if (awayTimerRef.current) {
        clearTimeout(awayTimerRef.current);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, [username, isAdmin, handleActivity]);

  return null; // This component doesn't render anything
}
