# 🧪 AI Pricing Analysis - Testing Guide

## Quick Start Testing

### Prerequisites

1. ✅ Ensure your Next.js development server is running:
   ```bash
   npm run dev
   ```

2. ✅ Verify `GEMINI_API_KEY` is set in `.env.local`:
   ```bash
   # Check if the key is set
   cat .env.local | grep GEMINI_API_KEY
   ```

---

## Test 1: API Documentation (GET Request)

### Using Browser

Simply navigate to:
```
http://localhost:3000/api/pricing/analyze
```

### Using curl

```bash
curl http://localhost:3000/api/pricing/analyze
```

### Expected Response

```json
{
  "endpoint": "/api/pricing/analyze",
  "method": "POST",
  "description": "AI-powered pricing analysis using Gemini",
  "requestBody": { ... },
  "responseBody": { ... },
  "example": { ... }
}
```

✅ **Success Criteria**: You should see API documentation in JSON format.

---

## Test 2: Basic MBCB Pricing Analysis

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "mbcb",
    "ourPricePerUnit": 150.50,
    "competitorPricePerUnit": 155.00,
    "quantity": 1000
  }'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "recommendedPrice": 152.75,
    "winProbability": 78,
    "reasoning": "Your price is competitive and below competitor benchmark...",
    "suggestions": [
      "Consider volume discount for quantities > 1000",
      "Emphasize quality advantage over competitor"
    ]
  }
}
```

✅ **Success Criteria**:
- `success: true`
- `recommendedPrice` is a number
- `winProbability` is between 0-100
- `reasoning` is a non-empty string
- `suggestions` is an array with 2-3 items

---

## Test 3: Signages with Full Context

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "signages",
    "ourPricePerUnit": 85.00,
    "competitorPricePerUnit": 90.00,
    "clientDemandPricePerUnit": 80.00,
    "quantity": 500,
    "productSpecs": {
      "size": "600mm x 600mm",
      "reflectivity": "Type III",
      "material": "Aluminum"
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "recommendedPrice": 82.50,
    "winProbability": 85,
    "reasoning": "Your price is below competitor and close to client demand...",
    "suggestions": [
      "Highlight Type III reflectivity as premium feature",
      "Consider matching client demand exactly for quick closure",
      "Offer warranty to justify slight premium over client demand"
    ]
  }
}
```

✅ **Success Criteria**:
- AI considers all three price points (our, competitor, client)
- Recommendations factor in product specs
- Suggestions are actionable and relevant

---

## Test 4: Paint Without Competitor Data

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "paint",
    "ourPricePerUnit": 120.00,
    "clientDemandPricePerUnit": 110.00,
    "quantity": 2000
  }'
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "recommendedPrice": 115.00,
    "winProbability": 72,
    "reasoning": "Your price is above client demand by 9%...",
    "suggestions": [
      "Consider adjusting to client demand for higher win probability",
      "Justify premium with quality certifications",
      "Offer volume discount for quantities > 2000"
    ]
  }
}
```

✅ **Success Criteria**:
- AI works without competitor price
- Focuses on client demand vs our price
- Suggests negotiation strategies

---

## Test 5: Error Handling - Missing Required Field

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "mbcb",
    "ourPricePerUnit": 150.50
  }'
```

### Expected Response

```json
{
  "error": "Invalid quantity. Must be a positive number"
}
```

✅ **Success Criteria**:
- Returns 400 status code
- Error message is descriptive

---

## Test 6: Error Handling - Invalid Product Type

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "invalid",
    "ourPricePerUnit": 150.50,
    "quantity": 1000
  }'
```

### Expected Response

```json
{
  "error": "Invalid or missing productType. Must be: mbcb, signages, or paint"
}
```

✅ **Success Criteria**:
- Returns 400 status code
- Clear validation error message

---

## Test 7: Large Quantity Analysis

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "mbcb",
    "ourPricePerUnit": 145.00,
    "competitorPricePerUnit": 150.00,
    "quantity": 10000,
    "productSpecs": {
      "thickness": "3.0mm",
      "coating": "600 GSM"
    }
  }'
```

### Expected Response

AI should suggest:
- Volume discount opportunities
- Tiered pricing strategies
- Long-term relationship value

✅ **Success Criteria**:
- AI recognizes large quantity
- Suggestions include volume-based strategies

---

## Test 8: Below Competitor Price

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "signages",
    "ourPricePerUnit": 75.00,
    "competitorPricePerUnit": 90.00,
    "quantity": 1000
  }'
```

### Expected Response

AI should:
- Indicate high win probability (75%+)
- Suggest maintaining or slightly increasing price
- Emphasize competitive advantage

✅ **Success Criteria**:
- Win probability is high
- AI recognizes pricing power
- Suggestions leverage competitive position

---

## Test 9: Above Competitor Price

### curl Command

```bash
curl -X POST http://localhost:3000/api/pricing/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "mbcb",
    "ourPricePerUnit": 165.00,
    "competitorPricePerUnit": 150.00,
    "quantity": 1000
  }'
```

### Expected Response

AI should:
- Indicate lower win probability (40-60%)
- Suggest justifying premium or adjusting price
- Recommend highlighting differentiators

✅ **Success Criteria**:
- Win probability is moderate/low
- AI suggests competitive strategies
- Recommendations address price gap

---

## Test 10: Frontend Integration Test

### Create Test Button in W-Beam Form

Add this code to `app/mbcb/w-beam/page.tsx`:

```typescript
// Add state
const [aiAnalysis, setAiAnalysis] = useState<any>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);

