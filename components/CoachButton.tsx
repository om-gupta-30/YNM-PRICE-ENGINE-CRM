'use client';

import { useState, useEffect } from 'react';
import AIChatCoach from './AIChatCoach';

interface CoachButtonProps {
  user: string;
  role: 'employee' | 'admin';
  context?: {
    subAccountId?: number;
    accountId?: number;
  };
}

export default function CoachButton({ user, role, context }: CoachButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [pulseCount, setPulseCount] = useState(0);

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

  return (
    <>
      {/* Floating Button with Tooltip */}
      <div className="fixed bottom-6 right-6 z-[9997]">
        {/* Tooltip */}
        {showTooltip && !isOpen && (
          <div className="absolute bottom-full right-0 mb-3 animate-bounce">
            <div className="bg-slate-800 text-white px-4 py-2 rounded-xl shadow-lg border border-premium-gold/30 whitespace-nowrap">
              <div className="flex items-center gap-2">
                <span>💡</span>
                <span className="text-sm font-medium">Ask AI for help!</span>
              </div>
              <div className="absolute bottom-0 right-6 transform translate-y-1/2 rotate-45 w-3 h-3 bg-slate-800 border-r border-b border-premium-gold/30"></div>
            </div>
          </div>
        )}

        {/* Pulse rings */}
        <div className="absolute inset-0 -m-2">
          <span className="absolute inset-0 rounded-full bg-premium-gold/20 animate-ping" style={{ animationDuration: '2s' }}></span>
          <span className="absolute inset-0 rounded-full bg-premium-gold/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></span>
        </div>

        {/* Main Button */}
      <button
          onClick={() => {
            setIsOpen(true);
            setShowTooltip(false);
          }}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-premium-gold via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-600 hover:to-orange-500 text-white shadow-2xl shadow-premium-gold/40 hover:shadow-premium-gold/60 transition-all duration-300 flex items-center justify-center group hover:scale-110 active:scale-95"
        aria-label="Open AI Coach"
      >
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-premium-gold via-white to-premium-gold opacity-50 blur-sm animate-spin" style={{ animationDuration: '3s' }}></div>
          
          {/* Inner circle */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-premium-gold via-amber-500 to-amber-600"></div>
          
          {/* Icon */}
          <span className="relative text-3xl group-hover:scale-110 transition-transform duration-200 drop-shadow-lg">🤖</span>
          
          {/* Status dot */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
      </button>

        {/* Label */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs font-semibold text-premium-gold bg-slate-900/80 px-2 py-1 rounded-full border border-premium-gold/30">
            AI Coach
          </span>
        </div>
      </div>

      {/* Coach Chat Window */}
      <AIChatCoach
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        user={user}
        role={role}
        context={context}
      />
    </>
  );
}
