# Quotation Outcome Tracking - Quick Reference

## 🚀 Quick Start

### 1. Run Database Migration
```sql
-- Execute in Supabase SQL Editor
-- File: docs/ADD_OUTCOME_TRACKING_FIELDS.sql
```

### 2. Import Component
```typescript
import QuotationOutcomePanel from '@/components/quotations/QuotationOutcomePanel';
```

### 3. Add to Page
```tsx
<QuotationOutcomePanel
  currentStatus="pending"
  currentNotes=""
  closedAt={null}
  onSave={handleSaveOutcome}
/>
```

### 4. Create Save Handler
```typescript
const handleSaveOutcome = async (status, notes) => {
  const response = await fetch('/api/quotes/outcome', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteId: 123,
      productType: 'mbcb',
      outcomeStatus: status,
      outcomeNotes: notes,
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save outcome');
  }
};
```

---

## 📊 Database Fields

| Field | Type | Description |
|-------|------|-------------|
| `outcome_status` | ENUM | 'pending', 'won', 'lost' |
| `outcome_notes` | TEXT | Optional notes |
| `closed_at` | TIMESTAMP | Auto-set on won/lost |

---

## 🎨 Component Props

```typescript
interface QuotationOutcomePanelProps {
  currentStatus?: 'pending' | 'won' | 'lost';
  currentNotes?: string | null;
  closedAt?: string | null;
  onSave: (status, notes) => Promise<void>;
  disabled?: boolean;
}
```

---

## 🔌 API Endpoints

### PATCH /api/quotes/outcome
**Update outcome status**

```json
{
  "quoteId": 123,
  "productType": "mbcb",
  "outcomeStatus": "won",
  "outcomeNotes": "Optional notes"
}
```

### GET /api/quotes/outcome
**Get current outcome**

```
?quoteId=123&productType=mbcb
```

---

## 📈 Analytics Queries

### Win Rate
```sql
SELECT 
  COUNT(CASE WHEN outcome_status = 'won' THEN 1 END) * 100.0 / 
  COUNT(*) as win_rate
FROM quotes_mbcb
WHERE outcome_status IN ('won', 'lost');
```

### Avg Profit on Won Quotes
```sql
SELECT AVG(final_total_cost)
FROM quotes_mbcb
WHERE outcome_status = 'won';
```

### AI Accuracy
```sql
SELECT 
  outcome_status,
  AVG(ABS(total_cost_per_rm - ai_suggested_price_per_unit))
FROM quotes_mbcb
WHERE ai_suggested_price_per_unit IS NOT NULL
GROUP BY outcome_status;
```

---

## ✅ Testing Checklist

- [ ] Database migration runs successfully
- [ ] Component renders without errors
- [ ] Can mark quotation as "Won"
- [ ] Can mark quotation as "Lost"
- [ ] Can revert to "Pending"
- [ ] Notes are saved correctly
- [ ] Closed date appears for won/lost
- [ ] Closed date clears for pending
- [ ] Success message appears
- [ ] Error handling works
- [ ] Data persists on page reload

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `docs/ADD_OUTCOME_TRACKING_FIELDS.sql` | Database migration |
| `lib/constants/types.ts` | TypeScript types |
| `components/quotations/QuotationOutcomePanel.tsx` | UI component |
| `app/api/quotes/outcome/route.ts` | API handlers |

---

## 🎯 Status Colors

| Status | Icon | Color |
|--------|------|-------|
| Pending | ⏳ | Yellow |
| Won | ✓ | Green |
| Lost | ✗ | Red |

---

## 💡 Common Use Cases

### Load Existing Outcome
```typescript
useEffect(() => {
  fetch(`/api/quotes/outcome?quoteId=${id}&productType=mbcb`)
    .then(res => res.json())
    .then(data => {
      setOutcomeStatus(data.data.outcome_status);
      setOutcomeNotes(data.data.outcome_notes);
      setClosedAt(data.data.closed_at);
    });
}, [id]);
```

### With Toast Notifications
```typescript
const handleSave = async (status, notes) => {
  try {
    await fetch('/api/quotes/outcome', {
      method: 'PATCH',
      body: JSON.stringify({ quoteId, productType, outcomeStatus: status, outcomeNotes: notes }),
    });
    setToast({ message: 'Saved!', type: 'success' });
  } catch (error) {
    setToast({ message: error.message, type: 'error' });
    throw error;
  }
};
```

---

**Status:** ✅ Ready to Use  
**Version:** 1.0.0  
**Last Updated:** December 5, 2024