// Add handler
const handleTestAIPricing = async () => {
  setIsAnalyzing(true);
  
  try {
    const response = await fetch('/api/pricing/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productType: 'mbcb',
        ourPricePerUnit: finalTotal || 150,
        competitorPricePerUnit: competitorPricePerUnit || 155,
        clientDemandPricePerUnit: clientDemandPricePerUnit || 145,
        quantity: quantityRm || 1000,
        productSpecs: {
          thickness: thickness || '2.5mm',
          coating: coating || '450 GSM',
          type: 'W-Beam',
        },
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      setAiAnalysis(result.data);
      setToast({ 
        message: `AI Recommendation: ₹${result.data.recommendedPrice.toFixed(2)} (${result.data.winProbability}% win probability)`, 
        type: 'success' 
      });
    } else {
      setToast({ message: `AI Error: ${result.error}`, type: 'error' });
    }
  } catch (error: any) {
    console.error('AI Pricing Error:', error);
    setToast({ message: 'Failed to get AI pricing recommendation', type: 'error' });
  } finally {
    setIsAnalyzing(false);
  }
};

// Add UI button (after Market Pricing section)
<button
  onClick={handleTestAIPricing}
  disabled={isAnalyzing}
  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 
             text-white rounded-lg hover:from-purple-700 hover:to-blue-700 
             disabled:opacity-50 transition-all duration-200"
>
  {isAnalyzing ? '⚙️ Analyzing...' : '🤖 Get AI Pricing Recommendation'}
</button>

{aiAnalysis && (
  <div className="mt-4 p-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 
                  border border-purple-500/30 rounded-lg">
    <h5 className="text-lg font-bold text-white mb-2">AI Analysis</h5>
    <p className="text-white">
      <strong>Recommended:</strong> ₹{aiAnalysis.recommendedPrice.toFixed(2)}
    </p>
    <p className="text-white">
      <strong>Win Probability:</strong> {aiAnalysis.winProbability}%
    </p>
    <p className="text-slate-300 text-sm mt-2">{aiAnalysis.reasoning}</p>
  </div>
)}
```

### Test Steps

1. Navigate to W-Beam form: `http://localhost:3000/mbcb/w-beam`
2. Fill in form fields (thickness, coating, quantity, etc.)
3. Enter competitor and client demand prices
4. Click "🤖 Get AI Pricing Recommendation"
5. Verify:
   - Button shows loading state
   - Toast notification appears
   - AI analysis card displays
   - Results are relevant to input

✅ **Success Criteria**:
- Button is clickable and responsive
- Loading state works
- Results display correctly
- Toast notifications work

---

## Monitoring & Debugging

### Check Server Logs

Look for these log messages:

```
[AI Pricing] Starting analysis for mbcb
[AI] Attempting inference with model: models/gemini-2.5-pro
[AI] Successfully parsed response from models/gemini-2.5-pro
[AI Pricing] Analysis complete: { recommendedPrice: 152.75, winProbability: 78, suggestionsCount: 3 }
[API /api/pricing/analyze] Analysis complete: { recommendedPrice: 152.75, winProbability: 78 }
```

### Common Issues

**Issue**: "Missing GEMINI_API_KEY env"
```
[AI] CRITICAL: Missing GEMINI_API_KEY or GOOGLE_GEMINI_API_KEY environment variable
```
**Solution**: Add `GEMINI_API_KEY=your_key` to `.env.local`

---

**Issue**: "AI pricing analysis failed: Model timeout"
```
[AI Pricing] Analysis failed: Model timeout
```
**Solution**: Retry the request. Service has built-in retry logic.

---

**Issue**: Empty or malformed response
```
[AI] Response not valid JSON: ...
```
**Solution**: Check if Gemini API is accessible. Service will retry with fallback model.

---

## Performance Testing

### Response Time Test

```bash
# Run 5 requests and measure time
for i in {1..5}; do
  echo "Request $i:"
  time curl -X POST http://localhost:3000/api/pricing/analyze \
    -H "Content-Type: application/json" \
    -d '{
      "productType": "mbcb",
      "ourPricePerUnit": 150,
      "quantity": 1000
    }' -s > /dev/null
  echo ""
done
```

✅ **Expected**: 2-4 seconds per request on average

---

## Test Checklist

- [ ] Test 1: GET documentation endpoint
- [ ] Test 2: Basic MBCB analysis
- [ ] Test 3: Signages with full context
- [ ] Test 4: Paint without competitor
- [ ] Test 5: Missing required field error
- [ ] Test 6: Invalid product type error
- [ ] Test 7: Large quantity analysis
- [ ] Test 8: Below competitor price
- [ ] Test 9: Above competitor price
- [ ] Test 10: Frontend integration
- [ ] Check server logs
- [ ] Verify response times

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| API Availability | 99%+ | ⏳ Test |
| Average Response Time | < 5s | ⏳ Test |
| Error Rate | < 5% | ⏳ Test |
| Valid JSON Response | 100% | ⏳ Test |
| Win Probability Range | 0-100 | ⏳ Test |

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. 🎨 Add AI button to all quotation forms (W-Beam, Thrie, Double W-Beam, Reflective Signages)
3. 💾 Save AI recommendations to database (`ai_suggested_price_per_unit`, `ai_win_probability`, `ai_pricing_insights`)
4. 📊 Track AI recommendation accuracy vs actual win rates
5. 🔄 Iterate on prompts based on feedback

---

**🎉 Happy Testing!**

