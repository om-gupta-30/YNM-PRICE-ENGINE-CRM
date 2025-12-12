'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Notification } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'completed'>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const admin = localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(admin);
      if (admin) {
        // Redirect admin away from notifications page
        router.replace('/crm');
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isAdmin) {
      loadNotifications();
    }
  }, [filter, isAdmin]);

  // Listen for refreshNotifications event to update immediately when follow-up dates are added/edited
  useEffect(() => {
    if (typeof window !== 'undefined' && !isAdmin) {
      const handleRefresh = () => {
        loadNotifications();
      };
      
      window.addEventListener('refreshNotifications', handleRefresh);
      
      return () => {
        window.removeEventListener('refreshNotifications', handleRefresh);
      };
    }
  }, [isAdmin]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem('username') || '';
      const params = new URLSearchParams({ userId: username });
      if (filter === 'unread') {
        params.append('unreadOnly', 'true');
      }

      const response = await fetch(`/api/notifications?${params}`);
      const result = await response.json();

      if (result.data) {
        let filtered = result.data;
        if (filter === 'completed') {
          filtered = filtered.filter((n: Notification) => n.is_completed);
        } else if (filter === 'unread') {
          filtered = filtered.filter((n: Notification) => !n.is_seen && !n.is_completed);
        }
        setNotifications(filtered);
      }
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
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
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleMarkAsCompleted = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true, is_seen: true }),
      });
      loadNotifications();
      setToast({ message: 'Notification marked as completed', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleSnooze = async (id: number, hours: number) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);

      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_snoozed: true,
          snooze_until: snoozeUntil.toISOString(),
        }),
      });
      loadNotifications();
      setToast({ message: `Notification snoozed for ${hours} hours`, type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };


  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'followup_due':
        return '📅';
      case 'callback_scheduled':
        return '📞';
      case 'task_due':
        return '✅';
      case 'quotation_update':
        return '📄';
      default:
        return '🔔';
    }
  };

  // Don't show notifications page for admin
  if (isAdmin) {
    return null;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-slate-300">Manage your follow-ups and alerts</p>
        </div>

        {/* Filters */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === 'unread'
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filter === 'completed'
                  ? 'bg-brand-primary text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-slate-300">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="glassmorphic-premium rounded-2xl p-6 text-center py-20">
            <p className="text-2xl text-slate-300 mb-2">No notifications</p>
            <p className="text-slate-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`glassmorphic-premium rounded-xl p-6 border ${
                  notification.is_seen
                    ? 'border-white/10'
                    : 'border-blue-500/30 bg-blue-500/5'
                }`}
              >
                <div className="flex gap-4">
                  <div className="text-3xl">{getNotificationIcon(notification.notification_type)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">{notification.title}</h3>
                        <p className="text-slate-300 text-sm mt-1">{notification.message}</p>
                      </div>
                      <span className="text-slate-400 text-xs whitespace-nowrap ml-4">
                        {formatTimestampIST(notification.created_at)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {!notification.is_seen && (
                        <button
                          onClick={() => handleMarkAsSeen(notification.id)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-blue-500/20 hover:bg-blue-500/30 rounded-lg"
                        >
                          Mark as Read
                        </button>
                      )}
                      {!notification.is_completed && (
                        <button
                          onClick={() => handleMarkAsCompleted(notification.id)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-green-500/20 hover:bg-green-500/30 rounded-lg"
                        >
                          Mark as Completed
                        </button>
                      )}
                      {notification.account_id && (
                        <button
                          onClick={() => router.push(`/crm/accounts/${notification.account_id}`)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg"
                        >
                          View Account
                        </button>
                      )}
                      <button
                        onClick={() => handleSnooze(notification.id, 1)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg"
                      >
                        Snooze 1h
                      </button>
                      <button
                        onClick={() => handleSnooze(notification.id, 24)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-orange-500/20 hover:bg-orange-500/30 rounded-lg"
                      >
                        Snooze 24h
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

