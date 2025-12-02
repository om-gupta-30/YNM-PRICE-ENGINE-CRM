'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFollowUpNotifications } from '@/hooks/useFollowUpNotifications';

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, count, loading } = useFollowUpNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (contact: any) => {
    // Navigate to the contacts page for this sub-account and highlight the contact
    console.log('Notification clicked:', contact);
    
    if (!contact) {
      console.error('Contact is null or undefined');
      return;
    }
    
    // Check both subAccountId and sub_account_id (in case of different naming)
    const subAccountId = contact.subAccountId || contact.sub_account_id;
    const contactId = contact.id;
    const notificationId = contact.notificationId;
    
    // Mark notification as seen in database
    if (notificationId) {
      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_seen: true }),
        });
      } catch (error) {
        console.error('Error marking notification as seen:', error);
        // Continue even if marking as seen fails
      }
    }
    
    if (subAccountId) {
      console.log('Navigating to sub-account contacts:', subAccountId, 'with contact:', contactId);
      router.push(`/crm/subaccounts/${subAccountId}/contacts?contact=${contactId}`);
      setIsOpen(false); // Close the dropdown
    } else {
      console.error('No subAccountId found for contact:', contact);
      alert('Unable to navigate: Contact is not associated with a sub-account.');
    }
  };

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

  const getCallStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'Connected':
        return 'bg-green-500/20 text-green-300';
      case 'DNP':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'ATCBL':
        return 'bg-blue-500/20 text-blue-300';
      case 'Unable to connect':
      case 'Number doesn\'t exist':
      case 'Wrong number':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-slate-500/20 text-slate-300';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 transition-all duration-200 hover:border-brand-gold/50 hover:shadow-lg hover:shadow-brand-gold/30 group"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5 text-brand-gold group-hover:text-brand-gold transition-colors"
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
        
        {/* Notification Badge */}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white bg-red-500 border-2 border-[#1d0f0a80] shadow-lg">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 md:w-96 max-h-[500px] overflow-hidden rounded-2xl border-2 border-premium-gold shadow-2xl z-50 animate-fade-up" style={{ backgroundColor: '#1d0f0a', opacity: '1', background: '#1d0f0a', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
          {/* Dropdown Header */}
          <div className="p-4 border-b border-white/30" style={{ backgroundColor: '#2a1a15', opacity: '1', background: '#2a1a15' }}>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🔔</span>
              <span>Follow-Up Notifications</span>
              {count > 0 && (
                <span className="ml-auto px-2 py-1 rounded-full text-xs font-bold text-premium-gold" style={{ backgroundColor: 'rgba(212, 166, 90, 0.3)' }}>
                  {count}
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
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-300 text-sm">No pending follow-ups.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((contact) => {
                  const dueToday = contact.isDueToday ?? isToday(contact.followUpDate);
                  return (
                    <div
                      key={contact.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNotificationClick(contact);
                      }}
                      className={`p-4 transition-all duration-300 cursor-pointer group relative overflow-hidden ${
                        dueToday
                          ? 'border-l-4 border-red-500' 
                          : 'border-l-4 border-transparent'
                      } hover:border-l-4 hover:border-premium-gold hover:bg-gradient-to-r hover:from-premium-gold/20 hover:to-transparent hover:shadow-lg hover:shadow-premium-gold/30 hover:scale-[1.02] hover:pl-5 active:scale-[0.98] active:bg-premium-gold/30`}
                      style={{
                        backgroundColor: dueToday ? '#3a1f1a' : '#1d0f0a',
                        opacity: 1
                      }}
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-premium-gold/0 group-hover:bg-premium-gold/5 transition-all duration-300 pointer-events-none"></div>
                      <div className="flex items-start gap-3 relative z-10">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm mb-1 truncate group-hover:text-premium-gold transition-colors duration-200">
                            Follow up with <span className="text-premium-gold group-hover:text-white transition-colors duration-200">{contact.name}</span>
                          </p>
                          {contact.accountName && (
                            <p className="text-slate-300 text-xs mb-2 truncate group-hover:text-slate-200 transition-colors duration-200">
                              from <span className="text-premium-gold group-hover:text-white transition-colors duration-200">{contact.accountName}</span>
                              {contact.subAccountName && (
                                <span className="text-slate-400 group-hover:text-slate-300 transition-colors duration-200"> - {contact.subAccountName}</span>
                              )}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-400 text-xs flex items-center gap-1 group-hover:text-slate-200 transition-colors duration-200">
                              <span className="group-hover:scale-125 transition-transform duration-200">📅</span>
                              <span className={dueToday ? 'text-red-400 font-bold group-hover:text-red-300' : ''}>
                                {dueToday ? 'Due Today' : formatDate(contact.followUpDate)}
                              </span>
                            </span>
                            {contact.callStatus && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCallStatusColor(contact.callStatus)} group-hover:scale-105 transition-transform duration-200`}>
                                {contact.callStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Arrow indicator on hover */}
                        <div className="text-premium-gold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200">
                          →
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

