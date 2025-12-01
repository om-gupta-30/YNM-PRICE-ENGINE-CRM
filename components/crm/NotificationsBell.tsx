'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Notification } from '@/lib/constants/types';

export default function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const username = localStorage.getItem('username') || '';
      const response = await fetch(`/api/notifications?userId=${username}&unreadOnly=true`);
      const result = await response.json();

      if (result.data) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter((n: Notification) => !n.is_seen).length);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSeen = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_seen: true }),
      });
      loadNotifications();
    } catch (err) {
      console.error('Error marking notification as seen:', err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-300 hover:text-white transition-colors"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-80 glassmorphic-premium rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-4 border-b border-white/10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">Notifications</h3>
                <button
                  onClick={() => {
                    router.push('/crm/notifications');
                    setShowDropdown(false);
                  }}
                  className="text-sm text-brand-primary hover:underline"
                >
                  View All
                </button>
              </div>
            </div>

            <div className="p-2">
              {loading ? (
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm">No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      handleMarkAsSeen(notification.id);
                      if (notification.account_id) {
                        router.push(`/crm/accounts/${notification.account_id}`);
                      }
                      setShowDropdown(false);
                    }}
                    className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${
                      notification.is_seen
                        ? 'bg-slate-700/30 hover:bg-slate-700/50'
                        : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20'
                    }`}
                  >
                    <p className="text-white text-sm font-semibold">{notification.title}</p>
                    <p className="text-slate-300 text-xs mt-1">{notification.message}</p>
                    <p className="text-slate-400 text-xs mt-1">{formatTime(notification.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

