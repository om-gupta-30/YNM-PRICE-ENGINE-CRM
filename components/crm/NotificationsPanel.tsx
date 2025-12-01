'use client';

import { useMemo } from 'react';

interface Contact {
  id: string;
  name: string;
  accountName?: string;
  followUpDate?: Date | null;
  callStatus?: string;
}

interface NotificationsPanelProps {
  contacts: Contact[];
}

export default function NotificationsPanel({ contacts }: NotificationsPanelProps) {
  // Get contacts with follow-up dates (UI-only, no backend)
  const followUpNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contacts
      .filter(contact => {
        if (!contact.followUpDate) return false;
        
        const followUpDate = contact.followUpDate instanceof Date 
          ? contact.followUpDate 
          : new Date(contact.followUpDate);
        followUpDate.setHours(0, 0, 0, 0);
        
        // Show notifications for today and future dates
        return followUpDate >= today;
      })
      .sort((a, b) => {
        const dateA = a.followUpDate instanceof Date ? a.followUpDate : new Date(a.followUpDate!);
        const dateB = b.followUpDate instanceof Date ? b.followUpDate : new Date(b.followUpDate!);
        return dateA.getTime() - dateB.getTime();
      });
  }, [contacts]);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const isToday = (date: Date | null | undefined) => {
    if (!date) return false;
    const d = date instanceof Date ? date : new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  if (followUpNotifications.length === 0) {
    return null;
  }

  return (
    <div className="glassmorphic-premium rounded-3xl p-6 mb-6 slide-up card-hover-gold border-2 border-premium-gold/30 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-white drop-shadow-lg flex items-center gap-2">
          <span>🔔</span>
          <span>Follow-Up Notifications</span>
        </h2>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-premium-gold/20 text-premium-gold">
          {followUpNotifications.length}
        </span>
      </div>

      <div className="space-y-3">
        {followUpNotifications.map((contact) => (
          <div
            key={contact.id}
            className={`p-4 rounded-xl border-2 transition-all duration-200 ${
              isToday(contact.followUpDate)
                ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-white font-semibold mb-1">
                  Follow up with <span className="text-premium-gold">{contact.name}</span>
                  {contact.accountName && (
                    <> from <span className="text-premium-gold">{contact.accountName}</span></>
                  )}
                </p>
                <p className="text-slate-300 text-sm">
                  {isToday(contact.followUpDate) ? (
                    <span className="text-red-400 font-bold">⚠️ Due Today</span>
                  ) : (
                    <>📅 Scheduled for <span className="font-semibold">{formatDate(contact.followUpDate)}</span></>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

