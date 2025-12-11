'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

interface Contact {
  id: number;
  subAccountId?: number;
  sub_account_id?: number;
  name: string;
  accountName?: string | null;
  subAccountName?: string | null;
  followUpDate?: Date | null;
  callStatus?: string | null;
  isDueToday?: boolean;
  isLead?: boolean;
  isSeen?: boolean;
  notificationId?: number;
}

const isSameDay = (dateA: Date, dateB: Date) => {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

export function useFollowUpNotifications() {
  const [notifications, setNotifications] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const rawUsername = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';
        // Normalize username to lowercase for consistent API matching
        const username = rawUsername.toLowerCase();
        
        console.log(`🔔 [HOOK] Fetching notifications for username: "${rawUsername}" (normalized: "${username}")`);
        
        const response = await fetch(`/api/notifications/follow-ups?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        console.log(`🔔 [HOOK] API response:`, { 
          success: data.success, 
          count: data.notifications?.length || 0, 
          username: username,
          rawUsername: rawUsername
        });
        
        if (data.success && data.notifications) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Convert followUpDate strings to Date objects
          const formattedNotifications: Contact[] = data.notifications
            .filter((item: any) => !item.isSeen) // Only show unseen notifications
            .map((item: any) => {
              const rawFollowUp =
                item.followUpDate ||
                item.follow_up_date ||
                item.followUp ||
                item.follow_up;
              const followUpDate = rawFollowUp ? new Date(rawFollowUp) : null;
              const isDueToday = followUpDate ? isSameDay(followUpDate, today) : false;

              return {
                ...item,
                id: item.id,
                subAccountId: item.subAccountId || item.sub_account_id,
                name: item.name,
                accountName: item.accountName,
                subAccountName: item.subAccountName,
                followUpDate,
                callStatus: item.callStatus || item.call_status,
                isDueToday,
                isLead: item.isLead || false,
                isSeen: item.isSeen || false,
                notificationId: item.notificationId,
              };
            });
          
          // Sort notifications: Today's items first, then by date (ascending - soonest first)
          formattedNotifications.sort((a: Contact, b: Contact) => {
            const aDate = a.followUpDate;
            const bDate = b.followUpDate;
            
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1; // Put items without dates at the end
            if (!bDate) return -1;
            
            // Today's items first
            if (a.isDueToday && !b.isDueToday) return -1;
            if (!a.isDueToday && b.isDueToday) return 1;
            
            // If both are today or both are not today, sort by date (ascending - soonest first)
            return aDate.getTime() - bDate.getTime();
          });
          
          console.log('Formatted notifications:', formattedNotifications);
          setNotifications(formattedNotifications);
        } else {
          console.warn('No notifications found or API error:', data);
          setNotifications([]);
        }
      } catch (error) {
        console.error('Error fetching follow-up notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    
    // Listen for manual refresh events
    const handleRefresh = () => {
      fetchNotifications();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('refreshNotifications', handleRefresh);
    }
    
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('refreshNotifications', handleRefresh);
      }
    };
  }, [refreshTrigger]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const count = useMemo(() => notifications.length, [notifications]);

  return {
    notifications,
    count,
    loading,
    refresh,
  };
}

