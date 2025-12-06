'use client';

import { useState, useEffect, useRef } from 'react';
import { IntentCategory } from '@/lib/ai/types/intentTypes';

interface IntentPreviewBadgeProps {
  question: string;
  realtime?: boolean;
  userId?: string;
}

interface IntentPreview {
  intent: {
    category: IntentCategory;
    tables: string[];
    filters?: Record<string, any>;
    aggregationType?: string;
    timeRange?: any;
  };
  confidence: number;
  explanation: string;
  estimatedComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
}

/**
 * Get icon component for intent category
 */
function getIntentIcon(category: IntentCategory) {
  const iconClass = "w-4 h-4";
  
  switch (category) {
    case IntentCategory.CONTACT_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case IntentCategory.ACCOUNT_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case IntentCategory.ACTIVITY_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case IntentCategory.QUOTATION_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case IntentCategory.LEAD_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case IntentCategory.PERFORMANCE_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case IntentCategory.AGGREGATION_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case IntentCategory.COMPARISON_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case IntentCategory.TREND_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case IntentCategory.PREDICTION_QUERY:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c0-4.207 3.403-7.617 7.617-7.617A7.616 7.616 0 0123.5 9c0 4.207-3.403 7.617-7.617 7.617A7.616 7.616 0 018.228 9z" />
        </svg>
      );
  }
}

/**
 * Get friendly label for intent category
 */
function getIntentLabel(category: IntentCategory, tables: string[]): string {
  const categoryLabels: Record<IntentCategory, string> = {
    [IntentCategory.CONTACT_QUERY]: 'Contacts',
    [IntentCategory.ACCOUNT_QUERY]: 'Accounts',
    [IntentCategory.ACTIVITY_QUERY]: 'Activities',
    [IntentCategory.QUOTATION_QUERY]: 'Quotations',
    [IntentCategory.LEAD_QUERY]: 'Leads',
    [IntentCategory.PERFORMANCE_QUERY]: 'Performance',
    [IntentCategory.AGGREGATION_QUERY]: 'Aggregations',
    [IntentCategory.COMPARISON_QUERY]: 'Comparisons',
    [IntentCategory.TREND_QUERY]: 'Trends',
    [IntentCategory.PREDICTION_QUERY]: 'Predictions',
  };

  const baseLabel = categoryLabels[category] || 'Data';
  
  // If specific tables are mentioned, use them
  if (tables.length > 0 && tables.length <= 2) {
    return tables.map(t => t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())).join(' & ');
  }
  
  return baseLabel;
}

/**
 * Get action verb for intent category
 */
function getActionVerb(category: IntentCategory): string {
  const verbs: Record<IntentCategory, string> = {
    [IntentCategory.CONTACT_QUERY]: 'Looking for',
    [IntentCategory.ACCOUNT_QUERY]: 'Searching',
    [IntentCategory.ACTIVITY_QUERY]: 'Checking',
    [IntentCategory.QUOTATION_QUERY]: 'Finding',
    [IntentCategory.LEAD_QUERY]: 'Analyzing',
    [IntentCategory.PERFORMANCE_QUERY]: 'Calculating',
    [IntentCategory.AGGREGATION_QUERY]: 'Aggregating',
    [IntentCategory.COMPARISON_QUERY]: 'Comparing',
    [IntentCategory.TREND_QUERY]: 'Analyzing',
    [IntentCategory.PREDICTION_QUERY]: 'Predicting',
  };

  return verbs[category] || 'Analyzing';
}

export default function IntentPreviewBadge({ question, realtime = true, userId }: IntentPreviewBadgeProps) {
  const [intentPreview, setIntentPreview] = useState<IntentPreview | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't fetch if question is too short or realtime is disabled
    if (!realtime || !question.trim() || question.trim().length < 5) {
      setIntentPreview(null);
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);

    // Debounce API call
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (userId) {
          headers['x-user-id'] = userId;
        }

        const res = await fetch('/api/ai/intent-preview', {
          method: 'POST',
          headers,
          body: JSON.stringify({ question: question.trim() }),
        });

        if (res.ok) {
          const data = await res.json();
          setIntentPreview(data);
        } else {
          setIntentPreview(null);
        }
      } catch (error) {
        // Silently fail - preview is optional
        setIntentPreview(null);
      } finally {
        setIsDetecting(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [question, realtime, userId]);

  // Don't render if no preview or question is too short
  if (!intentPreview || !question.trim() || question.trim().length < 5) {
    return null;
  }

  const { intent, confidence, explanation, estimatedComplexity } = intentPreview;
  const label = getIntentLabel(intent.category, intent.tables);
  const actionVerb = getActionVerb(intent.category);
  const icon = getIntentIcon(intent.category);

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 200);
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs text-cyan-300 backdrop-blur-sm transition-all duration-200 animate-fade-in"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Detecting animation */}
        {isDetecting && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
          </div>
        )}
        
        {/* Icon */}
        {!isDetecting && (
          <div className="text-cyan-400 animate-pulse-subtle">
            {icon}
          </div>
        )}
        
        {/* Label */}
        <span className="font-medium">
          {isDetecting ? 'Detecting...' : `${actionVerb}: ${label}`}
        </span>
        
        {/* Confidence indicator */}
        {!isDetecting && confidence > 0.7 && (
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && !isDetecting && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900/95 border border-slate-700/50 rounded-lg shadow-xl z-50 text-xs animate-fade-in-tooltip"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="space-y-2">
            <div>
              <p className="text-slate-400 text-xs mb-1">Intent Classification</p>
              <p className="text-white font-semibold">{intent.category.replace(/_/g, ' ')}</p>
            </div>
            
            {intent.tables.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Tables</p>
                <p className="text-cyan-300">{intent.tables.join(', ')}</p>
              </div>
            )}
            
            {intent.aggregationType && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Aggregation</p>
                <p className="text-cyan-300">{intent.aggregationType}</p>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <div>
                <p className="text-slate-400 text-xs">Confidence</p>
                <p className="text-white font-semibold">{(confidence * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Complexity</p>
                <p className={`font-semibold ${
                  estimatedComplexity === 'SIMPLE' ? 'text-green-400' :
                  estimatedComplexity === 'MODERATE' ? 'text-yellow-400' :
                  'text-orange-400'
                }`}>
                  {estimatedComplexity}
                </p>
              </div>
            </div>
            
            {explanation && (
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-slate-400 text-xs mb-1">Explanation</p>
                <p className="text-slate-300 text-xs leading-relaxed">{explanation}</p>
              </div>
            )}
          </div>
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700/50 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}

