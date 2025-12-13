'use client';

import { useState, useEffect, useRef } from 'react';
import type { PricingAnalysisOutput } from '@/lib/services/aiPricingAnalysis';
import { bringElementIntoView } from '@/lib/utils/bringElementIntoView';

// Alias for backward compatibility
export type AIPricingResult = PricingAnalysisOutput;

interface AIPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: PricingAnalysisOutput | null;
  isLoading: boolean;
  onApplyPrice: (price: number) => void;
  priceUnit?: string; // e.g., "₹/rm", "₹/piece", "₹/sqm"
  confidenceLevel?: number; // Optional: AI confidence based on past deals
}

export default function AIPricingModal({
  isOpen,
  onClose,
  result,
  isLoading,
  onApplyPrice,
  priceUnit = '₹',
  confidenceLevel,
}: AIPricingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll modal into view when it opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      bringElementIntoView(modalRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = (price?: number) => {
    if (result) {
      onApplyPrice(price || result.guaranteedWinPrice);
      onClose();
    }
  };

  // Determine confidence level (use prop value)
  const confidence = confidenceLevel || null;
  
  // Get confidence color and label
  const getConfidenceDisplay = (conf: number | null) => {
    if (conf === null) return null;
    
    if (conf >= 75) {
      return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'High Confidence', icon: '✓' };
    } else if (conf >= 50) {
      return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Moderate Confidence', icon: '⚠' };
    } else {
      return { color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Low Confidence', icon: '!' };
    }
  };
  
  const confidenceDisplay = confidence !== null ? getConfidenceDisplay(confidence) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-purple-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            🤖 AI Pricing Recommendation
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin text-6xl mb-4">⚙️</div>
              <p className="text-white text-lg">Analyzing pricing strategy...</p>
              <p className="text-slate-400 text-sm mt-2">This may take a few seconds</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Current Win Probability */}
              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm mb-1">Current Win Probability</p>
                    <p className="text-4xl font-bold text-blue-400">{result.winProbability}%</p>
                    <p className="text-xs text-slate-400 mt-2">Based on your current quoted price</p>
                  </div>
                  <div className="text-right">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                      result.winProbability >= 75 ? 'bg-green-500/20 border-4 border-green-500' :
                      result.winProbability >= 50 ? 'bg-yellow-500/20 border-4 border-yellow-500' :
                      'bg-red-500/20 border-4 border-red-500'
                    }`}>
                      <span className="text-3xl font-bold text-white">{result.winProbability}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guaranteed Win Price */}
              {result.guaranteedWinPrice && (
                <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-sm mb-1 flex items-center gap-2">
                        <span>🎯</span>
                        <span>Guaranteed Win Price</span>
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">100% Win</span>
                      </p>
                      <p className="text-3xl font-bold text-blue-400">
                        {priceUnit === '₹' ? '₹' : ''}{result.guaranteedWinPrice.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{priceUnit !== '₹' ? ` ${priceUnit}` : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        Price that guarantees 100% win probability
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300 text-sm mb-1">Win Probability</p>
                      <p className="text-4xl font-bold text-green-400">100%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Confidence Level (based on past deals) */}
              {confidenceDisplay && (
                <div className={`${confidenceDisplay.bg} border border-white/10 rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{confidenceDisplay.icon}</span>
                      <span className="text-slate-300 text-sm font-semibold">AI Confidence Level</span>
                    </div>
                    <span className={`${confidenceDisplay.color} text-sm font-bold`}>
                      {confidence}% ({confidenceDisplay.label})
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    Based on {confidence !== null ? (confidence >= 75 ? 'strong' : confidence >= 50 ? 'moderate' : 'limited') : 'limited'} historical performance with similar deals
                  </p>
                </div>
              )}

              {/* Win Probability Bar */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm">Win Probability</span>
                  <span className="text-white text-sm font-semibold">{result.winProbability}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      result.winProbability >= 75
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : result.winProbability >= 50
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-red-500 to-pink-500'
                    }`}
                    style={{ width: `${result.winProbability}%` }}
                  />
                </div>
              </div>

              {/* Reasoning */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  💡 AI Reasoning
                </h4>
                {typeof result.reasoning === 'string' ? (
                  <p className="text-white leading-relaxed">{result.reasoning}</p>
                ) : (
                  <div className="space-y-4">
                    {result.reasoning.priceSelection && (
                      <div>
                        <p className="text-slate-300 font-semibold mb-1">Price Selection:</p>
                        <p className="text-white leading-relaxed">{result.reasoning.priceSelection}</p>
                      </div>
                    )}
                    {result.reasoning.marginCheck && (
                      <div>
                        <p className="text-slate-300 font-semibold mb-1">Margin Check:</p>
                        <p className="text-white leading-relaxed">{result.reasoning.marginCheck}</p>
                      </div>
                    )}
                    {result.reasoning.recommendation && (
                      <div>
                        <p className="text-slate-300 font-semibold mb-1">Recommendation:</p>
                        <p className="text-white leading-relaxed">{result.reasoning.recommendation}</p>
                      </div>
                    )}
                    {/* Backward compatibility with old structure */}
                    {(() => {
                      const oldReasoning = result.reasoning as any;
                      return (
                        <>
                          {oldReasoning?.competitorAnalysis && (
                            <div>
                              <p className="text-slate-300 font-semibold mb-1">Competitor Analysis:</p>
                              <p className="text-white leading-relaxed">{oldReasoning.competitorAnalysis}</p>
                            </div>
                          )}
                          {oldReasoning?.historicalComparison && (
                            <div>
                              <p className="text-slate-300 font-semibold mb-1">Historical Comparison:</p>
                              <p className="text-white leading-relaxed">{oldReasoning.historicalComparison}</p>
                            </div>
                          )}
                          {oldReasoning?.demandAssessment && (
                            <div>
                              <p className="text-slate-300 font-semibold mb-1">Demand Assessment:</p>
                              <p className="text-white leading-relaxed">{oldReasoning.demandAssessment}</p>
                            </div>
                          )}
                          {oldReasoning?.marginConsideration && (
                            <div>
                              <p className="text-slate-300 font-semibold mb-1">Margin Consideration:</p>
                              <p className="text-white leading-relaxed">{oldReasoning.marginConsideration}</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Can Proceed Status */}
              {'canProceed' in result && (
                <div className={`${result.canProceed ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'} border rounded-lg p-4`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{result.canProceed ? '✅' : '❌'}</span>
                    <div>
                      <p className="text-white font-semibold">
                        {result.canProceed ? 'Deal Can Proceed' : 'Deal Cannot Proceed'}
                      </p>
                      <p className="text-slate-300 text-sm mt-1">
                        {result.canProceed 
                          ? `Margin of ${result.calculatedMargin?.toFixed(2) || 0}% meets the 1% minimum requirement`
                          : `Margin of ${result.calculatedMargin?.toFixed(2) || 0}% is below the 1% minimum requirement`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-300 mb-2 flex items-center gap-2">
                    ⚠️ Warnings
                  </h4>
                  <ul className="space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-red-200">
                        <span className="text-red-400 mt-1 flex-shrink-0">⚠</span>
                        <span className="leading-relaxed">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    📋 Strategic Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {result.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-white">
                        <span className="text-yellow-400 mt-1 flex-shrink-0">✓</span>
                        <span className="leading-relaxed">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No analysis available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && result && (
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm px-6 py-4 rounded-b-2xl border-t border-white/10 flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
              >
                Close
              </button>
              {result.guaranteedWinPrice && (
                <button
                  onClick={() => handleApply(result.guaranteedWinPrice)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg flex items-center justify-center gap-2"
                >
                  <span>🎯</span>
                  <span>Apply Guaranteed Win Price</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

