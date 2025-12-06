# Pricing Analytics Dashboard - Implementation Summary

## ✅ Completed Implementation

Successfully created a pricing intelligence analytics dashboard that visualizes AI pricing insights and user decisions.

---

## 📊 Overview

The dashboard provides real-time analytics on:
- Competitor pricing comparisons
- AI win probability predictions
- User adoption of AI suggestions
- Historical pricing trends

**Access URL**: `/pricing-insights`

---

## 🗂️ Files Created

### 1. Backend API Endpoint

**File**: `app/api/pricing/insights/route.ts`

**Purpose**: Aggregates pricing data from quotation tables and calculates metrics

**Endpoint**: `GET /api/pricing/insights`

**Data Sources**:
- `quotes_mbcb` table (W-Beam, Thrie, Double W-Beam)
- `quotes_signages` table (Reflective Signages)

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "avgCompetitorDifference": -2.5,
    "avgWinProbability": 78.3,
    "aiAcceptedCount": 15,
    "aiOverrideCount": 8,
    "totalQuotesWithAI": 23,
    "totalQuotesWithCompetitor": 18,
    "pricingTrend": [
      {
        "index": 1,
        "quotedPrice": 150.50,
        "aiSuggestedPrice": 152.75,
        "competitorPrice": 155.00,
        "date": "Dec 1"
      },
      ...
    ]
  }
}
```

---

### 2. Frontend Dashboard Page

**File**: `app/pricing-insights/page.tsx`

**Purpose**: Displays pricing analytics in an interactive dashboard

**Features**:
- Real-time data fetching
- Responsive design
- Interactive charts
- Metric cards
- Refresh functionality

---

## 📈 Metrics Implemented

### Metric 1: Avg Competitor vs Quoted Price Difference %

**Calculation**:
```typescript
avgDifference = Σ((quotedPrice - competitorPrice) / competitorPrice * 100) / count
```

**Display**:
- **Card Color**: Blue gradient
- **Icon**: 💰
- **Format**: `+2.5%` or `-2.5%`
- **Helper Text**: "Avg vs N competitor quotes"

**Interpretation**:
- **Positive %**: Your prices are higher than competitors
- **Negative %**: Your prices are lower than competitors

---

### Metric 2: Avg Win Probability Suggested by AI

**Calculation**:
```typescript
avgWinProbability = Σ(aiWinProbability) / count
```

**Display**:
- **Card Color**: Green gradient
- **Icon**: 🎯
- **Format**: `78.3%`
- **Helper Text**: "From N AI suggestions"

**Interpretation**:
- Higher percentage indicates better pricing strategy
- Based on AI's analysis of market conditions

---

### Metric 3: Count of Times User Accepted AI Suggested Price

**Calculation**:
```typescript
aiAcceptedCount = COUNT(quotes WHERE ai_pricing_insights.appliedByUser === true)
```

**Display**:
- **Card Color**: Purple gradient
- **Icon**: ✅
- **Format**: `15`
- **Helper Text**: "X% acceptance rate"

**Interpretation**:
- Shows user trust in AI recommendations
- Higher count indicates AI is providing valuable suggestions

---

### Metric 4: Count of Times User Changed/Overrode AI Suggestion

**Calculation**:
```typescript
aiOverrideCount = COUNT(quotes WHERE ai_pricing_insights.overrideReason IS NOT NULL)
```

**Display**:
- **Card Color**: Orange gradient
- **Icon**: ⚠️
- **Format**: `8`
- **Helper Text**: "Times users changed AI price"

**Interpretation**:
- Shows when users disagreed with AI
- Override reasons can be analyzed for AI improvement

---

### Metric 5: Historical Pricing Trend (Last 20 Quotes)

**Visualization**: Line chart using Recharts

**Data Points**:
- **Quoted Price** (Blue line) - Final price user set
- **AI Suggested Price** (Green line) - What AI recommended
- **Competitor Price** (Orange line) - Market benchmark

**Features**:
- Interactive tooltips
- Legend
- Responsive design
- Date labels on X-axis
- Price (₹) labels on Y-axis

---

## 💻 API Query Logic

### Data Fetching

```typescript:11:57:app/api/pricing/insights/route.ts
    // ============================================
    // 1. Fetch data from all quotation tables
    // ============================================
    
    // Fetch MBCB quotes (W-Beam, Thrie, Double W-Beam)
    const { data: mbcbQuotes, error: mbcbError } = await supabase
      .from('quotes_mbcb')
      .select('total_cost_per_rm, competitor_price_per_unit, client_demand_price_per_unit, ai_suggested_price_per_unit, ai_win_probability, ai_pricing_insights, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (mbcbError) {
      console.error('[API /api/pricing/insights] Error fetching MBCB quotes:', mbcbError);
    }

    // Fetch Signages quotes
    const { data: signagesQuotes, error: signagesError } = await supabase
      .from('quotes_signages')
      .select('cost_per_piece, competitor_price_per_unit, client_demand_price_per_unit, ai_suggested_price_per_unit, ai_win_probability, ai_pricing_insights, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (signagesError) {
      console.error('[API /api/pricing/insights] Error fetching Signages quotes:', signagesError);
    }

    // Combine all quotes
    const allQuotes = [
      ...(mbcbQuotes || []).map(q => ({
        quotedPrice: q.total_cost_per_rm,
        competitorPrice: q.competitor_price_per_unit,
        clientDemand: q.client_demand_price_per_unit,
        aiSuggestedPrice: q.ai_suggested_price_per_unit,
        aiWinProbability: q.ai_win_probability,
        aiPricingInsights: q.ai_pricing_insights,
        createdAt: q.created_at,
      })),
      ...(signagesQuotes || []).map(q => ({
        quotedPrice: q.cost_per_piece,
        competitorPrice: q.competitor_price_per_unit,
        clientDemand: q.client_demand_price_per_unit,
        aiSuggestedPrice: q.ai_suggested_price_per_unit,
        aiWinProbability: q.ai_win_probability,
        aiPricingInsights: q.ai_pricing_insights,
        createdAt: q.created_at,
      })),
    ];
