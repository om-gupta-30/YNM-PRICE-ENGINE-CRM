# Historical Pricing Recall - Code Snippets Reference

## 📝 Quick Copy-Paste Code Examples

---

## 1. Backend Service Function

**File:** `lib/services/historicalQuoteLookup.ts`

### MBCB Lookup Function
```typescript
export async function findLastMatchingMBCBQuote(
  specs: MBCBSpecs
): Promise<HistoricalQuoteMatch | null> {
  try {
    const supabase = createSupabaseServerClient();

    let query = supabase
      .from('quotes_mbcb')
      .select('total_cost_per_rm, ai_suggested_price_per_unit, ai_win_probability, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (specs.includeWBeam && specs.wBeamThickness && specs.wBeamCoating) {
      query = query
        .eq('w_beam_thickness', specs.wBeamThickness)
        .eq('w_beam_coating', specs.wBeamCoating);
    }

    if (specs.includePost && specs.postThickness && specs.postLength && specs.postCoating) {
      query = query
        .eq('post_thickness', specs.postThickness)
        .eq('post_length', specs.postLength)
        .eq('post_coating', specs.postCoating);
    }

    if (specs.includeSpacer && specs.spacerThickness && specs.spacerLength && specs.spacerCoating) {
      query = query
        .eq('spacer_thickness', specs.spacerThickness)
        .eq('spacer_length', specs.spacerLength)
        .eq('spacer_coating', specs.spacerCoating);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return null;
    }

    const match = data[0];
    return {
      pricePerUnit: match.total_cost_per_rm,
      aiSuggestedPrice: match.ai_suggested_price_per_unit,
      aiWinProbability: match.ai_win_probability,
      createdAt: new Date(match.created_at),
    };
  } catch (error) {
    console.error('[Historical Lookup] Error:', error);
    return null;
  }
}
```

### Signages Lookup Function
```typescript
export async function findLastMatchingSignagesQuote(
  specs: SignagesSpecs
): Promise<HistoricalQuoteMatch | null> {
  try {
    const supabase = createSupabaseServerClient();

    let query = supabase
      .from('quotes_signages')
      .select('cost_per_piece, ai_suggested_price_per_unit, ai_win_probability, created_at')
      .eq('shape', specs.shape)
      .eq('board_type', specs.boardType)
      .eq('reflectivity_type', specs.reflectivityType)
      .order('created_at', { ascending: false })
      .limit(1);

    // Match dimensions based on shape
    if (specs.shape === 'Circular' && specs.diameter) {
      query = query.eq('diameter', specs.diameter);
    } else if (specs.shape === 'Rectangular' && specs.width && specs.height) {
      query = query.eq('width', specs.width).eq('height', specs.height);
    } else if (specs.shape === 'Triangle' && specs.base && specs.triangleHeight) {
      query = query.eq('base', specs.base).eq('triangle_height', specs.triangleHeight);
    } else if (specs.shape === 'Octagonal' && specs.octagonalSize) {
      query = query.eq('octagonal_size', specs.octagonalSize);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return null;
    }

    const match = data[0];
    return {
      pricePerUnit: match.cost_per_piece,
      aiSuggestedPrice: match.ai_suggested_price_per_unit,
      aiWinProbability: match.ai_win_probability,
      createdAt: new Date(match.created_at),
    };
  } catch (error) {
    console.error('[Historical Lookup] Error:', error);
    return null;
  }
}
```

---

## 2. API Endpoint

**File:** `app/api/quotes/historical-lookup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { 
  findLastMatchingMBCBQuote, 
  findLastMatchingSignagesQuote,
  type MBCBSpecs,
  type SignagesSpecs
} from '@/lib/services/historicalQuoteLookup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productType, specs } = body;

    if (!productType || !specs) {
      return NextResponse.json(
        { success: false, error: 'Missing productType or specs' },
        { status: 400 }
      );
    }

    let match = null;

    if (productType === 'mbcb') {
      match = await findLastMatchingMBCBQuote(specs as MBCBSpecs);
    } else if (productType === 'signages') {
      match = await findLastMatchingSignagesQuote(specs as SignagesSpecs);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid productType' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: match,
    });
  } catch (error: any) {
    console.error('[API /api/quotes/historical-lookup] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lookup failed' },
      { status: 500 }
    );
  }
}
```

---

## 3. UI Component

**File:** `components/pricing/HistoricalPricingAlert.tsx`

```tsx
'use client';

import { useState } from 'react';
import type { HistoricalQuoteMatch } from '@/lib/services/historicalQuoteLookup';

interface HistoricalPricingAlertProps {
  match: HistoricalQuoteMatch;
  priceUnit: string;
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
            ₹{formattedPrice}{priceUnit.replace('₹', '')}
          </span>
          <span className="font-semibold"> on {formattedDate}</span>
        </p>
      </div>

      {/* Additional Info */}
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
```

