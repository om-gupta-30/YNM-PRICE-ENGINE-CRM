# Gemini AI Usage Inventory

**Purpose:** Complete inventory of all Gemini AI usage in the project before AI architecture redesign.

**Date:** Generated automatically from codebase scan

---

## 1. Core Gemini Client & Wrapper

### **Gemini Client Initialization**
- **File:** `/utils/ai.ts`
- **Function:** `getGeminiClient()`
- **Purpose:** Core infrastructure - Singleton Gemini client initialization
- **Model:** Uses `GoogleGenerativeAI` from `@google/generative-ai` package
- **API Key:** `process.env.GEMINI_API_KEY` or `process.env.GOOGLE_GEMINI_API_KEY`
- **Output:** Client instance (not JSON/text)

---

## 2. Functions That Call Gemini

### **2.1 Main Gemini Functions**

#### **runGemini<T>()**
- **File:** `/utils/ai.ts` (line 114)
- **Function:** `runGemini<T>(systemPrompt: string, userPrompt: string): Promise<T>`
- **Purpose:** Primary Gemini function for JSON responses
- **Output Type:** JSON (expects structured JSON response)
- **Model:** `gemini-1.5-flash` (hardcoded)
- **Usage:** Used for coaching, insights, pricing analysis

#### **runGeminiFast<T>()**
- **File:** `/utils/ai.ts` (line 173)
- **Function:** `runGeminiFast<T>(systemPrompt: string, userPrompt: string): Promise<T>`
- **Purpose:** Fast/bulk operations, beautification
- **Output Type:** JSON (expects structured JSON response)
- **Model:** `gemini-1.5-flash` (hardcoded)
- **Usage:** Used for bulk scoring, query result formatting, slipping engagement detection

#### **calculateSubaccountAIInsights()**
- **File:** `/utils/ai.ts` (line 533)
- **Function:** `calculateSubaccountAIInsights(input): Promise<SubaccountAIInsights>`
- **Purpose:** Sub-account engagement scoring
- **Output Type:** JSON (structured: `{score, tips[], comment}`)
- **Model:** `gemini-1.5-flash` (via `runGeminiFast`)
- **Usage:** Bulk engagement score calculation for sub-accounts

#### **analyzePricingWithAI()**
- **File:** `/lib/services/aiPricingAnalysis.ts` (line 137)
- **Function:** `analyzePricingWithAI(input: PricingAnalysisInput): Promise<PricingAnalysisOutput>`
- **Purpose:** AI pricing analysis and recommendations
- **Output Type:** JSON (structured: `{recommendedPrice, winProbability, reasoning, suggestions[]}`)
- **Model:** `gemini-1.5-flash` (via `runGemini`)
- **Usage:** Pricing intelligence for quotations

---

## 3. API Routes That Depend on Gemini Calls

### **3.1 CRM Coach API**
- **File:** `/app/api/ai/coach/route.ts`
- **Endpoint:** `POST /api/ai/coach`
- **Purpose:** CRM AI Coach chat interface (dual mode: COACH and QUERY)
- **Gemini Calls:**
  - `runGemini()` (line 379) - For COACH mode responses
  - `runGeminiFast()` (line 202) - For QUERY mode result beautification (optional)
- **Output Type:** JSON (structured response with `reply`, `suggestedActions[]`, `tone`, `queryResult`)
- **Model:** `gemini-1.5-flash`
- **Notes:** 
  - COACH mode: Uses `runGemini` for personalized coaching
  - QUERY mode: Uses `runGeminiFast` to format database query results (optional beautification)

### **3.2 Pricing Analysis API**
- **File:** `/app/api/pricing/analyze/route.ts`
- **Endpoint:** `POST /api/pricing/analyze`
- **Purpose:** AI-powered pricing recommendations
- **Gemini Calls:** 
  - `analyzePricingWithAI()` → `runGemini()` (indirect, via service)
- **Output Type:** JSON (structured: `{recommendedPrice, winProbability, reasoning, suggestions[]}`)
- **Model:** `gemini-1.5-flash`
- **Notes:** Reuses existing Gemini client from `utils/ai.ts`

### **3.3 Sub-account Insights API**
- **File:** `/app/api/ai/subaccount-insights/route.ts`
- **Endpoint:** `GET /api/ai/subaccount-insights?subAccountId=X`
- **Purpose:** AI engagement scoring for sub-accounts
- **Gemini Calls:**
  - `runSubaccountAIScoring()` → `calculateSubaccountAIInsights()` → `runGeminiFast()` (indirect)
- **Output Type:** JSON (structured: `{score, tips[], comment}`)
- **Model:** `gemini-1.5-flash` (via `runGeminiFast`)

### **3.4 Admin Insights API**
- **File:** `/app/api/ai/admin-insights/route.ts`
- **Endpoint:** `GET /api/ai/admin-insights?employeeUsername=X`
- **Purpose:** Admin employee performance analysis
- **Gemini Calls:**
  - `runAdminAIScoring()` → `runGemini()` (indirect, via `lib/ai/engagement.ts`)