```

### Metric Calculations

```typescript:59:105:app/api/pricing/insights/route.ts
    // ============================================
    // 2. Calculate Metrics
    // ============================================

    // Metric 1: Avg competitor vs quoted price difference %
    const quotesWithCompetitor = allQuotes.filter(q => q.competitorPrice && q.quotedPrice);
    const avgCompetitorDifference = quotesWithCompetitor.length > 0
      ? quotesWithCompetitor.reduce((sum, q) => {
          const diff = ((q.quotedPrice! - q.competitorPrice!) / q.competitorPrice!) * 100;
          return sum + diff;
        }, 0) / quotesWithCompetitor.length
      : 0;

    // Metric 2: Avg win probability suggested by AI
    const quotesWithAI = allQuotes.filter(q => q.aiWinProbability !== null && q.aiWinProbability !== undefined);
    const avgWinProbability = quotesWithAI.length > 0
      ? quotesWithAI.reduce((sum, q) => sum + q.aiWinProbability!, 0) / quotesWithAI.length
      : 0;

    // Metric 3: Count of times user accepted AI suggested price
    const aiAcceptedCount = allQuotes.filter(q => {
      if (!q.aiPricingInsights) return false;
      const insights = typeof q.aiPricingInsights === 'string' 
        ? JSON.parse(q.aiPricingInsights) 
        : q.aiPricingInsights;
      return insights?.appliedByUser === true;
    }).length;

    // Metric 4: Count of times user changed/overrode AI suggestion
    const aiOverrideCount = allQuotes.filter(q => {
      if (!q.aiPricingInsights) return false;
      const insights = typeof q.aiPricingInsights === 'string' 
        ? JSON.parse(q.aiPricingInsights) 
        : q.aiPricingInsights;
      return insights?.overrideReason !== null && insights?.overrideReason !== undefined;
    }).length;

    // Metric 5: Historical pricing trend (last 20 quotes)
    const last20Quotes = allQuotes
      .filter(q => q.quotedPrice && q.createdAt)
      .slice(0, 20)
      .reverse(); // Oldest to newest

    const pricingTrend = last20Quotes.map((q, index) => ({
      index: index + 1,
      quotedPrice: q.quotedPrice,
      aiSuggestedPrice: q.aiSuggestedPrice,
      competitorPrice: q.competitorPrice,
      date: new Date(q.createdAt!).toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      }),
    }));
