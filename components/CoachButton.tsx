'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AIChatCoach from './AIChatCoach';
import RAGChatInterface from './RAGChatInterface';
import PricingInsightsDashboard from './PricingInsightsDashboard';

interface CoachButtonProps {
  user: string;
  role: 'employee' | 'admin';
  userId?: string;
  context?: {
    subAccountId?: number;
    accountId?: number;
  };
}

type MenuMode = 'coach' | 'query' | 'insights' | null;

export default function CoachButton({ user, role, userId, context }: CoachButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [pulseCount, setPulseCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeMode, setActiveMode] = useState<MenuMode>(null);
  const [showPricingDashboard, setShowPricingDashboard] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Hide tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Pulse animation every 30 seconds to remind user
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseCount(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch unread insights count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        // You can replace this with actual API endpoint for unread insights
        // For now, we'll simulate with a check
        const response = await fetch('/api/ai/unread-insights-count', {
          headers: userId ? { 'x-user-id': userId } : {},
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        // Silently fail - unread count is optional
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [userId]);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setActiveMode('coach');
        setShowTooltip(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const handleMenuClick = (mode: MenuMode) => {
    setShowDropdown(false);
    
    if (mode === 'coach') {
      setIsOpen(true);
      setActiveMode('coach');
    } else if (mode === 'query') {
      setIsOpen(true);
      setActiveMode('query');
    } else if (mode === 'insights') {
      setShowPricingDashboard(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveMode(null);
  };

  const handleClosePricingDashboard = () => {
    setShowPricingDashboard(false);
  };


  // Quick tips for tooltip
  const quickTips = [
    'Press Cmd/Ctrl + K to open',
    'Ask about your performance',
    'Get pricing recommendations',
    'Query your CRM data',
  ];

  return (
    <>
      {/* Floating Button with Tooltip */}
      <div className="fixed bottom-6 right-6 z-[9997]">
        {/* Tooltip */}
        {showTooltip && !isOpen && (
          <div className="absolute bottom-full right-0 mb-3 animate-bounce">
            <div className="bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg border border-premium-gold/30 whitespace-nowrap">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span>💡</span>
                  <span className="text-sm font-medium">Ask AI for help!</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {quickTips[Math.floor(Math.random() * quickTips.length)]}
                </div>
              </div>
              <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-slate-800 border-r border-b border-premium-gold/30"></div>
            </div>
          </div>
        )}

        {/* Pulse rings - enhanced when unread count > 0 */}
        <div className="absolute inset-0 -m-2">
          <span 
            className={`absolute inset-0 rounded-full bg-premium-gold/20 animate-ping ${
              unreadCount > 0 ? 'bg-premium-gold/40' : ''
            }`} 
            style={{ animationDuration: '2s' }}
          ></span>
          <span 
            className={`absolute inset-0 rounded-full bg-premium-gold/10 animate-ping ${
              unreadCount > 0 ? 'bg-premium-gold/30' : ''
            }`} 
            style={{ animationDuration: '2s', animationDelay: '0.5s' }}
          ></span>
        </div>

        {/* Main Button */}
        <button
          ref={buttonRef}
          onClick={() => {
            if (showDropdown) {
              setShowDropdown(false);
            } else {
              setShowDropdown(true);
            }
          }}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-premium-gold via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-600 hover:to-orange-500 text-white shadow-2xl shadow-premium-gold/40 hover:shadow-premium-gold/60 transition-all duration-300 flex items-center justify-center group hover:scale-110 active:scale-95"
          aria-label="Open AI Coach"
        >
          {/* Animated gradient border - enhanced when unread */}
          <div 
            className={`absolute inset-0 rounded-full bg-gradient-to-r from-premium-gold via-white to-premium-gold opacity-50 blur-sm animate-spin ${
              unreadCount > 0 ? 'opacity-75' : ''
            }`} 
            style={{ animationDuration: unreadCount > 0 ? '1.5s' : '3s' }}
          ></div>
          
          {/* Inner circle */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-premium-gold via-amber-500 to-amber-600"></div>
          
          {/* Icon - enhanced animation when unread */}
          <span 
            className={`relative text-3xl group-hover:scale-110 transition-transform duration-200 drop-shadow-lg ${
              unreadCount > 0 ? 'animate-bounce' : ''
            }`}
            style={{ animationDuration: unreadCount > 0 ? '1s' : undefined }}
          >
            🤖
          </span>
          
          {/* Status dot */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
          
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full right-0 mb-3 w-56 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-fade-in-tooltip"
          >
            <div className="py-2">
              {/* Ask Coach */}
              <button
                onClick={() => handleMenuClick('coach')}
                className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-premium-gold/20 to-amber-600/20 flex items-center justify-center group-hover:from-premium-gold/30 group-hover:to-amber-600/30 transition-colors">
                  <span className="text-xl">🎯</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Ask Coach</div>
                  <div className="text-xs text-slate-400">Get coaching advice</div>
                </div>
                <span className="text-xs text-slate-500">⌘K</span>
              </button>

              {/* Ask Data */}
              <button
                onClick={() => handleMenuClick('query')}
                className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-blue-600/30 transition-colors">
                  <span className="text-xl">📊</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Ask Data</div>
                  <div className="text-xs text-slate-400">Query CRM data</div>
                </div>
              </button>

              {/* Pricing Insights */}
              <button
                onClick={() => handleMenuClick('insights')}
                className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors flex items-center gap-3 group relative"
              >
                {unreadCount > 0 && (
                  <span className="absolute left-2 top-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-pink-600/30 transition-colors">
                  <span className="text-xl">📈</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    Pricing Insights
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-red-500 rounded-full text-xs font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">View pricing analytics</div>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* Label */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs font-semibold text-premium-gold bg-slate-900/80 px-2 py-1 rounded-full border border-premium-gold/30">
            AI Coach
          </span>
        </div>
      </div>

      {/* Coach Chat Window */}
      {activeMode === 'coach' && (
        <AIChatCoach
          isOpen={isOpen}
          onClose={handleClose}
          user={user}
          role={role}
          context={context}
        />
      )}

      {/* Query Chat Window (CRM Ask Data) */}
      {activeMode === 'query' && userId && (
        <RAGChatInterface
          isOpen={isOpen}
          onClose={handleClose}
          userId={userId}
          initialMode="QUERY"
        />
      )}

      {/* Pricing Insights Dashboard Modal */}
      {showPricingDashboard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={handleClosePricingDashboard}>
          <div 
            className="fixed inset-4 sm:inset-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl z-[9999] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleClosePricingDashboard}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-red-500/50 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-full overflow-y-auto">
              <PricingInsightsDashboard />
            </div>
          </div>
        </div>
      )}

    </>
  );
}
