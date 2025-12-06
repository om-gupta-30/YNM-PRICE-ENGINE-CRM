# AI Pricing Analysis Service - Implementation Summary

## ✅ Deliverables Completed

### 1. AI Pricing Analysis Service (`lib/services/aiPricingAnalysis.ts`)

**Purpose**: Core business logic for AI-powered pricing recommendations

**Key Features**:
- ✅ Accepts pricing context (our price, competitor price, client demand, quantity, specs)
- ✅ Builds structured AI prompts for Gemini
- ✅ Returns recommended price, win probability, reasoning, and suggestions
- ✅ Validates and sanitizes AI responses
- ✅ Comprehensive error handling

**Key Functions**:
```typescript
analyzePricingWithAI(input: PricingAnalysisInput): Promise<PricingAnalysisOutput>
formatPricingAnalysis(analysis: PricingAnalysisOutput): string
```

---

### 2. API Endpoint (`app/api/pricing/analyze/route.ts`)

**Endpoint**: `POST /api/pricing/analyze`

**Features**:
- ✅ RESTful API interface
- ✅ Request validation (productType, ourPricePerUnit, quantity)
- ✅ Structured JSON responses
- ✅ Error handling with appropriate HTTP status codes
- ✅ GET endpoint for API documentation

**Request Body**:
```json
{
  "productType": "mbcb | signages | paint",
  "ourPricePerUnit": number,
  "competitorPricePerUnit": number (optional),
  "clientDemandPricePerUnit": number (optional),
  "quantity": number,
  "productSpecs": {} (optional)
}
```

**Response Body**:
```json
{
  "success": true,
  "data": {
    "recommendedPrice": number,
    "winProbability": number,
    "reasoning": string,
    "suggestions": string[]
  }
}
```

---

### 3. Gemini Integration (Reuses Existing Setup)

**Integration Points**:
- ✅ Uses `runGemini()` from `utils/ai.ts`
- ✅ Leverages existing `GoogleGenerativeAI` client
- ✅ Reuses API key configuration (`GEMINI_API_KEY` or `GOOGLE_GEMINI_API_KEY`)
- ✅ Benefits from existing retry logic and fallback mechanisms
- ✅ Uses `gemini-2.5-pro` (DEFAULT_MODEL) with `gemini-2.5-flash` fallback

**No New Configuration Required**: Service automatically uses existing Gemini setup from CRM chatbot.

---

### 4. AI System Prompt

**Role**: Pricing strategist for trading company

**Objectives**:
1. Stay above competitor benchmark
2. Support closure probability
3. Remain profitable

**Analysis Factors**:
- Our price vs competitor price
- Client demand price
- Product specifications
- Order quantity

**Output Format**: Strictly formatted JSON with `recommendedPrice`, `winProbability`, `reasoning`, `suggestions`

---

### 5. Request/Response Types

**TypeScript Interfaces** (in `lib/services/aiPricingAnalysis.ts`):

```typescript
export interface PricingAnalysisInput {
  productType: 'mbcb' | 'signages' | 'paint';
  ourPricePerUnit: number;
  competitorPricePerUnit?: number | null;
  clientDemandPricePerUnit?: number | null;
  quantity: number;
  productSpecs?: Record<string, any>;
}

export interface PricingAnalysisOutput {
  recommendedPrice: number;
  winProbability: number; // 0-100
  reasoning: string;
  suggestions: string[];
}
```

---

### 6. Comprehensive Documentation

**Created**: `docs/AI_PRICING_ANALYSIS_SERVICE.md`

**Contents**:
- Architecture overview
- API reference with examples
- Integration patterns for quotation forms
- AI prompt strategy
- Error handling
- Configuration
- Testing guide
- Troubleshooting
- Future enhancements

---

## 📋 Code Highlights

### Endpoint Handler (POST)

