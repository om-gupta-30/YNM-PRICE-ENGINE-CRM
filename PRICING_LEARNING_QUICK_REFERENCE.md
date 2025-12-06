# Pricing Learning Feedback - Quick Reference

## 🚀 Quick Start

### 1. The System Works Automatically
No setup required! The learning engine automatically:
- Analyzes historical quote outcomes
- Calculates AI accuracy
- Injects insights into AI prompts
- Displays confidence levels

### 2. How It Works
```
User gets AI suggestion → AI includes learning context → 
User applies/overrides → Outcome tracked (won/lost) → 
Next AI suggestion is smarter
```

---

## 📊 Key Metrics

| Metric | Description | Example |
|--------|-------------|---------|
| **AI Accuracy** | Win rate when AI was followed | 78% |
| **Override Accuracy** | Win rate when AI was overridden | 65% |
| **Avg Success Delta** | Price difference (AI vs. winning) | -₹120 |
| **Confidence Level** | AI's self-assessed reliability | 78% (High) |

---

## 🎯 Learning Stats API

### Fetch Learning Statistics
```bash
GET /api/pricing/learning-stats?productType=mbcb&lookbackDays=90
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ai_accuracy": 78.5,
    "override_accuracy": 65.2,
    "avg_success_delta": -120,
    "total_quotes_analyzed": 45,
    "quotes_with_ai": 30,
    "quotes_without_ai": 15,
    "recent_win_factors": ["Competitive pricing", "Fast delivery"],
    "last_updated": "2024-12-05T10:30:00Z"
  }
}
```

---

## 💡 What Gets Injected into AI Prompts

**Example Learning Context:**
```
Based on recent history:
- When prices match AI suggestion, win rate was 78%.
- Deals typically close ₹120 below recommended price.
- Recent winning strategies:
  • Competitive pricing strategy
  • Fast delivery commitment
  • Volume discount for large orders
Use this to refine suggestion.
```

---

## 🎨 UI Changes

### AI Pricing Modal Now Shows:
```
┌─────────────────────────────────────────────────────────┐
│ ✓ AI Confidence Level              78% (High Confidence)│
│ Based on strong historical performance with similar deals│
└─────────────────────────────────────────────────────────┘
```

**Confidence Levels:**
- **75-100%:** Green badge, "High Confidence"
- **50-74%:** Yellow badge, "Moderate Confidence"
- **0-49%:** Orange badge, "Low Confidence"

---

## 🔧 For Developers

### Import Learning Engine
```typescript
import { 
  analyzePricingPerformance, 
  calculateConfidenceScore,
  formatLearningStatsForPrompt 
} from '@/lib/services/pricingLearningEngine';
```

### Calculate Stats
```typescript
const stats = await analyzePricingPerformance('mbcb', 90);
// Returns: { ai_accuracy, override_accuracy, avg_success_delta, ... }
```

### Format for AI Prompt
```typescript
const promptContext = formatLearningStatsForPrompt(stats);
// Returns: "Based on recent history:\n- When prices match AI..."
```

### Calculate Confidence
```typescript
const confidence = calculateConfidenceScore(stats);
// Returns: 0-100 based on accuracy and sample size
```

---

## 📈 Sample Size Requirements

| Quotes | Confidence | Behavior |
|--------|-----------|----------|
| < 5 | 50% (Low) | Minimal learning context |
| 5-19 | 40-75% (Moderate) | Blended with baseline |
| 20+ | 50-95% (High) | Full learning context |

---

## 🧪 Testing

### Test Learning Stats API
```bash
curl "http://localhost:3000/api/pricing/learning-stats?productType=mbcb"
```

### Test AI with Learning Context
1. Create 10+ quotes with outcomes
2. Request AI pricing suggestion
3. Check console: `[AI Pricing] Including learning context:`
4. Verify confidence level appears in modal

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/services/pricingLearningEngine.ts` | Learning engine |
| `app/api/pricing/learning-stats/route.ts` | API endpoint |
| `lib/services/aiPricingAnalysis.ts` | AI with learning |
| `components/pricing/AIPricingModal.tsx` | UI with confidence |

---

## ⚡ Quick Facts

- ✅ **Automatic:** No manual intervention needed
- ✅ **Self-Improving:** Gets better with every closed quote
- ✅ **Transparent:** Shows confidence based on real data
- ✅ **Graceful:** Works even with limited data
- ✅ **Fast:** Calculates on-the-fly (< 100ms)

---

## 🎯 Business Impact

**Before Learning:**
- AI suggestions based only on current context
- No historical pattern recognition
- Fixed confidence level

**After Learning:**
- AI learns from past wins/losses
- Adapts to successful pricing strategies
- Dynamic confidence based on performance

**Result:** Higher win rates, better pricing decisions, continuous improvement

---

**Status:** ✅ Fully Implemented  
**Version:** 1.0.0  
**Last Updated:** December 5, 2024

