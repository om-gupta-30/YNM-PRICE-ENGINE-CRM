# AI Pricing Fields Implementation

## Overview

This document describes the implementation of AI-powered pricing fields across all quotation tables in the YNM Safety Price Engine system.

## Tables Modified

The following tables have been extended with AI pricing fields:

1. **quotes_mbcb** - MBCB (Metal Beam Crash Barrier) quotations
2. **quotes_signages** - Signage quotations  
3. **quotes_paint** - Paint quotations

## New Fields Added

All three quote tables now include the following fields:

### 1. `competitor_price_per_unit`
- **Type:** `NUMERIC`
- **Nullable:** Yes
- **Description:** Stores the competitor's price per unit (per running metre for MBCB, per piece for signages/paint)
- **Usage:** Used for competitive analysis and pricing strategy

### 2. `client_demand_price_per_unit`
- **Type:** `NUMERIC`
- **Nullable:** Yes
- **Description:** Stores the client's requested/demanded price per unit
- **Usage:** Helps understand client expectations and budget constraints

### 3. `ai_suggested_price_per_unit`
- **Type:** `NUMERIC`
- **Nullable:** Yes
- **Description:** AI-generated optimal price per unit based on various factors
- **Usage:** Provides intelligent pricing recommendations to sales team

### 4. `ai_win_probability`
- **Type:** `NUMERIC`
- **Nullable:** Yes
- **Range:** 0-100
- **Description:** AI-calculated probability of winning the deal (as a percentage)
- **Usage:** Helps prioritize quotes and adjust pricing strategy

### 5. `ai_pricing_insights`
- **Type:** `JSONB`
- **Nullable:** Yes
- **Description:** Structured JSON data containing AI reasoning, metadata, and insights about the pricing decision
- **Usage:** Provides transparency into AI recommendations and stores additional context

#### Example `ai_pricing_insights` Structure:

```json
{
  "reasoning": "Based on historical data, this price point offers optimal balance between competitiveness and margin",
  "factors_considered": [
    "competitor_pricing",
    "client_history",
    "market_conditions",
    "product_type",
    "quantity"
  ],
  "confidence_score": 0.85,
  "alternative_scenarios": [
    {
      "price": 150,
      "win_probability": 75,
      "margin": "high"
    },
    {
      "price": 130,
      "win_probability": 90,
      "margin": "medium"
    }
  ],
  "recommendations": [
    "Consider offering volume discount for quantities > 1000",
    "Client has accepted similar pricing in past 3 months"
  ],
  "timestamp": "2025-12-05T10:30:00Z",
  "model_version": "v1.0"
}
```

## Migration File

**Location:** `/docs/ADD_AI_PRICING_FIELDS_TO_QUOTES.sql`

The migration script:
- Uses safe `IF NOT EXISTS` checks to prevent duplicate columns
- Adds all 5 fields to all 3 quote tables
- Includes helpful RAISE NOTICE messages for tracking
- Adds column comments for documentation
- Includes verification queries (commented out)

### Running the Migration

1. Open your Supabase SQL Editor
2. Copy the contents of `ADD_AI_PRICING_FIELDS_TO_QUOTES.sql`
3. Paste and execute the script
4. Verify the output messages show successful additions
5. Optionally uncomment and run the verification queries at the end

## TypeScript Types Updated

**Location:** `/lib/constants/types.ts`

The `Quote` interface has been updated to include all new AI pricing fields:

```typescript
export interface Quote {
  // ... existing fields ...
  
  // AI Pricing fields
  competitor_price_per_unit?: number | null;
  client_demand_price_per_unit?: number | null;
  ai_suggested_price_per_unit?: number | null;
  ai_win_probability?: number | null;
  ai_pricing_insights?: Record<string, any> | null;
  
  // ... rest of fields ...
}
```

## API Integration Points

When working with these fields in your API endpoints, consider:

### Saving Quotes

Update your quote save endpoints to accept and store these fields:

```typescript
// Example: app/api/quotes/route.ts
const {
  // ... existing fields ...
  competitor_price_per_unit,
  client_demand_price_per_unit,
  ai_suggested_price_per_unit,
  ai_win_probability,
  ai_pricing_insights,
} = body;
```

### Retrieving Quotes

These fields will automatically be included when fetching quotes:

```typescript
const { data: quotes } = await supabase
  .from(tableName)
  .select('*')
  .eq('id', quoteId);

// Access AI fields
console.log(quotes[0].ai_suggested_price_per_unit);
console.log(quotes[0].ai_win_probability);
console.log(quotes[0].ai_pricing_insights);
```

## Frontend Integration

### Displaying AI Insights

Consider creating UI components to display:

1. **Price Comparison Card**
   - Competitor price
   - Client demand
   - AI suggestion
   - Current quote price

