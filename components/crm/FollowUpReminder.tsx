'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

interface FollowUpReminder {
  contactId: number;
  contactName: string;
  followUpDate: string;
  subAccountName?: string;
  accountName?: string;
}

export default function FollowUpReminder() {
  const [reminder, setReminder] = useState<FollowUpReminder | null>(null);
  const [mounted, setMounted] = useState(false);
  const [checkedReminders, setCheckedReminders] = useState<Set<string>>(new Set());
  const reminderRef = useRef<HTMLDivElement>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to reminder when it appears
  useEffect(() => {
    if (reminder && reminderRef.current) {
      bringElementIntoView(reminderRef.current);
    }
  }, [reminder]);

  useEffect(() => {
    if (!mounted) return;

    const checkForUpcomingFollowUps = async () => {
      try {
        const username = typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '';
        if (!username || username.toLowerCase() === 'admin') return;

        const response = await fetch(`/api/notifications/follow-ups?username=${encodeURIComponent(username)}`);
        const result = await response.json();

        if (result.success && result.notifications && Array.isArray(result.notifications)) {
          const now = new Date();
          const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

          // Find follow-ups that are within the next 15 minutes
          const upcomingFollowUps = result.notifications
            .filter((notif: any) => {
              if (!notif.followUpDate) return false;
              
              const followUpDate = new Date(notif.followUpDate);
              const reminderKey = `${notif.id}-${followUpDate.getTime()}`;
              
              // Skip if we've already shown this reminder
              if (checkedReminders.has(reminderKey)) return false;
              
              // Check if follow-up is between now and 15 minutes from now
              return followUpDate >= now && followUpDate <= fifteenMinutesFromNow;
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(a.followUpDate).getTime();
              const dateB = new Date(b.followUpDate).getTime();
              return dateA - dateB;
            });

          if (upcomingFollowUps.length > 0) {
            const nextFollowUp = upcomingFollowUps[0];
            const reminderKey = `${nextFollowUp.id}-${new Date(nextFollowUp.followUpDate).getTime()}`;
            
            setReminder({
              contactId: nextFollowUp.id,
              contactName: nextFollowUp.name || 'Contact',
              followUpDate: nextFollowUp.followUpDate,
              subAccountName: nextFollowUp.subAccountName || null,
              accountName: nextFollowUp.accountName || null,
            });
            
            // Mark this reminder as checked
            setCheckedReminders(prev => new Set([...prev, reminderKey]));
          }
        }
      } catch (error) {
        console.error('Error checking for follow-up reminders:', error);
      }
    };

    // Check immediately
    checkForUpcomingFollowUps();

    // Check every minute
    checkIntervalRef.current = setInterval(checkForUpcomingFollowUps, 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [mounted, checkedReminders]);

  const handleDismiss = () => {
    setReminder(null);
  };

  const handleSnooze = () => {
    setReminder(null);
    // Snooze for 5 minutes - remove from checked reminders so it can show again
    setTimeout(() => {
      if (reminder) {
        const reminderKey = `${reminder.contactId}-${new Date(reminder.followUpDate).getTime()}`;
        setCheckedReminders(prev => {
          const newSet = new Set(prev);
          newSet.delete(reminderKey);
          return newSet;
        });
      }
    }, 5 * 60 * 1000);
  };

  if (!mounted || !reminder) return null;

  const followUpTime = new Date(reminder.followUpDate);
  const timeUntil = Math.round((followUpTime.getTime() - new Date().getTime()) / 60000);

  const reminderContent = (
    <div 
      className="fixed inset-0 z-[10003] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
      onClick={handleDismiss}
    >
      <div 
        ref={reminderRef}
        className="glassmorphic-premium rounded-3xl p-8 max-w-md w-full border-2 border-orange-500/50 shadow-2xl animate-pulse"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Alert Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center border-2 border-orange-500/50">
            <span className="text-4xl">⏰</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-extrabold text-white mb-4 text-center drop-shadow-lg">
          Follow-Up Reminder
        </h2>

        {/* Message */}
        <div className="text-center mb-6">
          <p className="text-slate-200 text-lg mb-2">
            You have a follow-up in <span className="text-orange-400 font-bold">{timeUntil} minute{timeUntil !== 1 ? 's' : ''}</span>
          </p>
          <p className="text-white font-semibold text-xl mb-2">
            {reminder.contactName}
          </p>
          {reminder.subAccountName && (
            <p className="text-slate-300 text-sm">
              {reminder.subAccountName}
              {reminder.accountName && ` • ${reminder.accountName}`}
            </p>
          )}
          <p className="text-slate-400 text-sm mt-2">
            Scheduled for: {followUpTime.toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleSnooze}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 border border-white/20"
          >
            Snooze 5 min
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 px-6 py-3 text-base font-semibold text-white bg-orange-500/80 hover:bg-orange-500 rounded-xl transition-all duration-200 shadow-lg hover:shadow-orange-500/50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(reminderContent, document.body);
}

