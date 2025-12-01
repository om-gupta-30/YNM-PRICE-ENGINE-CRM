'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface EngagementScoreBadgeProps {
  score: number;
  maxScore?: number;
}

interface ImprovementTemplate {
  text: string;
  basePoints: number;
  emoji: string;
  color: string;
}

/**
 * Engagement Score Badge with color coding based on benchmarks:
 * - 0-25: Red (Poor)
 * - 26-50: Yellow (Fair)
 * - 51-75: Orange (Good)
 * - 76-100: Green (Excellent)
 */
export default function EngagementScoreBadge({ score, maxScore = 100 }: EngagementScoreBadgeProps) {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll modal into view when it opens
  useEffect(() => {
    if (showModal && modalRef.current) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      }, 100);
    }
  }, [showModal]);

  // Ensure score is within bounds (0-100)
  const normalizedScore = Math.max(0, Math.min(maxScore, score || 0));
  
  // Determine color based on score ranges
  const getColorClasses = (score: number): string => {
    if (score >= 0 && score <= 25) {
      // Red - Poor
      return 'bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/30';
    } else if (score >= 26 && score <= 50) {
      // Yellow - Fair
      return 'bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-lg shadow-yellow-500/30';
    } else if (score >= 51 && score <= 75) {
      // Orange - Good
      return 'bg-gradient-to-r from-orange-500 to-orange-400 shadow-lg shadow-orange-500/30';
    } else {
      // Green - Excellent (76-100)
      return 'bg-gradient-to-r from-green-500 to-green-400 shadow-lg shadow-green-500/30';
    }
  };
  
  const getStatusText = (score: number): string => {
    if (score >= 0 && score <= 25) return 'Poor';
    if (score >= 26 && score <= 50) return 'Fair';
    if (score >= 51 && score <= 75) return 'Good';
    return 'Excellent';
  };

  // Engagement score point system
  const engagementPoints = {
    successfulCall: { points: 10, emoji: '📞', color: 'text-green-400' },
    noteAdded: { points: 5, emoji: '📝', color: 'text-blue-400' },
    quotationCreated: { points: 15, emoji: '📄', color: 'text-purple-400' },
    closedWon: { points: 20, emoji: '🎉', color: 'text-green-500' },
    taskCompleted: { points: 5, emoji: '✅', color: 'text-blue-400' },
    followUpScheduled: { points: 10, emoji: '📅', color: 'text-yellow-400' },
    meetingScheduled: { points: 10, emoji: '🤝', color: 'text-indigo-400' },
    contactAdded: { points: 5, emoji: '👤', color: 'text-cyan-400' },
  } as const;

  const improvementText: Record<keyof typeof engagementPoints, string> = {
    successfulCall: 'Schedule successful follow-up calls with key contacts',
    noteAdded: 'Add detailed notes after important conversations',
    quotationCreated: 'Create and send quotations proactively',
    closedWon: 'Close quotations as "Closed Won"',
    taskCompleted: 'Complete pending tasks and follow-ups',
    followUpScheduled: 'Schedule follow-ups for pending items',
    meetingScheduled: 'Schedule meetings to understand client requirements',
    contactAdded: 'Add more contacts to expand reach',
  };

  const createTemplate = (
    type: keyof typeof engagementPoints,
    options?: { text?: string; points?: number }
  ): ImprovementTemplate => ({
    text: options?.text ?? improvementText[type],
    basePoints: options?.points ?? engagementPoints[type].points,
    emoji: engagementPoints[type].emoji,
    color: engagementPoints[type].color,
  });

  const buildImprovementPlan = (score: number, templates: ImprovementTemplate[]) => {
    let remaining = Math.max(0, maxScore - score);
    const plan: Array<{ text: string; points: number; emoji: string; color: string }> = [];

    templates.forEach((template) => {
      if (remaining <= 0) return;
      const points = Math.min(template.basePoints, remaining);
      if (points <= 0) return;
      plan.push({
        text: template.text,
        points,
        emoji: template.emoji,
        color: template.color,
      });
      remaining -= points;
    });

    if (remaining > 0) {
      plan.push({
        text: 'Keep nurturing this account with additional personalized touchpoints',
        points: remaining,
        emoji: '✨',
        color: 'text-yellow-400',
      });
    }

    return plan;
  };

  // Get detailed feedback based on score
  const getDetailedFeedback = (score: number): { 
    reason: string; 
    improvements: Array<{ text: string; points: number; emoji: string; color: string }>;
    isMaintenance: boolean;
  } => {
    // If score is 100, show maintenance/sustain tips (NO POINTS, NO IMPROVEMENT)
    if (score >= 100) {
      return {
        reason: 'Perfect engagement score! This account has exceptional relationship management with excellent communication, frequent quotations, and successful conversions.',
        isMaintenance: true,
        improvements: [
          { text: 'Continue regular follow-up calls to maintain strong relationships', points: 0, emoji: '📞', color: 'text-green-400' },
          { text: 'Maintain consistent quotation creation for new opportunities', points: 0, emoji: '📄', color: 'text-purple-400' },
          { text: 'Keep closing deals successfully with "Closed Won" status', points: 0, emoji: '🎉', color: 'text-green-500' },
          { text: 'Schedule strategic meetings for expansion and upselling', points: 0, emoji: '🤝', color: 'text-indigo-400' },
          { text: 'Document all interactions with detailed notes for continuity', points: 0, emoji: '📝', color: 'text-blue-400' },
          { text: 'Continue adding new contacts to expand your network', points: 0, emoji: '👤', color: 'text-cyan-400' }
        ]
      };
    }

    if (score >= 0 && score <= 25) {
      return {
        reason: 'Low engagement indicates minimal interaction with this account. Limited contact activity, few quotations, or no successful conversions.',
        isMaintenance: false,
        improvements: buildImprovementPlan(score, [
          createTemplate('closedWon', { points: 25 }),
          createTemplate('quotationCreated', { points: 20 }),
          createTemplate('successfulCall', { points: 15 }),
          createTemplate('meetingScheduled', { points: 10 }),
          createTemplate('contactAdded', { points: 10 }),
          createTemplate('taskCompleted', { points: 5 }),
          createTemplate('noteAdded', { points: 5 }),
          createTemplate('followUpScheduled', { points: 10 }),
        ]),
      };
    } else if (score >= 26 && score <= 50) {
      return {
        reason: 'Fair engagement shows some activity but needs improvement. Regular interactions are happening but conversion rates could be better.',
        isMaintenance: false,
        improvements: buildImprovementPlan(score, [
          createTemplate('closedWon', { points: 20, text: 'Convert quotations to "Closed Won" status' }),
          createTemplate('quotationCreated', { points: 15, text: 'Create more quotations for new opportunities' }),
          createTemplate('successfulCall', { points: 10, text: 'Schedule regular check-in calls' }),
          createTemplate('followUpScheduled', { points: 10 }),
          createTemplate('noteAdded', { points: 5 }),
          createTemplate('taskCompleted', { points: 5 }),
          createTemplate('contactAdded', { points: 5 }),
        ]),
      };
    } else if (score >= 51 && score <= 75) {
      return {
        reason: 'Good engagement demonstrates active relationship management. Regular communications and successful conversions are occurring.',
        isMaintenance: false,
        improvements: buildImprovementPlan(score, [
          createTemplate('closedWon', { points: 20, text: 'Close more deals (increase Closed Won rate)' }),
          createTemplate('quotationCreated', { points: 15, text: 'Continue creating quotations for new opportunities' }),
          createTemplate('successfulCall', { points: 10, text: 'Maintain consistent follow-up call schedules' }),
          createTemplate('meetingScheduled', { points: 10, text: 'Schedule meetings to build relationships' }),
          createTemplate('noteAdded', { points: 5 }),
          createTemplate('contactAdded', { points: 5 }),
        ]),
      };
    } else {
      // 76-99
      return {
        reason: 'Excellent engagement! You\'re very close to perfect. Keep up the great work with a few more strategic actions.',
        isMaintenance: false,
        improvements: buildImprovementPlan(score, [
          createTemplate('closedWon', { points: 15, text: 'Close one more deal with "Closed Won"' }),
          createTemplate('successfulCall', { points: 10, text: 'Schedule a strategic follow-up call' }),
          createTemplate('meetingScheduled', { points: 10, text: 'Schedule an expansion meeting' }),
          createTemplate('quotationCreated', { points: 10, text: 'Create another quotation for a new opportunity' }),
          createTemplate('noteAdded', { points: 5, text: 'Add detailed notes from recent interactions' }),
          createTemplate('taskCompleted', { points: 5, text: 'Complete any pending tasks or follow-ups' }),
        ]),
      };
    }
  };

  const feedback = getDetailedFeedback(normalizedScore);
  const statusText = getStatusText(normalizedScore);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        title="Click to view engagement score details and improvement tips"
        className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-bold text-white cursor-pointer ${getColorClasses(normalizedScore)} transition-all duration-300 hover:scale-105 active:scale-95 relative z-10 focus:outline-none focus:ring-2 focus:ring-premium-gold focus:ring-offset-2 focus:ring-offset-slate-900`}
      >
        {normalizedScore}
      </button>

      {/* Engagement Score Modal - Using Portal */}
      {showModal && mounted && createPortal(
        <div 
          className="engagement-score-modal-overlay fixed inset-0 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          style={{ 
            zIndex: 2147483647,
            position: 'fixed',
            paddingTop: '5vh', // Start a bit from top for better visibility
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div 
            className="engagement-score-modal-content glassmorphic-premium rounded-3xl max-w-lg w-full border-2 border-premium-gold/30 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-up my-8"
            style={{
              zIndex: 2147483647,
              position: 'relative',
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            ref={modalRef}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getColorClasses(normalizedScore)}`}>
                  <span className="text-xl font-bold text-white">{normalizedScore}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-white">Engagement Score</h2>
                  <p className="text-sm text-slate-300">{statusText} Performance</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-white text-2xl font-bold transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 modal-scrollable">
              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-premium-gold mb-2">Why this score?</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{feedback.reason}</p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-4 border border-premium-gold/20">
                  <p className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                    <span>{feedback.isMaintenance ? '⭐' : '🚀'}</span>
                    <span>{feedback.isMaintenance ? 'Tips to Sustain Perfect Score:' : 'How to Improve & Earn Points:'}</span>
                  </p>
                  <ul className="space-y-3">
                    {feedback.improvements.filter(imp => feedback.isMaintenance || imp.points > 0).map((improvement, idx) => (
                      <li 
                        key={idx} 
                        className="text-sm text-slate-200 leading-relaxed flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-600/30 to-transparent hover:from-slate-600/50 transition-all duration-200 border border-white/5 hover:border-premium-gold/30 group"
                      >
                        <span className="text-2xl flex-shrink-0">{improvement.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className="group-hover:text-white transition-colors">{improvement.text}</span>
                        </div>
                        {!feedback.isMaintenance && improvement.points > 0 && (
                          <div className={`flex-shrink-0 px-3 py-1 rounded-full bg-gradient-to-r ${improvement.color} font-bold text-white text-xs flex items-center gap-1 shadow-lg animate-pulse`}>
                            <span>+{improvement.points}</span>
                            <span className="text-xs">pts</span>
                          </div>
                        )}
                        {feedback.isMaintenance && (
                          <div className="flex-shrink-0 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-green-400 font-bold text-white text-xs flex items-center gap-1 shadow-lg">
                            <span>✓</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-slate-400 italic">
                      {feedback.isMaintenance 
                        ? '💡 Keep up the excellent work! Follow these tips to sustain your perfect engagement score.'
                        : (() => {
                            const totalPoints = feedback.improvements.reduce((sum, imp) => sum + imp.points, 0);
                            const newScore = Math.min(maxScore, normalizedScore + totalPoints);
                            return `💡 Complete these actions to reach 100! Current: ${normalizedScore} + ${totalPoints} points = ${newScore} points.`;
                          })()
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-premium-gold/20 to-transparent rounded-lg p-4 border border-premium-gold/30">
                  <p className="text-xs text-premium-gold font-semibold mb-2 uppercase tracking-wide">Current Score</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-extrabold text-white">
                      {normalizedScore} <span className="text-lg text-slate-300">/ {maxScore}</span>
                    </p>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-1">Progress</p>
                      <div className="w-24 h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${getColorClasses(normalizedScore)}`}
                          style={{ width: `${(normalizedScore / maxScore) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 pt-4 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 text-lg font-bold text-white bg-gradient-to-r from-premium-gold to-dark-gold hover:from-dark-gold hover:to-premium-gold rounded-xl transition-all duration-300 shadow-lg shadow-premium-gold/50 hover:shadow-xl hover:shadow-premium-gold/70"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

