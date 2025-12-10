'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { formatTimestampIST } from '@/lib/utils/dateFormatters';

interface ActivityNotification {
  id: number;
  employee_id: string;
  activity_type: string;
  description: string;
  metadata?: any;
  created_at: string;
}

interface ActivityNotificationBadgeProps {
  sectionType: 'accounts' | 'tasks' | 'leads';
  employee: string;
  isAdmin: boolean;
  onMarkAsSeen?: () => void;
}

export default function ActivityNotificationBadge({
  sectionType,
  employee,
  isAdmin,
  onMarkAsSeen,
}: ActivityNotificationBadgeProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `/api/crm/activity-notifications?employee=${encodeURIComponent(employee)}&isAdmin=${isAdmin}`
      );
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications[sectionType] || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, isAdmin, sectionType]);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (showDropdown && buttonRef.current && mounted) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showDropdown, mounted]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleMarkAsSeen = async (activityIds: number[], e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent navigation when clicking "Seen" button
    }
    
    try {
      const response = await fetch('/api/crm/activity-notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityIds,
          sectionType,
          employee,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Remove marked notifications from state
        setNotifications((prev) =>
          prev.filter((notif) => !activityIds.includes(notif.id))
        );
        // Refresh notifications to ensure UI is updated
        await fetchNotifications();
        if (onMarkAsSeen) {
          onMarkAsSeen();
        }
      } else {
        console.error('Failed to mark notifications as seen:', data.error);
      }
    } catch (error) {
      console.error('Error marking notifications as seen:', error);
    }
  };

  const handleMarkAllAsSeen = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent any navigation
    if (notifications.length > 0) {
      const activityIds = notifications.map((n) => n.id);
      handleMarkAsSeen(activityIds, e);
    }
  };

  // Navigate to the relevant page when clicking on a notification
  const handleNotificationClick = (notification: ActivityNotification, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const metadata = notification.metadata || {};
    
    // Determine the route based on section type and metadata
    if (sectionType === 'accounts' && metadata.account_id) {
      router.push(`/crm/accounts/${metadata.account_id}`);
    } else if (sectionType === 'tasks' && metadata.task_id) {
      router.push(`/crm/tasks`);
    } else if (sectionType === 'leads') {
      // For leads, navigate to the leads page
      // If there's a lead_id in metadata, we could add a query param to highlight it
      if (metadata.lead_id) {
        router.push(`/crm/leads?lead=${metadata.lead_id}`);
      } else {
        router.push(`/crm/leads`);
      }
    } else {
      // Fallback to the section page
      router.push(`/crm/${sectionType}`);
    }
    
    // Close dropdown after navigation
    setShowDropdown(false);
  };

  const unreadCount = notifications.length;

  if (loading) {
    return null;
  }

  if (unreadCount === 0) {
    return null;
  }

  const dropdownContent = showDropdown && mounted ? (
    <div
      className="fixed w-80 rounded-lg bg-slate-800 border border-slate-700 shadow-2xl"
      style={{
        top: `${dropdownPosition.top}px`,
        right: `${dropdownPosition.right}px`,
        zIndex: 999999,
      }}
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white capitalize">
          {sectionType} Notifications
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsSeen}
            className="text-xs text-premium-gold hover:text-amber-400 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
          >
            Mark all as seen
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            No new notifications
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 hover:bg-slate-700/50 transition-colors group cursor-pointer"
                onClick={(e) => handleNotificationClick(notification, e)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white mb-1">
                      {notification.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{notification.employee_id}</span>
                      <span>•</span>
                      <span>{formatTimestampIST(notification.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkAsSeen([notification.id], e);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-premium-gold hover:text-amber-400 px-2 py-1 rounded hover:bg-slate-600/50"
                    title="Mark as seen"
                  >
                    Seen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative inline-flex items-center justify-center"
        >
          <span className="relative">
            <span className="text-2xl">🔔</span>
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        </button>
      </div>
      {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}

