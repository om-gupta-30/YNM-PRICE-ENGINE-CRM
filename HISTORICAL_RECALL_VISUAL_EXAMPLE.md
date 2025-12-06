# Historical Pricing Recall - Visual Example

## 🖼️ What Users Will See

### Scenario: Creating a W-Beam Quote

---

## Step 1: User Enters Specifications

**User fills in the form:**
```
W-Beam Configuration:
├─ Thickness: 4mm
├─ Coating: 120 GSM
└─ [Calculate Weight] ✓

Post Configuration:
├─ Thickness: 4mm
├─ Length: 1800mm
├─ Coating: 120 GSM
└─ [Calculate Weight] ✓

Spacer Configuration:
├─ Thickness: 4mm
├─ Length: 300mm
├─ Coating: 120 GSM
└─ [Calculate Weight] ✓
```

**System Action:** 
- Detects complete specifications
- Automatically queries database in background
- Finds a matching quote from 2 weeks ago

---

## Step 2: Alert Appears

**Blue card appears above Market Pricing section:**

```
╔═════════════════════════════════════════════════════════════════════╗
║  🔍  Historical Pricing Found                                  ×    ║
║      Similar configuration detected                                 ║
╠═════════════════════════════════════════════════════════════════════╣
║                                                                     ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  Last time you priced this configuration at                 │  ║
║  │  ₹1,234.56/rm on Nov 21, 2024                              │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌────────────────────────────┐  ┌────────────────────────────┐  ║
║  │  AI Suggested (Last Time)  │  │  Win Probability           │  ║
║  │  ₹1,200.00                 │  │  75%                       │  ║
║  └────────────────────────────┘  └────────────────────────────┘  ║
║                                                                     ║
║  ┌──────────────────────────────────────┐  ┌──────────────────┐  ║
║  │  ✓ Apply Previous Price              │  │  Ignore          │  ║
║  └──────────────────────────────────────┘  └──────────────────┘  ║
║                                                                     ║
╚═════════════════════════════════════════════════════════════════════╝
```

**Visual Styling:**
- **Background:** Gradient blue (`from-blue-900/40 to-blue-800/40`)
- **Border:** 2px solid blue with 50% opacity
- **Shadow:** Soft glow effect
- **Animation:** Smooth fade-in (0.3s)

---

## Step 3: User Interaction

### Option A: User Clicks "Apply Previous Price"

**What Happens:**

1. **System calculates:**
   ```
   Historical Price: ₹1,234.56/rm
   Fixed Costs:
   ├─ Transportation: ₹50.00/rm
   ├─ Installation: ₹75.00/rm
   ├─ Pole Cost: ₹100.00/rm
   └─ Fabrication: ₹25.00/rm
   Total Fixed: ₹250.00/rm
   
   Target Material Cost: ₹1,234.56 - ₹250.00 = ₹984.56/rm
   
   Total Weight: 12.5 kg/rm
   Required Rate: ₹984.56 / 12.5 = ₹78.76/kg
   ```

2. **System updates:**
   ```
   Rate Per Kg: ₹78.76  ← Auto-filled
   
   Material Cost: ₹984.56/rm
   + Transportation: ₹50.00/rm
   + Installation: ₹75.00/rm
   + Pole Cost: ₹100.00/rm
   + Fabrication: ₹25.00/rm
   ────────────────────────────
   Total Cost: ₹1,234.56/rm  ← Matches historical price!
   ```

3. **User sees toast notification:**
   ```
   ┌─────────────────────────────────────────────┐
   │  ✓  Applied historical price of ₹1,234.56/rm │
   └─────────────────────────────────────────────┘
   ```

4. **Alert remains visible** (can be dismissed with × or "Ignore")

---

### Option B: User Clicks "Ignore"

**What Happens:**

1. **Alert disappears** (smooth fade-out)
2. **User continues** with manual pricing
3. **No changes** to form fields

---

### Option C: User Clicks "×" (Dismiss)

**What Happens:**

1. **Alert disappears** (smooth fade-out)
2. **Same as "Ignore"**

---

## Step 4: After Applying

**Form state after applying historical price:**

```
┌─────────────────────────────────────────────────────────────┐
│  Pricing Calculation                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Rate Per Kg: ₹78.76  ← Auto-calculated                   │
│                                                             │
│  Material Cost: ₹984.56/rm                                 │
│  + Transportation: ₹50.00/rm                               │
│  + Installation: ₹75.00/rm                                 │
│  + Pole Cost: ₹100.00/rm                                   │
│  + Fabrication: ₹25.00/rm                                  │
│  ─────────────────────────────────────                     │
│  Total Cost: ₹1,234.56/rm  ✓                              │
│                                                             │
│  Quantity: 1000 rm                                         │
│  ─────────────────────────────────────                     │
│  Final Total: ₹12,34,560.00                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**User can now:**
- Adjust the rate if needed
- Continue with quotation
- Save or generate PDF

---

## 🎨 Color Scheme

```css
/* Alert Card */
background: linear-gradient(to bottom right, 
            rgba(30, 58, 138, 0.4),    /* blue-900/40 */
            rgba(30, 64, 175, 0.4));   /* blue-800/40 */
