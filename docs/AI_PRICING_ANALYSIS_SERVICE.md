# AI Pricing Analysis Service Documentation

## Overview

The AI Pricing Analysis Service provides intelligent pricing recommendations using Google Gemini AI. It analyzes pricing context including competitor prices, client demand, and product specifications to suggest optimal pricing strategies.

---

## Architecture

### Components

1. **AI Service Layer** (`lib/services/aiPricingAnalysis.ts`)
   - Core business logic for pricing analysis
   - Integrates with existing Gemini client from `utils/ai.ts`
   - Builds structured prompts for AI analysis
   - Validates and sanitizes AI responses

2. **API Endpoint** (`app/api/pricing/analyze/route.ts`)
   - RESTful API interface for pricing analysis
   - Request validation and error handling
   - Returns structured JSON responses

3. **Gemini Integration** (Reuses existing setup)
   - Uses `runGemini()` from `utils/ai.ts`
   - Leverages existing API key configuration
   - Benefits from existing retry logic and fallback mechanisms

---

## API Reference

### Endpoint

```
POST /api/pricing/analyze
```

### Request Body

```typescript
{
  productType: 'mbcb' | 'signages' | 'paint';  // Required
  ourPricePerUnit: number;                      // Required - Your calculated price
  competitorPricePerUnit?: number;              // Optional - Competitor's price
  clientDemandPricePerUnit?: number;            // Optional - Client's requested price
  quantity: number;                             // Required - Order quantity
  productSpecs?: Record<string, any>;           // Optional - Product specifications
}
```

### Response Body

```typescript
{
  success: boolean;
  data?: {
    recommendedPrice: number;      // AI-recommended price per unit
    winProbability: number;        // Win probability (0-100)
    reasoning: string;             // AI explanation
    suggestions: string[];         // Actionable recommendations
  };
  error?: string;                  // Error message if failed
}
```

---

## Usage Examples

### Example 1: Basic Pricing Analysis (MBCB)

```typescript
const response = await fetch('/api/pricing/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productType: 'mbcb',
    ourPricePerUnit: 150.50,
    competitorPricePerUnit: 155.00,
    clientDemandPricePerUnit: 145.00,
    quantity: 1000,
    productSpecs: {
      thickness: '2.5mm',
      coating: '450 GSM',
      type: 'W-Beam',
    },
  }),
});

const result = await response.json();

if (result.success) {
  console.log('Recommended Price:', result.data.recommendedPrice);
  console.log('Win Probability:', result.data.winProbability + '%');
  console.log('Reasoning:', result.data.reasoning);
  console.log('Suggestions:', result.data.suggestions);
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "recommendedPrice": 152.75,
    "winProbability": 78,
    "reasoning": "Your price is competitive and below competitor benchmark. With a 5% discount from competitor pricing, you have strong positioning. The client's demand is slightly lower, but the quality specifications justify the premium.",
    "suggestions": [
      "Consider volume discount for quantities > 1000 units",
      "Emphasize quality advantage (450 GSM coating) over competitor",
      "Offer flexible payment terms to match client budget constraints"
    ]
  }
}
```

### Example 2: Signages Without Competitor Data

```typescript
const response = await fetch('/api/pricing/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productType: 'signages',
    ourPricePerUnit: 85.00,
    quantity: 500,
    productSpecs: {
      size: '600mm x 600mm',
      reflectivity: 'Type III',
      material: 'Aluminum',
    },
  }),
});
```

### Example 3: Paint with Client Demand Only

```typescript
const response = await fetch('/api/pricing/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    productType: 'paint',
    ourPricePerUnit: 120.00,
    clientDemandPricePerUnit: 110.00,
    quantity: 2000,
  }),
});
```

---

## Integration with Quotation Forms

### Frontend Integration Pattern

```typescript
// In your quotation form (e.g., W-Beam page)

const [aiAnalysis, setAiAnalysis] = useState<any>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      // Optionally auto-fill recommended price
      // setFinalTotal(result.data.recommendedPrice);
    } else {
      console.error('AI analysis failed:', result.error);
    }
  } catch (error) {
    console.error('Error calling AI pricing API:', error);
  } finally {
    setIsAnalyzing(false);
  }
};

// UI Component
<button
  onClick={handleAnalyzePricing}
  disabled={isAnalyzing || !finalTotal || !quantityRm}
  className="btn-primary"
>
  {isAnalyzing ? 'Analyzing...' : '🤖 Get AI Pricing Recommendation'}
</button>

{aiAnalysis && (
  <div className="ai-analysis-card">
    <h4>AI Pricing Analysis</h4>
    <div>
      <strong>Recommended Price:</strong> ₹{aiAnalysis.recommendedPrice.toFixed(2)}
    </div>
    <div>
      <strong>Win Probability:</strong> {aiAnalysis.winProbability}%
    </div>
    <div>
      <strong>Reasoning:</strong> {aiAnalysis.reasoning}
    </div>
    <div>
      <strong>Suggestions:</strong>
      <ul>
        {aiAnalysis.suggestions.map((suggestion, idx) => (
          <li key={idx}>{suggestion}</li>
        ))}
      </ul>
    </div>
  </div>
)}
```

