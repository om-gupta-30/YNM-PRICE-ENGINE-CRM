# Historical Pricing Recall - Quick Reference

## 🎯 What It Does

When users enter product specifications that match a previous quote, the system automatically shows:

> **"Last time you priced this configuration at ₹{pricePerUnit} on {date}."**

## 📍 Where to Find It

The feature is integrated into:
- ✅ W-Beam quotation form
- ✅ Thrie Beam quotation form  
- ✅ Double W-Beam quotation form
- ✅ Reflective Signages quotation form

The alert appears **above** the "Market Pricing (Optional)" section.

## 🔧 How to Use

### As a User:

1. **Enter product specifications** (thickness, coating, dimensions, etc.)
2. **Wait for the blue alert** to appear (if a match exists)
3. **Choose an option:**
   - Click **"Apply Previous Price"** → System auto-fills the pricing
   - Click **"Ignore"** → Alert disappears, continue manually

### As a Developer:

**Backend Lookup Function:**
```typescript
import { lookupHistoricalMBCBQuote, lookupHistoricalSignagesQuote } from '@/lib/services/historicalQuoteLookup';

// For MBCB products
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

// For Signages
const match = await lookupHistoricalSignagesQuote({
  shape: 'Circular',
  boardType: 'Acrylic',
  reflectivityType: 'Type III',
  diameter: 600,
});
```

**UI Component:**
```tsx
import HistoricalPricingAlert from '@/components/pricing/HistoricalPricingAlert';

{historicalMatch && (
  <HistoricalPricingAlert
    match={historicalMatch}
    priceUnit="₹/rm"
    onApply={handleApplyHistoricalPrice}
    onDismiss={handleDismissHistoricalMatch}
  />
)}
```

## 🔍 Matching Logic

### MBCB Products
Matches on:
- W-Beam/Thrie Beam: `thickness` + `coating`
- Post: `thickness` + `length` + `coating`
- Spacer: `thickness` + `length` + `coating`

Only included components are matched.

### Signages
Matches on:
- `shape` (Circular, Rectangular, Triangle, Octagonal)
- `boardType` (e.g., Acrylic, Aluminum)
- `reflectivityType` (e.g., Type III, Type IV)
- Dimensions (varies by shape: diameter, width×height, etc.)

## 📊 Return Data

```typescript
{
  pricePerUnit: 1234.56,           // Previous price
  aiSuggestedPrice: 1200.00,       // AI suggestion (if available)
  aiWinProbability: 75,            // Win % (if available)
  createdAt: Date                  // When it was quoted
}
```

## 🎨 UI Preview

```
┌─────────────────────────────────────────────────────────────┐
│  🔍  Historical Pricing Found                           ×   │
│      Similar configuration detected                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Last time you priced this configuration at ₹1,234.56/rm   │
│  on Dec 5, 2024                                            │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐       │
│  │ AI Suggested         │  │ Win Probability      │       │
│  │ ₹1,200.00           │  │ 75%                  │       │
│  └──────────────────────┘  └──────────────────────┘       │
│                                                             │
│  [✓ Apply Previous Price]  [Ignore]                       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 API Endpoint

**Endpoint:** `POST /api/quotes/historical-lookup`

**Request:**
```json
{
  "productType": "mbcb",
  "specs": {
    "wBeamThickness": 4,
    "wBeamCoating": 120,
    "includeWBeam": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pricePerUnit": 1234.56,
    "aiSuggestedPrice": 1200.00,
    "aiWinProbability": 75,
    "createdAt": "2024-12-05T10:30:00Z"
  }
}
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `lib/services/historicalQuoteLookup.ts` | Backend lookup logic |
| `app/api/quotes/historical-lookup/route.ts` | API endpoint |
| `components/pricing/HistoricalPricingAlert.tsx` | UI component |
| `app/mbcb/w-beam/page.tsx` | W-Beam integration |
| `app/mbcb/thrie/page.tsx` | Thrie Beam integration |
| `app/mbcb/double-w-beam/page.tsx` | Double W-Beam integration |
| `app/signages/reflective/page.tsx` | Signages integration |

## ✅ Testing Checklist

- [ ] Enter specs that match a previous quote → Alert appears
- [ ] Click "Apply Previous Price" → Pricing updates correctly
- [ ] Click "Ignore" → Alert disappears
- [ ] Enter unique specs → No alert appears
- [ ] Dismiss alert and re-enter same specs → Alert reappears
- [ ] Test with incomplete specs → No premature lookup

## 🎉 Benefits

✅ **Consistency** - Maintain uniform pricing  
✅ **Speed** - Quick recall of previous decisions  
✅ **Intelligence** - Shows AI insights from past quotes  
✅ **Flexibility** - User can accept or reject  
✅ **Transparency** - Clear historical context

---

**Status:** ✅ Fully Implemented  
**Last Updated:** December 5, 2024

