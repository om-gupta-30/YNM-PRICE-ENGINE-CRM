'use client';

import { useState } from 'react';
import type { PricingAnalysisInput, PricingAnalysisOutput } from '@/lib/services/aiPricingAnalysis';

interface UseAIPricingReturn {
  isLoading: boolean;
  error: string | null;
  result: PricingAnalysisOutput | null;
  analyzePricing: (input: PricingAnalysisInput) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for AI pricing analysis
 * Handles API calls, loading states, and error handling
 */
export function useAIPricing(): UseAIPricingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingAnalysisOutput | null>(null);

  const analyzePricing = async (input: PricingAnalysisInput) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/pricing/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze pricing');
      }

      if (!data.success) {
        throw new Error(data.error || 'AI analysis failed');
      }

      setResult(data.data);
    } catch (err: any) {
      console.error('[useAIPricing] Error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  };

  return {
    isLoading,
    error,
    result,
    analyzePricing,
    reset,
  };
}