2. **Win Probability Indicator**
   - Visual gauge/meter showing 0-100%
   - Color coding (green: high, yellow: medium, red: low)

3. **AI Insights Panel**
   - Expandable section showing reasoning
   - Key factors considered
   - Alternative scenarios
   - Recommendations

### Example UI Component Structure

```tsx
interface AIPricingInsightsProps {
  quote: Quote;
}

function AIPricingInsights({ quote }: AIPricingInsightsProps) {
  return (
    <div className="ai-pricing-panel">
      <div className="price-comparison">
        <PriceCard label="Competitor" value={quote.competitor_price_per_unit} />
        <PriceCard label="Client Demand" value={quote.client_demand_price_per_unit} />
        <PriceCard label="AI Suggested" value={quote.ai_suggested_price_per_unit} highlighted />
      </div>
      
      <WinProbabilityGauge probability={quote.ai_win_probability} />
      
      {quote.ai_pricing_insights && (
        <InsightsPanel insights={quote.ai_pricing_insights} />
      )}
    </div>
  );
}
```

## Best Practices

### 1. Data Validation

Always validate AI pricing fields before saving:

```typescript
// Validate win probability is 0-100
if (ai_win_probability !== null && (ai_win_probability < 0 || ai_win_probability > 100)) {
  throw new Error('Win probability must be between 0 and 100');
}

// Validate prices are positive
if (ai_suggested_price_per_unit !== null && ai_suggested_price_per_unit < 0) {
  throw new Error('Price cannot be negative');
}
```

### 2. Handling Null Values

All AI fields are nullable. Always check for null before using:

```typescript
const winProbability = quote.ai_win_probability ?? 0;
const insights = quote.ai_pricing_insights ?? {};
```

### 3. Versioning AI Insights

Include version information in `ai_pricing_insights`:

```json
{
  "model_version": "v1.0",
  "generated_at": "2025-12-05T10:30:00Z",
  ...
}
```

### 4. Audit Trail

Consider logging when AI suggestions are accepted/rejected:

```typescript
if (finalPrice === ai_suggested_price_per_unit) {
  // Log: AI suggestion accepted
} else {
  // Log: AI suggestion overridden
  // Track: original suggestion vs final price
}
```

## Future Enhancements

Potential additions to consider:

1. **AI Confidence Score** - Separate field for model confidence
2. **Historical Accuracy Tracking** - Track how often AI predictions were correct
3. **A/B Testing** - Compare outcomes with/without AI suggestions
4. **Feedback Loop** - Allow sales team to rate AI suggestions
5. **Real-time Updates** - Recalculate AI suggestions when market conditions change

## Testing

### Manual Testing Checklist

- [ ] Insert new quote with all AI fields populated
- [ ] Insert new quote with AI fields as NULL
- [ ] Update existing quote to add AI fields
- [ ] Query quotes and verify AI fields are returned
- [ ] Test with large JSONB objects in `ai_pricing_insights`
- [ ] Verify win probability accepts values 0-100
- [ ] Test negative prices (should be allowed but validated in app)

### SQL Test Queries

```sql
-- Test insert with AI fields
INSERT INTO quotes_mbcb (
  section, 
  state_id, 
  city_id, 
  sub_account_id,
  customer_name,
  date,
  competitor_price_per_unit,
  client_demand_price_per_unit,
  ai_suggested_price_per_unit,
  ai_win_probability,
  ai_pricing_insights
) VALUES (
  'W-Beam',
  1,
  1,
  1,
  'Test Customer',
  '2025-12-05',
  150.00,
  140.00,
  145.00,
  85.5,
  '{"reasoning": "Test insights", "confidence": 0.85}'::jsonb
);

-- Test query
SELECT 
  id,
  section,
  competitor_price_per_unit,
  client_demand_price_per_unit,
  ai_suggested_price_per_unit,
  ai_win_probability,
  ai_pricing_insights
FROM quotes_mbcb
WHERE id = [insert_id_here];
```

## Naming Consistency

All fields follow consistent naming across all three tables:
- ✅ `competitor_price_per_unit` (same in all tables)
- ✅ `client_demand_price_per_unit` (same in all tables)
- ✅ `ai_suggested_price_per_unit` (same in all tables)
- ✅ `ai_win_probability` (same in all tables)
- ✅ `ai_pricing_insights` (same in all tables)

This consistency makes it easier to:
- Write reusable code
- Query across multiple tables
- Maintain the codebase
- Train new developers

## Support and Questions

For questions or issues related to AI pricing fields:
1. Check this documentation
2. Review the migration script comments
3. Examine the TypeScript type definitions
4. Test with the provided SQL queries

## Changelog

### Version 1.0 (2025-12-05)
- Initial implementation
- Added 5 AI pricing fields to all 3 quote tables
- Updated TypeScript types
- Created migration script
- Documented usage and best practices

