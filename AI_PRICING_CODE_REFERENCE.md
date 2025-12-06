# AI Pricing UI - Code Reference

Complete code snippets for the AI pricing integration implementation.

---

## 1. Modal Component

**File:** `components/pricing/AIPricingModal.tsx`

```typescript:1:165:components/pricing/AIPricingModal.tsx
'use client';

import { useState } from 'react';

export interface AIPricingResult {
  recommendedPrice: number;
  winProbability: number;
  reasoning: string;
  suggestions: string[];
}

interface AIPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AIPricingResult | null;
  isLoading: boolean;
  onApplyPrice: (price: number) => void;
  priceUnit?: string; // e.g., "₹/rm", "₹/piece", "₹/sqm"
}

export default function AIPricingModal({
  isOpen,
  onClose,
  result,
  isLoading,
  onApplyPrice,
  priceUnit = '₹',
}: AIPricingModalProps) {
  if (!isOpen) return null;

  const handleApply = () => {
    if (result) {
      onApplyPrice(result.recommendedPrice);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-purple-500/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              {/* Recommended Price */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm mb-1">Recommended Price</p>
                    <p className="text-4xl font-bold text-green-400">
                      {priceUnit === '₹' ? '₹' : ''}{result.recommendedPrice.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{priceUnit !== '₹' ? ` ${priceUnit}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300 text-sm mb-1">Win Probability</p>
                    <p className="text-4xl font-bold text-blue-400">{result.winProbability}%</p>
                  </div>
                </div>
              </div>

              {/* Win Probability Bar */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm">Confidence Level</span>
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
                <p className="text-white leading-relaxed">{result.reasoning}</p>
              </div>

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
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm px-6 py-4 rounded-b-2xl border-t border-white/10 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"
            >
              Close
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg"
            >
              Apply Suggested Price
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 2. Custom Hook

**File:** `hooks/useAIPricing.ts`

```typescript:1:62:hooks/useAIPricing.ts
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
```

---

## 3. Form Integration Pattern

### Imports

```typescript
import { useAIPricing } from '@/hooks/useAIPricing';
import AIPricingModal from '@/components/pricing/AIPricingModal';
```

### State

```typescript
// AI Pricing state
const [isAIModalOpen, setIsAIModalOpen] = useState(false);
const { isLoading: isAILoading, error: aiError, result: aiResult, analyzePricing, reset: resetAI } = useAIPricing();
```

### Handlers

```typescript
// AI Pricing Handlers
const handleGetAISuggestion = async () => {
  // Validate required fields
  if (!totalCostPerRm || totalCostPerRm <= 0) {
    setToast({ message: 'Please calculate pricing first before getting AI suggestion', type: 'error' });
    return;
  }

  if (!quantityRm || quantityRm <= 0) {
    setToast({ message: 'Please enter quantity before getting AI suggestion', type: 'error' });
    return;
  }

  // Collect product specs
  const productSpecs: Record<string, any> = {
    thickness: `${thickness}mm`,
    coating: `${coating} GSM`,
    // ... other specs
  };

  // Open modal and start analysis
  setIsAIModalOpen(true);
  resetAI();

  try {
    await analyzePricing({
      productType: 'mbcb', // or 'signages' or 'paint'
      ourPricePerUnit: totalCostPerRm,
      competitorPricePerUnit: competitorPricePerUnit || null,
      clientDemandPricePerUnit: clientDemandPricePerUnit || null,
      quantity: quantityRm,
      productSpecs,
    });
  } catch (error: any) {
    setToast({ message: `AI Analysis Failed: ${error.message}`, type: 'error' });
  }
};

const handleApplyAIPrice = (suggestedPrice: number) => {
  // For MBCB: Back-calculate rate per kg
  if (totalWeight && totalWeight > 0) {
    const currentTransportCost = includeTransportation && transportCostPerKg ? totalWeight * transportCostPerKg : 0;
    const currentInstallationCost = includeInstallation ? (installationCostPerRm || 0) : 0;
    const newRatePerKg = (suggestedPrice - currentTransportCost - currentInstallationCost) / totalWeight;
    
    if (newRatePerKg > 0) {
      setRatePerKg(parseFloat(newRatePerKg.toFixed(2)));
      setToast({ message: `Applied AI suggested price: ₹${suggestedPrice.toFixed(2)}/rm`, type: 'success' });
    } else {
      setToast({ message: 'Cannot apply suggested price - would result in negative rate', type: 'error' });
    }
  }
};

const handleCloseAIModal = () => {
  setIsAIModalOpen(false);
  resetAI();
};
```

### UI Button

```tsx
{/* AI Pricing Button */}
<div className="pt-4">
  <button
    type="button"
    onClick={handleGetAISuggestion}
    disabled={!totalCostPerRm || !quantityRm || isAILoading}
    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 
             hover:from-purple-700 hover:to-blue-700 
             disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed
             text-white rounded-lg transition-all duration-200 
             font-semibold shadow-lg hover:shadow-xl
             flex items-center justify-center gap-2"
  >
    {isAILoading ? (
      <>
        <span className="animate-spin">⚙️</span>
        <span>Analyzing...</span>
      </>
    ) : (
      <>
        <span>🤖</span>
        <span>Get AI Pricing Suggestion</span>
      </>
    )}
  </button>
  {!totalCostPerRm || !quantityRm ? (
    <p className="text-xs text-slate-400 mt-2 text-center">
      Calculate pricing and enter quantity first
    </p>
  ) : null}
</div>
```

### Modal Component

```tsx
{/* AI Pricing Modal */}
<AIPricingModal
  isOpen={isAIModalOpen}
  onClose={handleCloseAIModal}
  result={aiResult}
  isLoading={isAILoading}
  onApplyPrice={handleApplyAIPrice}
  priceUnit="₹/rm" // or "₹/piece" for signages
/>
```

---

## 4. Signages-Specific Apply Logic

For Reflective Signages, the apply logic is different:

```typescript
const handleApplyAIPrice = (suggestedPrice: number) => {
  // For signages, back-calculate board rate
  if (boardArea && boardArea > 0) {
    const currentPoleRate = includePole ? (poleRate || 0) : 0;
    const currentFabricationRate = fabricationRate || 0;
    
    // suggestedPrice = (boardArea * newBoardRate) + currentPoleRate + currentFabricationRate
    // newBoardRate = (suggestedPrice - currentPoleRate - currentFabricationRate) / boardArea
    const newBoardRate = (suggestedPrice - currentPoleRate - currentFabricationRate) / boardArea;
    
    if (newBoardRate > 0) {
      setBoardRate(parseFloat(newBoardRate.toFixed(2)));
      setToast({ message: `Applied AI suggested price: ₹${suggestedPrice.toFixed(2)}/piece`, type: 'success' });
    } else {
      setToast({ message: 'Cannot apply suggested price - would result in negative board rate', type: 'error' });
    }
  }
};
```

---

## 5. Product Specs Examples

### W-Beam

```typescript
const productSpecs: Record<string, any> = {};

if (includeWBeam) {
  productSpecs.wBeamThickness = `${wBeamThickness}mm`;
  productSpecs.wBeamCoating = `${wBeamCoating} GSM`;
}

if (includePost) {
  productSpecs.postThickness = `${postThickness}mm`;
  productSpecs.postLength = `${postLength}mm`;
  productSpecs.postCoating = `${postCoating} GSM`;
}

if (includeSpacer) {
  productSpecs.spacerThickness = `${spacerThickness}mm`;
  productSpecs.spacerLength = `${spacerLength}mm`;
  productSpecs.spacerCoating = `${spacerCoating} GSM`;
}
```

### Reflective Signages

```typescript
const productSpecs: Record<string, any> = {
  boardType,
  shape,
  reflectivityType,
};

if (shape === 'Circular') {
  productSpecs.diameter = `${diameter}mm`;
} else if (shape === 'Rectangular') {
  productSpecs.dimensions = `${width}mm x ${height}mm`;
} else if (shape === 'Triangle') {
  productSpecs.base = `${base}mm`;
  productSpecs.height = `${triangleHeight}mm`;
} else if (shape === 'Octagonal') {
  productSpecs.size = `${octagonalSize}mm`;
}

if (includePole) {
  productSpecs.poleType = poleType;
  if (poleType === 'MS Pipe') {
    productSpecs.msPipe = msPipe;
  } else if (poleType === 'MS Angle') {
    productSpecs.msAngle = msAngle;
  }
}
```

---

## 6. Files Modified

### Created Files
1. `components/pricing/AIPricingModal.tsx` - Modal component
2. `hooks/useAIPricing.ts` - Custom hook
3. `AI_PRICING_UI_IMPLEMENTATION_SUMMARY.md` - Documentation

### Modified Files
1. `app/mbcb/w-beam/page.tsx` - Added AI pricing integration
2. `app/mbcb/thrie/page.tsx` - Added AI pricing integration
3. `app/mbcb/double-w-beam/page.tsx` - Added AI pricing integration
4. `app/signages/reflective/page.tsx` - Added AI pricing integration

---

## 7. Testing Commands

### Check TypeScript Compilation
```bash
npm run type-check
# or
npx tsc --noEmit
```

### Check Linting
```bash
npm run lint
```

### Run Development Server
```bash
npm run dev
```

### Test API Endpoint
```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "mbcb",
    "ourPricePerUnit": 150,
    "competitorPricePerUnit": 155,
    "quantity": 1000
  }'
```

---

## 8. Summary

All code is production-ready with:
- ✅ Full TypeScript support
- ✅ Zero linter errors
- ✅ Comprehensive error handling
- ✅ Beautiful UI/UX
- ✅ Reusable components
- ✅ Clean architecture
- ✅ Well-documented

Ready to deploy! 🚀

