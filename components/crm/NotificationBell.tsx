'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFollowUpNotifications } from '@/hooks/useFollowUpNotifications';
import AINotificationsPanel from '@/components/crm/AINotificationsPanel';

type TabType = 'leads' | 'contacts';

export default function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showAINotifications, setShowAINotifications] = useState(false);
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('leads');
  const [markingAllAsSeen, setMarkingAllAsSeen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, count, loading, refresh } = useFollowUpNotifications();

  // Get username from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUsername(localStorage.getItem('username') || '');
    }
  }, []);

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

  // Split notifications into leads and contacts
  const { leads, contacts } = useMemo(() => {
    const leadsList = notifications.filter(n => n.isLead);
    const contactsList = notifications.filter(n => !n.isLead);
    
    // Sort each list: Today's first, then future dates, then no-date
    const sortNotifications = (list: typeof notifications) => {
      return [...list].sort((a, b) => {
        const aDate = a.followUpDate;
        const bDate = b.followUpDate;
        
        // No date items go to bottom
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        
        // Today's items first
        const aIsToday = a.isDueToday ?? isToday(aDate);
        const bIsToday = b.isDueToday ?? isToday(bDate);
        
        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;
        
        // Both today or both not today - sort by date (ascending)
        return aDate.getTime() - bDate.getTime();
      });
    };
    
    return {
      leads: sortNotifications(leadsList),
      contacts: sortNotifications(contactsList),
    };
  }, [notifications]);

  // Auto-select tab based on content
  useEffect(() => {
    if (!loading && notifications.length > 0) {
      if (activeTab === 'leads' && leads.length === 0 && contacts.length > 0) {
        setActiveTab('contacts');
      } else if (activeTab === 'contacts' && contacts.length === 0 && leads.length > 0) {
        setActiveTab('leads');
      }
    }
  }, [loading, notifications.length, leads.length, contacts.length, activeTab]);

  const handleNotificationClick = async (item: any, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Notification clicked:', item);
    
    if (!item) {
      console.error('Item is null or undefined');
      return;
    }
    
    const notificationId = item.notificationId;
    
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
    
    // Check if this is a lead notification
    if (item.isLead) {
      // Navigate to leads page with lead ID in query params
      router.push(`/crm/leads?leadId=${item.id}`);
      setIsOpen(false);
      // Trigger a custom event to open the lead details modal
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openLeadDetails', { detail: { leadId: item.id } }));
        }, 100);
      }
    } else {
      // It's a contact notification
      const subAccountId = item.subAccountId || item.sub_account_id;
      const contactId = item.id;
      
      if (subAccountId) {
        console.log('Navigating to sub-account contacts:', subAccountId, 'with contact:', contactId);
        router.push(`/crm/subaccounts/${subAccountId}/contacts?contact=${contactId}`);
        setIsOpen(false);
      } else {
        console.error('No subAccountId found for contact:', item);
        alert('Unable to navigate: Contact is not associated with a sub-account.');
      }
    }
  };

  const handleMarkAsSeen = async (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const notificationId = item.notificationId;
    
    if (notificationId) {
      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_seen: true }),
        });
        
        if (response.ok) {
          // Trigger refresh to update notifications list
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshNotifications'));
          }
          // Also call refresh function directly
          if (refresh) {
            refresh();
          }
        } else {
          throw new Error('Failed to mark as seen');
        }
      } catch (error) {
        console.error('Error marking notification as seen:', error);
        alert('Failed to mark notification as seen');
      }
    }
  };

  const handleMarkAllAsSeen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentNotifications = activeTab === 'leads' ? leads : contacts;
    const unseenNotifications = currentNotifications.filter(n => !n.isSeen);
    
    if (unseenNotifications.length === 0) {
      return;
    }
    
    setMarkingAllAsSeen(true);
    
    try {
      // Mark all as seen in parallel
      const promises = unseenNotifications.map(item => {
        if (item.notificationId) {
          return fetch(`/api/notifications/${item.notificationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_seen: true }),
          });
        }
        return Promise.resolve(null);
      });
      
      await Promise.all(promises);
      
      // Trigger refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      }
      if (refresh) {
        refresh();
      }
    } catch (error) {
      console.error('Error marking all notifications as seen:', error);
      alert('Failed to mark all notifications as seen');
    } finally {
      setMarkingAllAsSeen(false);
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'No date';
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
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'DNP':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'ATCBL':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Unable to connect':
      case 'Number doesn\'t exist':
      case 'Wrong number':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const currentNotifications = activeTab === 'leads' ? leads : contacts;
  const currentCount = activeTab === 'leads' ? leads.length : contacts.length;
  const unseenCount = currentNotifications.filter(n => !n.isSeen).length;

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      {/* Follow-Up Notifications Bell */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowAINotifications(false);
        }}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 transition-all duration-200 hover:border-brand-gold/50 hover:shadow-lg hover:shadow-brand-gold/30 group"
        aria-label="Follow-Up Notifications"
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

      {/* AI Notifications Bell */}
      {username && (
        <button
          onClick={() => {
            setShowAINotifications(!showAINotifications);
            setIsOpen(false);
          }}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all duration-200 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/30 group"
          aria-label="AI Notifications"
        >
          <svg
            className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </button>
      )}

      {/* AI Notifications Panel */}
      {username && (
        <AINotificationsPanel
          employee={username}
          isOpen={showAINotifications}
          onClose={() => setShowAINotifications(false)}
        />
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute right-0 top-12 w-80 md:w-96 max-h-[600px] overflow-hidden rounded-2xl border-2 border-premium-gold shadow-2xl z-50 animate-fade-up" 
          style={{ 
            backgroundColor: '#1d0f0a', 
            opacity: '1', 
            background: '#1d0f0a', 
            backdropFilter: 'none', 
            WebkitBackdropFilter: 'none' 
          }}
        >
          {/* Dropdown Header */}
          <div 
            className="p-4 border-b border-premium-gold/30" 
            style={{ backgroundColor: '#2a1a15', opacity: '1', background: '#2a1a15' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔔</span>
                <span>Follow-Up Notifications</span>
              </h3>
              {unseenCount > 0 && (
                <button
                  onClick={handleMarkAllAsSeen}
                  disabled={markingAllAsSeen}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-premium-gold/80 hover:bg-premium-gold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-premium-gold/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  title="Mark All as Seen"
                >
                  {markingAllAsSeen ? (
                    <>
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Marking...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Mark All as Seen</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
              <button
                onClick={() => setActiveTab('leads')}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-t-lg transition-all duration-200 relative ${
                  activeTab === 'leads'
                    ? 'text-premium-gold bg-premium-gold/10 border-b-2 border-premium-gold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Leads
                {leads.length > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'leads' 
                      ? 'bg-premium-gold/30 text-premium-gold' 
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {leads.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-t-lg transition-all duration-200 relative ${
                  activeTab === 'contacts'
                    ? 'text-premium-gold bg-premium-gold/10 border-b-2 border-premium-gold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Contacts
                {contacts.length > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'contacts' 
                      ? 'bg-premium-gold/30 text-premium-gold' 
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {contacts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div 
            className="overflow-y-auto max-h-[450px]" 
            style={{ 
              backgroundColor: '#1d0f0a', 
              opacity: '1', 
              background: '#1d0f0a', 
              backdropFilter: 'none', 
              WebkitBackdropFilter: 'none' 
            }}
          >
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-slate-300 text-sm animate-pulse">Loading notifications...</p>
              </div>
            ) : currentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-300 text-sm">
                  No {activeTab === 'leads' ? 'lead' : 'contact'} follow-ups.
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* Section Header */}
                <div className="px-2 mb-2">
                  <h4 className="text-sm font-bold text-premium-gold uppercase tracking-wide">
                    {activeTab === 'leads' ? 'Lead Follow-Ups' : 'Contact Follow-Ups'}
                  </h4>
                </div>

                {/* Notification Cards */}
                {currentNotifications.map((item, index) => {
                  const dueToday = item.isDueToday ?? isToday(item.followUpDate);
                  const isSeen = item.isSeen || false;
                  
                  return (
                    <div
                      key={`${item.id}-${item.notificationId}-${index}`}
                      className={`group relative rounded-xl border transition-all duration-300 overflow-hidden animate-fade-in ${
                        dueToday
                          ? 'border-premium-gold/50 bg-gradient-to-r from-red-900/20 to-transparent shadow-lg shadow-red-900/20'
                          : 'border-premium-gold/20 bg-gradient-to-r from-premium-gold/5 to-transparent hover:border-premium-gold/40'
                      } ${isSeen ? 'opacity-50' : ''} hover:shadow-xl hover:shadow-premium-gold/20 hover:scale-[1.02] active:scale-[0.98]`}
                      style={{
                        animationDelay: `${index * 0.05}s`,
                      }}
                    >
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 bg-premium-gold/0 group-hover:bg-premium-gold/10 transition-all duration-300 pointer-events-none"></div>
                      
                      <div className="relative z-10 p-4">
                        <div className="flex items-start gap-3">
                          {/* Main Content - Clickable */}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={(e) => handleNotificationClick(item, e)}
                          >
                            {/* Name - Prominent */}
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="text-white font-bold text-base group-hover:text-premium-gold transition-colors duration-200">
                                {activeTab === 'leads' ? 'Lead:' : 'Contact:'} {item.name}
                              </h5>
                            </div>

                            {/* Account + Sub-Account Badges */}
                            {(item.accountName || item.subAccountName) && (
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-premium-gold/20 text-premium-gold border border-premium-gold/30">
                                  <span className="mr-1.5">🏢</span>
                                  {item.accountName || 'No Account'}
                                  {item.subAccountName && (
                                    <span className="ml-1.5 text-premium-gold/80">- {item.subAccountName}</span>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Date and Status Row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Date Badge */}
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                dueToday
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                              }`}>
                                <span className="mr-1.5">📅</span>
                                {dueToday ? 'Due Today' : formatDate(item.followUpDate)}
                              </span>

                              {/* Call Status Badge (Contacts only) */}
                              {!item.isLead && item.callStatus && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getCallStatusColor(item.callStatus)}`}>
                                  {item.callStatus}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Mark as Seen Button */}
                          <div className="flex items-center">
                            {!isSeen && (
                              <button
                                onClick={(e) => handleMarkAsSeen(item, e)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-green-500/80 hover:bg-green-500 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-green-500/50 flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                                title="Mark as Seen"
                              >
                                <span>✓</span>
                                <span>Mark Seen</span>
                              </button>
                            )}
                            {/* Arrow indicator on hover */}
                            <div className="text-premium-gold opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-200 ml-2">
                              →
                            </div>
                          </div>
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