---

## 4. Form Integration (MBCB Example)

**File:** `app/mbcb/w-beam/page.tsx` (or thrie/page.tsx, double-w-beam/page.tsx)

### Imports
```typescript
import { lookupHistoricalMBCBQuote, type HistoricalQuoteMatch } from '@/lib/services/historicalQuoteLookup';
import HistoricalPricingAlert from '@/components/pricing/HistoricalPricingAlert';
```

### State
```typescript
const [historicalMatch, setHistoricalMatch] = useState<HistoricalQuoteMatch | null>(null);
const [isLookingUpHistory, setIsLookingUpHistory] = useState(false);
```

### useEffect (Automatic Lookup)
```typescript
useEffect(() => {
  const lookupHistoricalPricing = async () => {
    if (historicalMatch || isLookingUpHistory) return;
    
    const hasWBeamSpecs = includeWBeam && wBeamThickness && wBeamCoating;
    const hasPostSpecs = includePost && postThickness && postLength && postCoating;
    const hasSpacerSpecs = includeSpacer && spacerThickness && spacerLength && spacerCoating;
    
    if (!hasWBeamSpecs && !hasPostSpecs && !hasSpacerSpecs) return;
    
    setIsLookingUpHistory(true);
    
    try {
      const match = await lookupHistoricalMBCBQuote({
        wBeamThickness,
        wBeamCoating,
        postThickness,
        postLength,
        postCoating,
        spacerThickness,
        spacerLength,
        spacerCoating,
        includeWBeam,
        includePost,
        includeSpacer,
      });
      
      if (match) {
        setHistoricalMatch(match);
      }
    } catch (error) {
      console.error('Error looking up historical pricing:', error);
    } finally {
      setIsLookingUpHistory(false);
    }
  };
  
  lookupHistoricalPricing();
}, [
  includeWBeam, wBeamThickness, wBeamCoating,
  includePost, postThickness, postLength, postCoating,
  includeSpacer, spacerThickness, spacerLength, spacerCoating,
  historicalMatch, isLookingUpHistory
]);
```

### Handlers
```typescript
const handleApplyHistoricalPrice = (price: number) => {
  const fixedCosts = 
    (includeTransportation ? transportationCostPerRm : 0) +
    (includeInstallation ? installationCostPerRm : 0) +
    poleCostPerRm +
    fabricationCostPerRm;
  
  const targetMaterialCost = price - fixedCosts;
  
  if (targetMaterialCost <= 0) {
    setToast({ 
      message: 'Cannot apply historical price - it is lower than fixed costs', 
      type: 'error' 
    });
    return;
  }
  
  const totalWeight = 
    (includeWBeam ? wBeamWeightPerRm : 0) +
    (includePost ? postWeightPerRm : 0) +
    (includeSpacer ? spacerWeightPerRm : 0);
  
  if (totalWeight <= 0) {
    setToast({ 
      message: 'Cannot calculate rate - total weight is zero', 
      type: 'error' 
    });
    return;
  }
  
  const newRatePerKg = targetMaterialCost / totalWeight;
  setRatePerKg(newRatePerKg);
  
  setToast({ 
    message: `Applied historical price of ₹${price.toFixed(2)}/rm`, 
    type: 'success' 
  });
};

const handleDismissHistoricalMatch = () => {
  setHistoricalMatch(null);
};
```

### JSX (Render)
```tsx
{/* Historical Pricing Alert */}
{historicalMatch && (
  <HistoricalPricingAlert
    match={historicalMatch}
    priceUnit="₹/rm"
    onApply={handleApplyHistoricalPrice}
    onDismiss={handleDismissHistoricalMatch}
  />
)}
```

---

## 5. Form Integration (Signages Example)

**File:** `app/signages/reflective/page.tsx`

### Imports
```typescript
import { lookupHistoricalSignagesQuote, type HistoricalQuoteMatch } from '@/lib/services/historicalQuoteLookup';
import HistoricalPricingAlert from '@/components/pricing/HistoricalPricingAlert';
```

### State
```typescript
const [historicalMatch, setHistoricalMatch] = useState<HistoricalQuoteMatch | null>(null);
const [isLookingUpHistory, setIsLookingUpHistory] = useState(false);
```

