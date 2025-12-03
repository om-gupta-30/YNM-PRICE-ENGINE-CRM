'use client';

import { useState, useEffect, useRef } from 'react';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

interface AINotification {
  id: number;
  employee: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
}

interface AINotificationsPanelProps {
  employee: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AINotificationsPanel({ employee, isOpen, onClose }: AINotificationsPanelProps) {
  const [notifications, setNotifications] = useState<AINotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!employee) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications?employee=${employee}`);
      const data = await res.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        setError(data.error || 'Failed to load notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen && employee) {
      fetchNotifications();
    }
  }, [isOpen, employee]);

  // Close panel when clicking outside
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId, is_read: true }),
      });

      const data = await res.json();
      
      if (data.success) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
      }
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: AINotification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'normal':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'low':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/50';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-80 md:w-96 max-h-[500px] overflow-hidden rounded-2xl border-2 border-premium-gold shadow-2xl z-50 animate-fade-up"
      style={{ backgroundColor: '#1d0f0a', opacity: '1', background: '#1d0f0a', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-white/30" style={{ backgroundColor: '#2a1a15', opacity: '1', background: '#2a1a15' }}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🤖</span>
          <span>AI Insights & Alerts</span>
          {unreadCount > 0 && (
            <span className="ml-auto px-2 py-1 rounded-full text-xs font-bold text-premium-gold" style={{ backgroundColor: 'rgba(212, 166, 90, 0.3)' }}>
              {unreadCount}
            </span>
          )}
        </h3>
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto max-h-[400px]" style={{ backgroundColor: '#1d0f0a', opacity: '1', background: '#1d0f0a', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-slate-300 text-sm animate-pulse">Loading notifications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-300 text-sm">No AI notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                  !notification.is_read
                    ? 'border-l-4 border-premium-gold bg-gradient-to-r from-premium-gold/10 to-transparent'
                    : 'border-l-4 border-transparent'
                } hover:border-l-4 hover:border-premium-gold hover:bg-gradient-to-r hover:from-premium-gold/20 hover:to-transparent hover:shadow-lg hover:shadow-premium-gold/30 hover:scale-[1.02] hover:pl-5 active:scale-[0.98]`}
                style={{
                  backgroundColor: !notification.is_read ? '#3a1f1a' : '#1d0f0a',
                  opacity: 1
                }}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-premium-gold/0 group-hover:bg-premium-gold/5 transition-all duration-300 pointer-events-none"></div>
                
                <div className="flex items-start gap-3 relative z-10">
                  <div className="flex-1 min-w-0">
                    {/* Priority Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(notification.priority)}`}>
                        {notification.priority.toUpperCase()}
                      </span>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-premium-gold animate-pulse"></span>
                      )}
                    </div>
                    
                    {/* Message */}
                    <p className={`text-sm mb-2 group-hover:text-premium-gold transition-colors duration-200 ${
                      !notification.is_read ? 'text-white font-semibold' : 'text-slate-300'
                    }`}>
                      {notification.message}
                    </p>
                    
                    {/* Timestamp */}
                    <p className="text-slate-400 text-xs flex items-center gap-1 group-hover:text-slate-300 transition-colors duration-200">
                      <span>🕒</span>
                      <span>{formatTimestampIST(notification.created_at)}</span>
                    </p>
                  </div>
                  
                  {/* Arrow indicator on hover */}
                  <div className="text-premium-gold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                    →
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