---

## AI Prompt Strategy

### System Prompt

The service uses a structured system prompt that defines the AI's role as a pricing strategist with three key objectives:

1. **Stay above competitor benchmark** - Maintain competitive positioning
2. **Support closure probability** - Maximize win rate
3. **Remain profitable** - Ensure healthy margins

### User Prompt

The user prompt dynamically includes:

- Product type and name
- Current pricing (our price)
- Competitor pricing (if available)
- Client demand pricing (if available)
- Order quantity
- Product specifications (if provided)

### Output Format

The AI is instructed to return strictly formatted JSON:

```json
{
  "recommendedPrice": number,
  "winProbability": number,
  "reasoning": string,
  "suggestions": string[]
}
```

---

## Error Handling

### Service Layer Errors

The `aiPricingAnalysis.ts` service handles errors gracefully:

- **Invalid input validation** - Throws descriptive errors
- **AI service failures** - Propagates error with context
- **Response validation** - Sanitizes and validates AI output
- **Fallback values** - Uses safe defaults when AI response is malformed

### API Layer Errors

The API endpoint returns appropriate HTTP status codes:

- **400 Bad Request** - Invalid or missing required fields
- **500 Internal Server Error** - AI service failure or unexpected errors

Example error response:

```json
{
  "success": false,
  "error": "AI pricing analysis failed: Model timeout"
}
```

---

## Configuration

### Environment Variables

The service reuses existing Gemini configuration:

```bash
# Required (one of these)
GEMINI_API_KEY=your_api_key_here
# OR
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

### AI Model Configuration

The service uses the existing model configuration from `utils/ai.ts`:

- **Primary Model**: `gemini-2.5-pro` (DEFAULT_MODEL)
- **Fallback Model**: `gemini-2.5-flash` (FAST_MODEL)
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max Tokens**: 1024 (sufficient for pricing analysis)

---

## Testing

### Manual Testing

1. **Test GET endpoint** (documentation):
   ```bash
   curl http://localhost:3000/api/pricing/analyze
   ```

2. **Test POST endpoint** (basic analysis):
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

3. **Test with full context**:
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

### Test Cases

| Test Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| Below competitor | our: 145, comp: 155 | High win probability, validate pricing power |
| Above competitor | our: 165, comp: 155 | Lower win probability, suggest justification |
| Match client demand | our: 145, client: 145 | High win probability, confirm alignment |
| Above client demand | our: 155, client: 145 | Moderate win probability, suggest negotiation |
| Large quantity | quantity: 5000 | Suggest volume discounts |
| No competitor data | comp: null | Base analysis on client demand and specs |

---

## Performance Considerations

### Response Time

- **Average**: 2-4 seconds (Gemini API latency)
- **Max**: 10 seconds (with retries)
- **Recommendation**: Show loading indicator in UI

### Rate Limiting

- Uses existing Gemini API quota
- No additional rate limiting implemented
- Consider caching results for identical requests

### Cost Optimization

- Uses efficient token limits (1024 max output)
- Leverages existing retry/fallback logic
- Reuses single Gemini client instance

---

## Future Enhancements

### Potential Improvements

1. **Historical Analysis**
   - Integrate past quotation win/loss data
   - Learn from successful pricing patterns

2. **Market Intelligence**
   - Real-time competitor price tracking
   - Industry benchmark integration

3. **Multi-factor Optimization**
   - Payment terms consideration
   - Delivery timeline impact
   - Customer relationship value

4. **A/B Testing**
   - Compare AI recommendations vs manual pricing
   - Track win rate improvements

5. **Batch Analysis**
   - Analyze multiple products simultaneously
   - Portfolio-level pricing optimization

---

## Troubleshooting

### Common Issues

**Issue**: "Missing GEMINI_API_KEY env"
- **Solution**: Ensure `GEMINI_API_KEY` or `GOOGLE_GEMINI_API_KEY` is set in `.env.local`

**Issue**: "AI pricing analysis failed: Model timeout"
- **Solution**: Retry the request. Service has built-in retry logic.

**Issue**: "Invalid productType"
- **Solution**: Ensure `productType` is one of: `mbcb`, `signages`, `paint`

**Issue**: Low win probability despite competitive pricing
- **Solution**: Check if product specs justify premium. Review AI reasoning.

---

## Support

For issues or questions:

1. Check logs in console: `[AI Pricing]` prefix
2. Review existing Gemini setup in `utils/ai.ts`
3. Test endpoint with curl/Postman
4. Verify environment variables are set

---

## Changelog

### Version 1.0.0 (December 2024)

- Initial implementation
- Gemini AI integration
- RESTful API endpoint
- Request/response validation
- Comprehensive documentation

