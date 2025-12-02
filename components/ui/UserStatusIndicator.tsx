'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';

type UserStatus = 'online' | 'away' | 'logged_out';

interface UserStatusIndicatorProps {
  username?: string;
  isAdmin?: boolean;
}

export default function UserStatusIndicator({ username, isAdmin = false }: UserStatusIndicatorProps) {
  const { username: contextUsername } = useUser();
  const displayUsername = username || contextUsername;
  const [status, setStatus] = useState<UserStatus>('online');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Mount guard to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    setLastUpdate(new Date());
  }, []);

  // Only show for employees, not admin
  if (!mounted || isAdmin || !displayUsername) {
    return null;
  }

  // Fetch user status periodically (every 30 seconds)
  useEffect(() => {
    if (!displayUsername) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/auth/user-status?username=${encodeURIComponent(displayUsername)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status) {
            setStatus(data.status);
            if (typeof window !== 'undefined') {
              setLastUpdate(new Date());
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user status:', error);
      }
    };

    // Initial fetch
    fetchStatus();

    // Update every 30 seconds
    const interval = setInterval(fetchStatus, 30000);

    return () => clearInterval(interval);
  }, [displayUsername]);

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'logged_out':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'logged_out':
        return 'Logged Out';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
      <span className="text-xs text-slate-300 font-medium">
        {getStatusText()}
      </span>
    </div>
  );
}