```

---

## 🎨 UI Card Rendering

### Metric Cards

```typescript:58:111:app/pricing-insights/page.tsx
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Competitor Price Difference */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-300">Competitor Price Diff</h3>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.avgCompetitorDifference > 0 ? '+' : ''}
              {metrics.avgCompetitorDifference}%
            </p>
            <p className="text-xs text-slate-400">
              Avg vs {metrics.totalQuotesWithCompetitor} competitor quotes
            </p>
          </div>

          {/* Card 2: Avg Win Probability */}
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-green-300">Avg Win Probability</h3>
              <span className="text-2xl">🎯</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.avgWinProbability}%
            </p>
            <p className="text-xs text-slate-400">
              From {metrics.totalQuotesWithAI} AI suggestions
            </p>
          </div>

          {/* Card 3: AI Accepted */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-purple-300">AI Accepted</h3>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.aiAcceptedCount}
            </p>
            <p className="text-xs text-slate-400">
              {aiAcceptanceRate}% acceptance rate
            </p>
          </div>

          {/* Card 4: AI Overridden */}
          <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-500/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-orange-300">AI Overridden</h3>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {metrics.aiOverrideCount}
            </p>
            <p className="text-xs text-slate-400">
              Times users changed AI price
            </p>
          </div>
        </div>
```

---

## 📊 Chart Display

### Recharts Line Chart

```typescript:114:166:app/pricing-insights/page.tsx
        {/* Pricing Trend Chart */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span>📈</span>
            <span>Historical Pricing Trend (Last 20 Quotes)</span>
          </h2>

          {metrics.pricingTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={metrics.pricingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any) => `₹${Number(value).toFixed(2)}`}
                />
                <Legend 
                  wrapperStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="quotedPrice" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Quoted Price"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="aiSuggestedPrice" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="AI Suggested"
                  dot={{ fill: '#10b981', r: 4 }}
                  connectNulls
                />
                <Line 
                  type="monotone" 
                  dataKey="competitorPrice" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Competitor Price"
                  dot={{ fill: '#f59e0b', r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
```

**Chart Features**:
- **3 Lines**: Quoted Price (Blue), AI Suggested (Green), Competitor (Orange)
- **Interactive Tooltips**: Shows exact values on hover
- **Legend**: Identifies each line
- **Responsive**: Adapts to screen size
- **Grid**: Helps read values
- **Null Handling**: `connectNulls` for missing data points

---

## 🎨 Visual Design

### Color Scheme

```
Background: Gradient from slate-900 → purple-900 → slate-900
Cards: Semi-transparent gradients with backdrop blur
Borders: Subtle colored borders matching card theme

Card Colors:
- Blue: Competitor metrics
- Green: Win probability
- Purple: AI acceptance
- Orange: AI overrides
```

### Typography

```
Header: 4xl bold white
Card Titles: sm semibold colored
Card Values: 4xl bold white
Helper Text: xs slate-400
```

### Layout

```
┌─────────────────────────────────────────────┐
│  📊 Pricing Intelligence Dashboard          │
│  AI-powered insights from your data         │
├─────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │ Card 1 │ │ Card 2 │ │ Card 3 │ │ Card 4 ││
│  └────────┘ └────────┘ └────────┘ └────────┘│
├─────────────────────────────────────────────┤
│  📈 Historical Pricing Trend                │
│  ┌─────────────────────────────────────────┐│
│  │                                         ││
│  │         [Line Chart]                    ││
│  │                                         ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│          [🔄 Refresh Data Button]           │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Access Dashboard**
   ```
   Navigate to: http://localhost:3000/pricing-insights
   ```

2. **Verify Loading State**
   - Should show spinning gear icon
   - Should show "Loading pricing insights..." message

3. **Verify Metrics Display**
   - All 4 cards should render
   - Values should be numbers
   - Helper text should show counts

4. **Verify Chart**
   - Chart should render with data
   - Hover tooltips should work
   - Legend should be visible
   - Lines should be colored correctly

5. **Test Refresh**
   - Click "🔄 Refresh Data" button
   - Should show loading state
   - Should update with latest data

6. **Test Error Handling**
   - Simulate API failure
   - Should show error message
   - Should show "Retry" button

---

## 📝 Dependencies

### Already Installed

✅ **Recharts** (`recharts@^2.15.4`)
- Used for line chart visualization
- No additional installation needed

### Components Used

- `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer` from Recharts

---

## 🚀 Future Enhancements

### Potential Additions

1. **Date Range Filter**
   - Allow users to select date range
   - Filter metrics by time period

2. **Export Functionality**
   - Export data to CSV/Excel
   - Download chart as image

3. **More Metrics**
   - Average quotation value
   - Conversion rate by product type
   - Regional pricing analysis

4. **Drill-Down Views**
   - Click metric to see detailed breakdown
   - View individual quotations

5. **Real-Time Updates**
   - WebSocket integration
   - Auto-refresh every N minutes

6. **Comparison Views**
   - Compare current month vs previous month
   - Year-over-year trends

---

## ✅ Summary

### What Was Built

✅ **Backend API** - Aggregates pricing data from multiple tables  
✅ **Metric Calculations** - 5 key metrics computed  
✅ **Frontend Dashboard** - Beautiful, responsive UI  
✅ **Metric Cards** - 4 cards with gradient styling  
✅ **Line Chart** - Interactive Recharts visualization  
✅ **Error Handling** - Graceful loading and error states  
✅ **Refresh Functionality** - Manual data refresh  

### Key Features

🎯 **Real-Time Data** - Fetches latest quotation data  
📊 **Visual Analytics** - Charts and cards for easy understanding  
🎨 **Beautiful Design** - Gradient backgrounds, modern UI  
📱 **Responsive** - Works on all screen sizes  
🔄 **Refreshable** - Update data on demand  

### Access

**URL**: `/pricing-insights`

**No Authentication Required** (uses existing auth from app)

---

**🎉 Pricing Intelligence Dashboard is ready for use!**