- **Output Type:** JSON (structured: `{summary, strengths[], weaknesses[], coachingAdvice[], suggestedFocusAccounts[]}`)
- **Model:** `gemini-1.5-flash`

### **3.5 Weekly Insights API**
- **File:** `/app/api/ai/weekly-insights/route.ts`
- **Endpoint:** `GET /api/ai/weekly-insights?employee=X`
- **Purpose:** Weekly performance insights for employees
- **Gemini Calls:**
  - `runGemini()` (line 202)
- **Output Type:** JSON (structured: `{summary, topOpportunity, improvementArea}`)
- **Model:** `gemini-1.5-flash`

### **3.6 Daily Coaching API**
- **File:** `/app/api/ai/daily-coaching/route.ts`
- **Endpoint:** `GET /api/ai/daily-coaching?employee=X`
- **Purpose:** Daily coaching tips for employees
- **Gemini Calls:**
  - `runGemini()` (line 154)
- **Output Type:** JSON (structured: `{motivation, strengths[], weaknesses[], recommendations[], priorityAccounts[]}`)
- **Model:** `gemini-1.5-flash`

### **3.7 Daily Coaching Cron Job**
- **File:** `/app/api/ai/run-daily-coaching/route.ts`
- **Endpoint:** `GET /api/ai/run-daily-coaching` (cron job)
- **Purpose:** Batch generate daily coaching for all employees
- **Gemini Calls:**
  - `generateCoachingForEmployee()` → `runGemini()` (line 200)
- **Output Type:** JSON (structured coaching object)
- **Model:** `gemini-1.5-flash`
- **Notes:** Runs as cron job, processes all employees

### **3.8 Auto-Monitor Cron Job**
- **File:** `/app/(system)/api/ai/run-auto-monitor/route.ts`
- **Endpoint:** `GET /api/ai/run-auto-monitor` (cron job, bypasses auth)
- **Purpose:** Automated engagement monitoring and alerts
- **Gemini Calls:**
  - `detectSlippingEngagementAndSuggestActions()` → `runGeminiFast()` (indirect, via `lib/ai/engagement.ts`)
- **Output Type:** JSON (structured: `{message, priority}` per sub-account)
- **Model:** `gemini-1.5-flash` (via `runGeminiFast`)
- **Notes:** Runs as cron job, checks all sub-accounts with low engagement

### **3.9 Daily Summary API (Placeholder)**
- **File:** `/app/api/ai/daily-summary/route.ts`
- **Endpoint:** `POST /api/ai/daily-summary`
- **Purpose:** Daily summary (v2 placeholder - not implemented)
- **Gemini Calls:** None (commented out, TODO for v2)
- **Output Type:** N/A
- **Model:** N/A
- **Notes:** Currently returns placeholder response

---

## 4. UI Components That Trigger Gemini

### **4.1 AI Chat Coach Component**
- **File:** `/components/AIChatCoach.tsx`
- **Component:** `AIChatCoach`
- **Purpose:** Main UI for AI CRM Coach chat interface
- **Triggers:** Calls `/api/ai/coach` endpoint (which uses Gemini)
- **User Action:** User types questions, clicks send
- **Gemini Usage:** Indirect (via API route)
- **Output Type:** JSON (displayed as formatted text + suggested actions)
- **Model:** `gemini-1.5-flash`

### **4.2 AI Pricing Hook**
- **File:** `/hooks/useAIPricing.ts`
- **Hook:** `useAIPricing()`
- **Purpose:** React hook for AI pricing analysis
- **Triggers:** Calls `/api/pricing/analyze` endpoint
- **User Action:** User clicks "Get AI Pricing" button in quotation forms
- **Gemini Usage:** Indirect (via API route)
- **Output Type:** JSON (structured pricing analysis)
- **Model:** `gemini-1.5-flash`

### **4.3 AI Pricing Modal**
- **File:** `/components/pricing/AIPricingModal.tsx` (referenced, not read)
- **Component:** `AIPricingModal`
- **Purpose:** Modal to display AI pricing recommendations
- **Triggers:** Uses `useAIPricing` hook
- **User Action:** User views AI pricing suggestions
- **Gemini Usage:** Indirect (via hook → API)
- **Output Type:** JSON (displayed in UI)
- **Model:** `gemini-1.5-flash`

### **4.4 Pricing Pages (W-Beam, Thrie, Double W-Beam, Signages)**
- **Files:** 
  - `/app/mbcb/w-beam/page.tsx`
  - `/app/mbcb/thrie/page.tsx`
  - `/app/mbcb/double-w-beam/page.tsx`
  - `/app/signages/reflective/page.tsx`
- **Components:** Page components
- **Purpose:** Quotation forms with AI pricing integration
- **Triggers:** User interacts with pricing fields, AI pricing button
- **Gemini Usage:** Indirect (via `useAIPricing` hook → API)
- **Output Type:** JSON (pricing recommendations)
- **Model:** `gemini-1.5-flash`

---

## 5. Helpers, Wrappers, and Middlewares