border: 2px solid rgba(59, 130, 246, 0.5);  /* blue-500/50 */
box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);

/* Header */
title-color: #ffffff;                   /* white */
subtitle-color: #bfdbfe;                /* blue-200 */

/* Main Message Box */
background: rgba(255, 255, 255, 0.1);   /* white/10 */
text-color: #ffffff;                    /* white */
price-color: #93c5fd;                   /* blue-300 */

/* Info Cards */
background: rgba(255, 255, 255, 0.05);  /* white/5 */
label-color: #94a3b8;                   /* slate-400 */
value-color: #4ade80 (AI Price);        /* green-400 */
value-color: #facc15 (Win Prob);        /* yellow-400 */

/* Buttons */
apply-button: linear-gradient(to right,
              #2563eb,                  /* blue-600 */
              #1d4ed8);                 /* blue-700 */
ignore-button: #334155;                 /* slate-700 */
```

---

## 📱 Responsive Design

### Desktop View (> 768px)
```
┌─────────────────────────────────────────────────────────────┐
│  🔍  Historical Pricing Found                          ×    │
│      Similar configuration detected                         │
├─────────────────────────────────────────────────────────────┤
│  Last time you priced this configuration at                 │
│  ₹1,234.56/rm on Nov 21, 2024                              │
│                                                             │
│  [AI Suggested: ₹1,200.00]  [Win Probability: 75%]        │
│                                                             │
│  [✓ Apply Previous Price]  [Ignore]                       │
└─────────────────────────────────────────────────────────────┘
```

### Mobile View (< 768px)
```
┌─────────────────────────────────┐
│  🔍  Historical Pricing     ×   │
│      Found                      │
├─────────────────────────────────┤
│  Last time you priced this      │
│  configuration at               │
│  ₹1,234.56/rm                  │
│  on Nov 21, 2024               │
│                                 │
│  ┌───────────────────────────┐ │
│  │ AI Suggested              │ │
│  │ ₹1,200.00                │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Win Probability           │ │
│  │ 75%                       │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ ✓ Apply Previous Price    │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Ignore                    │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 🎬 Animation Sequence

### Alert Appearance (0.3s)
```
Frame 1 (0.0s):  opacity: 0, translateY: -10px
Frame 2 (0.15s): opacity: 0.5, translateY: -5px
Frame 3 (0.3s):  opacity: 1, translateY: 0px
```

### Button Hover Effect (0.2s)
```
Normal:  background: blue-600
Hover:   background: blue-700, scale: 1.02
```

### Alert Dismissal (0.2s)
```
Frame 1 (0.0s):  opacity: 1, height: auto
Frame 2 (0.1s):  opacity: 0.5, height: auto
Frame 3 (0.2s):  opacity: 0, height: 0
```

---

## 🔔 Toast Notification

**Success Toast (after applying):**
```
┌─────────────────────────────────────────────────────┐
│  ✓  Applied historical price of ₹1,234.56/rm        │
└─────────────────────────────────────────────────────┘
```

**Error Toast (if price too low):**
```
┌─────────────────────────────────────────────────────┐
│  ✗  Cannot apply historical price - it is lower     │
│     than fixed costs                                │
└─────────────────────────────────────────────────────┘
```

**Styling:**
- **Success:** Green background, white text, checkmark icon
- **Error:** Red background, white text, X icon
- **Duration:** 3 seconds
- **Position:** Top-right corner
- **Animation:** Slide in from right, fade out

---

## 🎯 User Flow Summary

```
1. User enters specs
        ↓
2. System finds match
        ↓
3. Alert appears
        ↓
4. User decides:
   ├─ Apply → Pricing auto-fills → Success toast → Continue
   └─ Ignore → Alert disappears → Manual pricing → Continue
```

---

## 💡 Key UX Principles

1. **Non-Intrusive:** Alert doesn't block the form or require immediate action
2. **Informative:** Shows all relevant historical data at a glance
3. **Flexible:** User can apply, ignore, or dismiss at any time
4. **Fast:** One-click application of historical pricing
5. **Transparent:** Clear display of what price was used and when
6. **Helpful:** Includes AI insights to aid decision-making
7. **Dismissible:** Easy to close if not needed

---

**Status:** ✅ Fully Implemented  
**Last Updated:** December 5, 2024