```typescript:1:65:app/api/pricing/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { analyzePricingWithAI, type PricingAnalysisInput } from '@/lib/services/aiPricingAnalysis';

/**
 * POST /api/pricing/analyze
 * 
 * AI-powered pricing analysis endpoint
 * Accepts pricing context and returns AI recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract and validate input
    const {
      productType,
      ourPricePerUnit,
      competitorPricePerUnit,
      clientDemandPricePerUnit,
      quantity,
      productSpecs,
    } = body;

    // Validation
    if (!productType || !['mbcb', 'signages', 'paint'].includes(productType)) {
      return NextResponse.json(
        { error: 'Invalid or missing productType. Must be: mbcb, signages, or paint' },
        { status: 400 }
      );
    }

    if (typeof ourPricePerUnit !== 'number' || ourPricePerUnit <= 0) {
      return NextResponse.json(
        { error: 'Invalid ourPricePerUnit. Must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid quantity. Must be a positive number' },
        { status: 400 }
      );
    }

    // Build input for AI service
    const input: PricingAnalysisInput = {
      productType,
      ourPricePerUnit,
      competitorPricePerUnit: competitorPricePerUnit || null,
      clientDemandPricePerUnit: clientDemandPricePerUnit || null,
      quantity,
      productSpecs: productSpecs || {},
    };

    console.log('[API /api/pricing/analyze] Processing request:', {
      productType,
      ourPricePerUnit,
      quantity,
      hasCompetitorPrice: !!competitorPricePerUnit,
      hasClientDemand: !!clientDemandPricePerUnit,
    });

    // Call AI service
    const analysis = await analyzePricingWithAI(input);
```

### Prompt-Building Code

```typescript:40:104:lib/services/aiPricingAnalysis.ts
function buildUserPrompt(input: PricingAnalysisInput): string {
  const {
    productType,
    ourPricePerUnit,
    competitorPricePerUnit,
    clientDemandPricePerUnit,
    quantity,
    productSpecs,
  } = input;

  // Format product type
  const productName = productType === 'mbcb' 
    ? 'Metal Beam Crash Barrier (MBCB)'
    : productType === 'signages'
    ? 'Road Signages'
    : 'Thermoplastic Paint';

  // Build pricing context
  let pricingContext = `Product: ${productName}
Our Current Price: ₹${ourPricePerUnit.toFixed(2)} per unit
Quantity: ${quantity} units`;

  if (competitorPricePerUnit && competitorPricePerUnit > 0) {
    pricingContext += `\nCompetitor Price: ₹${competitorPricePerUnit.toFixed(2)} per unit`;
  }

  if (clientDemandPricePerUnit && clientDemandPricePerUnit > 0) {
    pricingContext += `\nClient Demand Price: ₹${clientDemandPricePerUnit.toFixed(2)} per unit`;
  }

  // Add product specs if available
  if (productSpecs && Object.keys(productSpecs).length > 0) {
    pricingContext += `\n\nProduct Specifications:`;
    Object.entries(productSpecs).forEach(([key, value]) => {
      pricingContext += `\n- ${key}: ${value}`;
    });
  }

  pricingContext += `\n\nAnalyze the pricing situation and provide:
1. A recommended price per unit that balances competitiveness and profitability
2. Win probability (0-100) based on market positioning
3. Clear reasoning for your recommendation
4. 2-3 actionable suggestions for pricing strategy

Consider:
- If we're below competitor, we have pricing power
- If we're above competitor, justify the premium or suggest adjustment
- If client demand is known, factor in their budget constraints
- Larger quantities may allow for volume discounts
- Product specifications may justify premium pricing`;

  return pricingContext;
}
```

### Gemini Invocation and Parsing Logic

```typescript:115:176:lib/services/aiPricingAnalysis.ts
export async function analyzePricingWithAI(
  input: PricingAnalysisInput
): Promise<PricingAnalysisOutput> {
  console.log('[AI Pricing] Starting analysis for', input.productType);

  // Validate input
  if (!input.ourPricePerUnit || input.ourPricePerUnit <= 0) {
    throw new Error('Invalid our price per unit');
  }

  if (!input.quantity || input.quantity <= 0) {
    throw new Error('Invalid quantity');
  }

  try {
    // Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    // Call Gemini AI (reuses existing client from utils/ai.ts)
    const response = await runGemini<PricingAnalysisOutput>(systemPrompt, userPrompt);

    // Validate and sanitize response
    const recommendedPrice = typeof response.recommendedPrice === 'number' && response.recommendedPrice > 0
      ? response.recommendedPrice
      : input.ourPricePerUnit; // Fallback to current price

    const winProbability = typeof response.winProbability === 'number'
      ? Math.max(0, Math.min(100, response.winProbability))
      : 50; // Fallback to neutral probability

    const reasoning = typeof response.reasoning === 'string' && response.reasoning.trim()
      ? response.reasoning.trim()
      : 'AI analysis completed';

    const suggestions = Array.isArray(response.suggestions) && response.suggestions.length > 0
      ? response.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : ['Review pricing strategy', 'Consider market conditions'];

    console.log('[AI Pricing] Analysis complete:', {
      recommendedPrice,
      winProbability,
      suggestionsCount: suggestions.length,
    });

    return {
      recommendedPrice,
      winProbability,
      reasoning,
      suggestions,
    };
  } catch (error: any) {
    console.error('[AI Pricing] Analysis failed:', error.message);
    throw new Error(`AI pricing analysis failed: ${error.message}`);
  }
}
```

