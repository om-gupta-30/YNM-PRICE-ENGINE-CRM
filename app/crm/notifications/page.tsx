'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Notification } from '@/lib/constants/types';
import Toast from '@/components/ui/Toast';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'completed'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'contacts' | 'tasks'>('contacts');
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
  }, [filter, sourceFilter, isAdmin]);

  // Listen for refreshNotifications event to update immediately when follow-up dates are added/edited
  // Use a debounced refresh to prevent rapid reloads that might cause notifications to disappear
  useEffect(() => {
    if (typeof window !== 'undefined' && !isAdmin) {
      let refreshTimeout: NodeJS.Timeout;
      
      const handleRefresh = () => {
        // Clear any pending refresh
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        
        // Debounce the refresh slightly to prevent rapid reloads
        refreshTimeout = setTimeout(() => {
          // Simply call loadNotifications - it will preserve state internally
          loadNotifications();
        }, 100);
      };
      
      window.addEventListener('refreshNotifications', handleRefresh);
      
      return () => {
        window.removeEventListener('refreshNotifications', handleRefresh);
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
      };
    }
  }, [isAdmin]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const username = localStorage.getItem('username') || '';
      const params = new URLSearchParams({ username: username });

      // Preserve current notifications to prevent them from disappearing during refresh
      const previousNotifications = [...allNotifications];

      const response = await fetch(`/api/notifications/follow-ups?${params}`);
      const result = await response.json();

      if (result.success && result.notifications) {
        // API returns notifications array directly
        // CRITICAL: The API returns ALL unseen notifications (both contacts and leads)
        // They are INDEPENDENT - updating one should NOT affect the other
        if (Array.isArray(result.notifications)) {
          // CRITICAL: Use API response directly - it contains ALL notifications
          // No merging, no filtering - just use what the API returns
          // The API already filters by is_seen=false, so it has everything
          setAllNotifications(result.notifications);
          applyFilters(result.notifications);
        } else {
          // If API returns invalid data, keep previous notifications
          setAllNotifications(previousNotifications);
          applyFilters(previousNotifications);
        }
      } else if (result.data) {
        // Fallback for old format
        if (Array.isArray(result.data)) {
          setAllNotifications(result.data);
          applyFilters(result.data);
        } else {
          setAllNotifications(previousNotifications);
          applyFilters(previousNotifications);
        }
      } else {
        // No data received - keep previous notifications to prevent them from disappearing
        setAllNotifications(previousNotifications);
        applyFilters(previousNotifications);
      }
    } catch (err: any) {
      // On error, keep previous notifications visible instead of clearing them
      console.error('Error loading notifications:', err);
      setToast({ message: err.message, type: 'error' });
      // Don't clear notifications on error - keep them visible
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSeen = async (notification: Notification) => {
    try {
      // Use notificationId from the notification object (from notifications table)
      // Fallback to id if notificationId doesn't exist
      const notificationId = (notification as any).notificationId || notification.id;
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_seen: true }),
      });
      await loadNotifications();
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleMarkAsCompleted = async (notification: Notification) => {
    try {
      // Use notificationId from the notification object (from notifications table)
      // Fallback to id if notificationId doesn't exist
      const notificationId = (notification as any).notificationId || notification.id;
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true, is_seen: true }),
      });
      await loadNotifications();
      setToast({ message: 'Notification marked as completed', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const applyFilters = (data: Notification[]) => {
    let filtered = [...data];
    
    // Apply status filter
    if (filter === 'completed') {
      filtered = filtered.filter((n: any) => n.isCompleted || n.is_completed);
    } else if (filter === 'unread') {
      // API already returns only unseen notifications, but apply client-side filter for consistency
      filtered = filtered.filter((n: any) => !(n.isSeen || n.is_seen) && !(n.isCompleted || n.is_completed));
    }
    // 'all' shows everything (already filtered by API to show only unseen)
    
    // Apply source filter - only show contacts (leads are filtered out in API)
    if (sourceFilter === 'contacts') {
      filtered = filtered.filter((n: any) => 
        n.isLead !== true && 
        (!n.metadata || (!n.metadata.lead_id && !n.metadata.leadId))
      );
    } else if (sourceFilter === 'tasks') {
      filtered = filtered.filter((n: any) => 
        n.notification_type === 'task_due' || n.notificationType === 'task_due'
      );
    }
    
    setNotifications(filtered);
  };

  // Re-apply filters when filter or sourceFilter changes
  useEffect(() => {
    if (allNotifications.length > 0) {
      applyFilters(allNotifications);
    }
  }, [filter, sourceFilter]);

  const handleSnooze = async (notification: Notification, hours: number) => {
    try {
      const snoozeUntil = new Date();
      snoozeUntil.setHours(snoozeUntil.getHours() + hours);
      
      // Use notificationId from the notification object (from notifications table)
      // Fallback to id if notificationId doesn't exist
      const notificationId = (notification as any).notificationId || notification.id;
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_snoozed: true,
          snooze_until: snoozeUntil.toISOString(),
        }),
      });
      await loadNotifications();
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

        {/* Filters - Status Tabs */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Filter by Status</h3>
          <div className="flex gap-4 flex-wrap">
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

        {/* Source Tabs */}
        <div className="glassmorphic-premium rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Filter by Source</h3>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                sourceFilter === 'all'
                  ? 'bg-premium-gold text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setSourceFilter('contacts')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                sourceFilter === 'contacts'
                  ? 'bg-premium-gold text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Contacts
            </button>
            <button
              onClick={() => setSourceFilter('tasks')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                sourceFilter === 'tasks'
                  ? 'bg-premium-gold text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Tasks
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
                className={`glassmorphic-premium rounded-xl p-6 border cursor-pointer ${
                  (notification as any).isSeen || notification.is_seen
                    ? 'border-white/10'
                    : 'border-blue-500/30 bg-blue-500/5'
                }`}
                onClick={() => {
                  // Make entire notification clickable to navigate
                  const notif = notification as any;
                  if (notif.subAccountId && !notif.isLead) {
                    router.push(`/crm/subaccounts/${notif.subAccountId}/contacts?contact=${notif.id}`);
                  } else if (notif.isLead && notif.id) {
                    router.push(`/crm/leads?lead=${notif.id}`);
                  }
                }}
              >
                <div className="flex gap-4">
                  <div className="text-3xl">{getNotificationIcon(notification.notification_type)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">{notification.title}</h3>
                        <p className="text-slate-300 text-sm mt-1">{notification.message}</p>
                        {(notification as any).followUpDate && (
                          <div className="mt-2 p-2 bg-slate-800/50 rounded-lg border border-premium-gold/30">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300 text-xs font-semibold">📅 Follow-up Date:</span>
                              <span className="text-white text-sm font-bold">
                                {new Date((notification as any).followUpDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-slate-300 text-xs font-semibold">⏰ Follow-up Time:</span>
                              <span className="text-premium-gold text-sm font-bold">
                                {new Date((notification as any).followUpDate).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-slate-400 text-xs whitespace-nowrap ml-4">
                        {formatTimestampIST(notification.created_at)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {!((notification as any).isSeen || notification.is_seen) && (
                        <button
                          onClick={() => handleMarkAsSeen(notification)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-blue-500/20 hover:bg-blue-500/30 rounded-lg"
                        >
                          Mark as Read
                        </button>
                      )}
                      {!((notification as any).isCompleted || notification.is_completed) && (
                        <button
                          onClick={() => handleMarkAsCompleted(notification)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-green-500/20 hover:bg-green-500/30 rounded-lg"
                        >
                          Mark as Completed
                        </button>
                      )}
                      {/* Check for contact_id in notification data (from API response) */}
                      {((notification as any).subAccountId || (notification as any).sub_account_id) && !(notification as any).isLead && (
                        <button
                          onClick={() => {
                            const contactId = (notification as any).id; // Contact ID from API
                            const subAccountId = (notification as any).subAccountId || (notification as any).sub_account_id;
                            if (subAccountId && contactId) {
                              router.push(`/crm/subaccounts/${subAccountId}/contacts?contact=${contactId}`);
                            }
                          }}
                          className="px-3 py-1 text-xs font-semibold text-white bg-purple-500/80 hover:bg-purple-500 rounded-lg"
                        >
                          View Contact
                        </button>
                      )}
                      {/* Check for lead_id in notification data */}
                      {(notification as any).isLead && (notification as any).id && (
                        <button
                          onClick={() => router.push(`/crm/leads?lead=${(notification as any).id}`)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-blue-500/80 hover:bg-blue-500 rounded-lg"
                        >
                          View Lead
                        </button>
                      )}
                      {(notification as any).accountName && (
                        <button
                          onClick={() => {
                            // Try to get account_id from notification or navigate to accounts list
                            const accountId = (notification as any).accountId || notification.account_id;
                            if (accountId) {
                              router.push(`/crm/accounts/${accountId}`);
                            } else {
                              router.push('/crm/accounts');
                            }
                          }}
                          className="px-3 py-1 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-accent rounded-lg"
                        >
                          View Account
                        </button>
                      )}
                      <button
                        onClick={() => handleSnooze(notification, 1)}
                        className="px-3 py-1 text-xs font-semibold text-white bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg"
                      >
                        Snooze 1h
                      </button>
                      <button
                        onClick={() => handleSnooze(notification, 24)}
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