### useEffect (Automatic Lookup)
```typescript
useEffect(() => {
  const lookupHistoricalPricing = async () => {
    if (historicalMatch || isLookingUpHistory) return;
    
    if (!shape || !boardType || !reflectivityType) return;
    
    const hasDimensions = 
      (shape === 'Circular' && diameter) ||
      (shape === 'Rectangular' && width && height) ||
      (shape === 'Triangle' && base && triangleHeight) ||
      (shape === 'Octagonal' && octagonalSize);
    
    if (!hasDimensions) return;
    
    setIsLookingUpHistory(true);
    
    try {
      const match = await lookupHistoricalSignagesQuote({
        shape,
        boardType,
        reflectivityType,
        diameter: diameter || undefined,
        width: width || undefined,
        height: height || undefined,
        base: base || undefined,
        triangleHeight: triangleHeight || undefined,
        octagonalSize: octagonalSize || undefined,
      });
      
      if (match) {
        setHistoricalMatch(match);
      }
    } catch (error) {
      console.error('Error looking up historical pricing:', error);
    } finally {
      setIsLookingUpHistory(false);
    }
  };
  
  lookupHistoricalPricing();
}, [
  shape, boardType, reflectivityType,
  diameter, width, height, base, triangleHeight, octagonalSize,
  historicalMatch, isLookingUpHistory
]);
```

### Handlers
```typescript
const handleApplyHistoricalPrice = (price: number) => {
  const fixedCosts = 
    (includePost ? msPostCost : 0) +
    (includeFrame ? msFrameCost : 0) +
    vinylCost +
    laminationCost +
    fabricationCost;
  
  const targetBoardCost = price - fixedCosts;
  
  if (targetBoardCost <= 0 || !boardArea || boardArea <= 0) {
    setToast({ 
      message: 'Cannot apply historical price - invalid configuration', 
      type: 'error' 
    });
    return;
  }
  
  const newBoardRate = targetBoardCost / boardArea;
  setBoardRate(newBoardRate);
  
  setToast({ 
    message: `Applied historical price of ₹${price.toFixed(2)}/piece`, 
    type: 'success' 
  });
};

const handleDismissHistoricalMatch = () => {
  setHistoricalMatch(null);
};
```

### JSX (Render)
```tsx
{/* Historical Pricing Alert */}
{historicalMatch && (
  <HistoricalPricingAlert
    match={historicalMatch}
    priceUnit="₹/piece"
    onApply={handleApplyHistoricalPrice}
    onDismiss={handleDismissHistoricalMatch}
  />
)}
```

---

## 6. TypeScript Interfaces

```typescript
export interface HistoricalQuoteMatch {
  pricePerUnit: number;
  aiSuggestedPrice?: number | null;
  aiWinProbability?: number | null;
  createdAt: Date;
}

export interface MBCBSpecs {
  wBeamThickness?: number;
  wBeamCoating?: number;
  postThickness?: number;
  postLength?: number;
  postCoating?: number;
  spacerThickness?: number;
  spacerLength?: number;
  spacerCoating?: number;
  includeWBeam?: boolean;
  includePost?: boolean;
  includeSpacer?: boolean;
}

export interface SignagesSpecs {
  shape: string;
  boardType: string;
  reflectivityType: string;
  diameter?: number;
  width?: number;
  height?: number;
  base?: number;
  triangleHeight?: number;
  octagonalSize?: number;
}
```

---

## 7. Client-Side API Call

### MBCB
```typescript
const match = await lookupHistoricalMBCBQuote({
  wBeamThickness: 4,
  wBeamCoating: 120,
  postThickness: 4,
  postLength: 1800,
  postCoating: 120,
  includeWBeam: true,
  includePost: true,
  includeSpacer: false,
});
```

### Signages
```typescript
const match = await lookupHistoricalSignagesQuote({
  shape: 'Circular',
  boardType: 'Acrylic',
  reflectivityType: 'Type III',
  diameter: 600,
});
```

---

## 8. CSS/Tailwind Classes

```tsx
// Alert Container
className="mb-6 bg-gradient-to-br from-blue-900/40 to-blue-800/40 border-2 border-blue-500/50 rounded-xl p-6 backdrop-blur-sm animate-fade-in shadow-lg"

// Header
className="flex items-start justify-between mb-4"

// Icon
className="text-4xl"

// Title
className="text-xl font-bold text-white"

// Subtitle
className="text-sm text-blue-200"

// Main Message Box
className="bg-white/10 rounded-lg p-4 mb-4"

// Price
className="text-2xl font-bold text-blue-300"

// Info Card
className="bg-white/5 rounded-lg p-3"

// Apply Button
className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 font-semibold shadow-lg flex items-center justify-center gap-2"

// Ignore Button
className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-semibold"

// Dismiss Button
className="text-slate-400 hover:text-white transition-colors text-2xl leading-none"
```

---

**Status:** ✅ Ready to Use  
**Last Updated:** December 5, 2024

