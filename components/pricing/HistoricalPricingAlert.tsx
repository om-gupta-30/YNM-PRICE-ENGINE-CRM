'use client';

import { useState } from 'react';
import type { HistoricalQuoteMatch } from '@/lib/services/historicalQuoteLookup';

interface HistoricalPricingAlertProps {
  match: HistoricalQuoteMatch;
  priceUnit: string; // e.g., "₹/rm", "₹/piece"
  onApply: (price: number) => void;
  onDismiss: () => void;
}

export default function HistoricalPricingAlert({
  match,
  priceUnit,
  onApply,
  onDismiss,
}: HistoricalPricingAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleApply = () => {
    onApply(match.pricePerUnit);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const formattedDate = match.createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedPrice = match.pricePerUnit.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mb-6 bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-2 border-blue-500/50 rounded-xl p-6 backdrop-blur-sm animate-fade-in shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🔍</span>
          <div>
            <h3 className="text-xl font-bold text-white">Historical Pricing Found</h3>
            <p className="text-sm text-blue-200">Similar configuration detected</p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Main Message */}
      <div className="bg-white/10 rounded-lg p-4 mb-4">
        <p className="text-white text-lg">
          <span className="font-semibold">Last time you priced this configuration at </span>
          <span className="text-2xl font-bold text-blue-300">
            {priceUnit === '₹/rm' || priceUnit === '₹/piece' ? '₹' : ''}{formattedPrice}
            {priceUnit !== '₹/rm' && priceUnit !== '₹/piece' ? ` ${priceUnit}` : priceUnit.replace('₹', '')}
          </span>
          <span className="font-semibold"> on {formattedDate}</span>
        </p>
      </div>

      {/* Additional Info (if available) */}
      {(match.aiSuggestedPrice || match.aiWinProbability) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {match.aiSuggestedPrice && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">AI Suggested (Last Time)</p>
              <p className="text-lg font-bold text-green-400">
                ₹{match.aiSuggestedPrice.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          )}
          {match.aiWinProbability && (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Win Probability (Last Time)</p>
              <p className="text-lg font-bold text-yellow-400">{match.aiWinProbability}%</p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleApply}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg flex items-center justify-center gap-2"
        >
          <span>✓</span>
          <span>Apply Previous Price</span>
        </button>
        <button
          onClick={handleDismiss}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
        >
          Ignore
        </button>
      </div>
    </div>
  );
}

