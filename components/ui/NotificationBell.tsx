'use client';

import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: number;
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  contactId: number | null;
  accountId: number | null;
  contactName: string | null;
  accountName: string | null;
  followUpDate: string | null;
  callStatus: string | null;
  isSeen: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NotificationBellProps {
  userId: string;
  isAdmin: boolean;
}

export default function NotificationBell({ userId, isAdmin }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('userId', userId);
      if (isAdmin) {
        params.append('isAdmin', 'true');
      }

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (userId && userId !== 'Admin') {
      fetchNotifications();
      // Refresh every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, isAdmin]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark notification as completed
  const handleMarkCompleted = async (notificationId: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          isCompleted: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove from list
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        // Refresh to get updated list
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as completed:', error);
    }
  };

  // Mark as seen when opening
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      const unseenNotifications = notifications.filter(n => !n.isSeen);
      if (unseenNotifications.length > 0) {
        // Mark all as seen
        unseenNotifications.forEach(async (notif) => {
          try {
            await fetch('/api/notifications', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                notificationId: notif.id,
                isSeen: true,
              }),
            });
          } catch (error) {
            console.error('Error marking notification as seen:', error);
          }
        });
      }
    }
  }, [isOpen, notifications]);

  const unreadCount = notifications.filter(n => !n.isSeen).length;

  // Don't show for Admin user
  if (!userId || userId === 'Admin') {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-center text-slate-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-slate-400">No notifications</div>
          ) : (
            <div className="divide-y divide-slate-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-700/50 transition-colors ${
                    !notification.isSeen ? 'bg-slate-700/30' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm mb-1">
                        {notification.title}
                      </p>
                      <p className="text-slate-300 text-xs mb-2">
                        {notification.message}
                      </p>
                      {notification.followUpDate && (
                        <p className="text-premium-gold text-xs">
                          Follow-up: {new Date(notification.followUpDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleMarkCompleted(notification.id)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-green-500/80 hover:bg-green-500 rounded-lg transition-all duration-200 flex-shrink-0"
                      title="Mark as completed"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