### **5.1 AI Router**
- **File:** `/lib/ai/router.ts`
- **Function:** `routeAIRequest(inputText: string): AIMode`
- **Purpose:** Determines whether query should use COACH or QUERY mode
- **Gemini Usage:** None (routing logic only, doesn't call Gemini)
- **Output Type:** String (`'COACH'` or `'QUERY'`)
- **Model:** N/A
- **Notes:** Helper for AI coach API, no direct Gemini calls

### **5.2 Query Engine**
- **File:** `/lib/ai/queryEngine.ts`
- **Function:** `executeCRMQuery(textQuery, userRole, userId): Promise<CRMQueryResult>`
- **Purpose:** Executes factual CRM database queries (Mode B: QUERY)
- **Gemini Usage:** None (database queries only, no AI)
- **Output Type:** Structured database results
- **Model:** N/A
- **Notes:** Used by AI coach API in QUERY mode, but doesn't call Gemini directly

### **5.3 Engagement Scoring Functions**
- **File:** `/lib/ai/engagement.ts`
- **Functions:**
  - `runSubaccountAIScoring()` (line 70) → calls `calculateSubaccountAIInsights()` → `runGeminiFast()`
  - `runAdminAIScoring()` (line 272) → calls `runGemini()` (line 332)
  - `detectSlippingEngagementAndSuggestActions()` (line 569) → calls `runGeminiFast()` (line 626)
- **Purpose:** Engagement score calculation and monitoring
- **Gemini Usage:** Direct (calls `runGemini` and `runGeminiFast`)
- **Output Type:** JSON (structured insights)
- **Model:** `gemini-1.5-flash` (both `runGemini` and `runGeminiFast`)

### **5.4 Pricing Analysis Service**
- **File:** `/lib/services/aiPricingAnalysis.ts`
- **Function:** `analyzePricingWithAI()`
- **Purpose:** Pricing intelligence service
- **Gemini Usage:** Direct (calls `runGemini()` at line 170)
- **Output Type:** JSON (structured pricing analysis)
- **Model:** `gemini-1.5-flash`

---

## 6. Summary Statistics

### **Total Gemini Usage Points:**
- **Core Functions:** 2 (`runGemini`, `runGeminiFast`)
- **API Routes:** 8 active + 1 placeholder
- **UI Components:** 4+ (chat coach, pricing hook, pricing modal, pricing pages)
- **Helper Services:** 3 (engagement scoring, pricing analysis, query engine - no direct Gemini)

### **Model Distribution:**
- **All calls use:** `gemini-1.5-flash` (hardcoded, no fallback)
- **No model fallback implemented**

### **Output Type Distribution:**
- **JSON Output:** 100% (all functions expect structured JSON)
- **Text Output:** 0% (no text-only responses)

### **Purpose Categories:**
1. **CRM Coach** - Sales coaching and advice (`/api/ai/coach`)
2. **Pricing AI** - Pricing recommendations (`/api/pricing/analyze`)
3. **Engagement Scoring** - Sub-account and employee performance (`/api/ai/subaccount-insights`, `/api/ai/admin-insights`)
4. **Insights** - Weekly and daily insights (`/api/ai/weekly-insights`, `/api/ai/daily-coaching`)
5. **Cron Jobs** - Automated monitoring (`/api/ai/run-daily-coaching`, `/api/ai/run-auto-monitor`)
6. **Beautification** - Optional query result formatting (via `runGeminiFast` in coach API)

---

## 7. Key Observations

### **Architecture:**
- ✅ Centralized client in `utils/ai.ts`
- ✅ All routes reuse same client
- ✅ Consistent JSON output pattern
- ⚠️ No model fallback mechanism
- ⚠️ Hardcoded to `gemini-1.5-flash` only

### **Dependencies:**
- Package: `@google/generative-ai` (version 0.21.0)
- Environment: `GEMINI_API_KEY` or `GOOGLE_GEMINI_API_KEY`

### **Error Handling:**
- Most functions have fallback responses if Gemini fails
- Some functions (like engagement scoring) have default values
- Cron jobs continue processing even if individual calls fail

---

## 8. Files Modified/Using Gemini

### **Direct Gemini Imports:**
- `utils/ai.ts` - Core client and functions
- `lib/services/aiPricingAnalysis.ts` - Pricing service
- `lib/ai/engagement.ts` - Engagement scoring
- `app/api/ai/coach/route.ts` - Coach API
- `app/api/ai/weekly-insights/route.ts` - Weekly insights
- `app/api/ai/daily-coaching/route.ts` - Daily coaching
- `app/api/ai/run-daily-coaching/route.ts` - Daily coaching cron

### **Indirect Usage (via API calls):**
- `components/AIChatCoach.tsx` - UI component
- `hooks/useAIPricing.ts` - React hook
- `app/mbcb/w-beam/page.tsx` - Pricing page
- `app/mbcb/thrie/page.tsx` - Pricing page
- `app/mbcb/double-w-beam/page.tsx` - Pricing page
- `app/signages/reflective/page.tsx` - Pricing page

---

**END OF INVENTORY**

