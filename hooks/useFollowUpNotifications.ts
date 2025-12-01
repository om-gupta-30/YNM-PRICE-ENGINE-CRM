'use client';

import { useState, useEffect, useMemo } from 'react';

interface Contact {
  id: number;
  subAccountId: number;
  name: string;
  accountName?: string | null;
  subAccountName?: string | null;
  followUpDate?: Date | null;
  callStatus?: string | null;
  isDueToday?: boolean;
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

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Admin' : 'Admin';
        
        const response = await fetch(`/api/notifications/follow-ups?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        console.log('Notifications API response:', { success: data.success, count: data.notifications?.length || 0, username });
        
        if (data.success && data.notifications) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Convert followUpDate strings to Date objects and ensure subAccountId is present
          const formattedNotifications: Contact[] = data.notifications.map((contact: any) => {
            const rawFollowUp =
              contact.followUpDate ||
              contact.follow_up_date ||
              contact.followUp ||
              contact.follow_up;
            const followUpDate = rawFollowUp ? new Date(rawFollowUp) : null;
            const isDueToday = followUpDate ? isSameDay(followUpDate, today) : false;

            return {
              ...contact,
              id: contact.id,
              subAccountId: contact.subAccountId || contact.sub_account_id,
              name: contact.name,
              accountName: contact.accountName,
              subAccountName: contact.subAccountName,
              followUpDate,
              callStatus: contact.callStatus || contact.call_status,
              isDueToday,
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
    
    return () => clearInterval(interval);
  }, []);

  const count = useMemo(() => notifications.length, [notifications]);

  return {
    notifications,
    count,
    loading,
  };
}