### Output Type Definition

```typescript:18:26:lib/services/aiPricingAnalysis.ts
export interface PricingAnalysisOutput {
  recommendedPrice: number;
  winProbability: number; // 0-100
  reasoning: string;
  suggestions: string[];
}
```

---

## 🧪 Testing

### Quick Test Commands

**1. Test GET (documentation)**:
```bash
curl http://localhost:3000/api/pricing/analyze
```

**2. Test POST (basic)**:
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

**3. Test POST (full context)**:
```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "signages",
    "ourPricePerUnit": 85,
    "competitorPricePerUnit": 90,
    "clientDemandPricePerUnit": 80,
    "quantity": 500,
    "productSpecs": {
      "size": "600mm x 600mm",
      "reflectivity": "Type III"
    }
  }'
```

---

## 🎯 Integration Example (Frontend)

### Add to Quotation Forms (W-Beam, Thrie, etc.)

```typescript
// State
const [aiAnalysis, setAiAnalysis] = useState<any>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);

// Handler
const handleAnalyzePricing = async () => {
  setIsAnalyzing(true);
  
  try {
    const response = await fetch('/api/pricing/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productType: 'mbcb',
        ourPricePerUnit: finalTotal || 0,
        competitorPricePerUnit: competitorPricePerUnit || null,
        clientDemandPricePerUnit: clientDemandPricePerUnit || null,
        quantity: quantityRm || 0,
        productSpecs: {
          thickness: thickness,
          coating: coating,
          type: 'W-Beam',
        },
      }),
    });

    const result = await response.json();

    if (result.success) {
      setAiAnalysis(result.data);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setIsAnalyzing(false);
  }
};

// UI Button
<button onClick={handleAnalyzePricing} disabled={isAnalyzing}>
  {isAnalyzing ? 'Analyzing...' : '🤖 Get AI Pricing Recommendation'}
</button>

// Display Results
{aiAnalysis && (
  <div className="ai-analysis-card">
    <h4>AI Pricing Analysis</h4>
    <p><strong>Recommended Price:</strong> ₹{aiAnalysis.recommendedPrice.toFixed(2)}</p>
    <p><strong>Win Probability:</strong> {aiAnalysis.winProbability}%</p>
    <p><strong>Reasoning:</strong> {aiAnalysis.reasoning}</p>
    <ul>
      {aiAnalysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
    </ul>
  </div>
)}
```

---

## ✅ Checklist

- [x] Created AI pricing analysis service (`lib/services/aiPricingAnalysis.ts`)
- [x] Created API endpoint (`app/api/pricing/analyze/route.ts`)
- [x] Integrated with existing Gemini client (reuses `utils/ai.ts`)
- [x] Defined request/response TypeScript types
- [x] Built structured AI system prompt
- [x] Implemented dynamic user prompt builder
- [x] Added request validation
- [x] Added response validation and sanitization
- [x] Implemented error handling
- [x] Created comprehensive documentation
- [x] Provided integration examples
- [x] Provided testing commands
- [x] No linter errors

---

## 🚀 Next Steps (Optional)

1. **Frontend Integration**: Add AI pricing button to W-Beam, Thrie, Double W-Beam, and Reflective Signages forms
2. **UI Enhancement**: Create reusable `AIPricingAnalysisCard` component
3. **Database Integration**: Save AI recommendations to `quotes_*` tables (use existing `ai_suggested_price_per_unit`, `ai_win_probability`, `ai_pricing_insights` fields)
4. **Testing**: Test with real quotation data
5. **Monitoring**: Track AI recommendation accuracy vs actual win rates

---

## 📝 Notes

- **No new dependencies**: Uses existing `@google/generative-ai` package
- **No new environment variables**: Reuses existing `GEMINI_API_KEY`
- **No middleware changes**: API endpoint is accessible by default
- **Type-safe**: Full TypeScript support throughout
- **Production-ready**: Comprehensive error handling and validation

