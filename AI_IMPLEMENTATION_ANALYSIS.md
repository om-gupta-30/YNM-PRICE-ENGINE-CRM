# AI Implementation Analysis - Complete System Audit

**Generated:** December 2024  
**Scope:** Full codebase analysis of all AI components, architecture, and gaps

---

## Executive Summary

This project implements AI functionality using **Google Gemini** (gemini-1.5-flash) for multiple purposes:
- **CRM Coach AI**: Sales coaching and performance insights
- **CRM Query Engine**: Factual database lookups and data retrieval
- **Pricing AI**: Intelligent pricing recommendations
- **Engagement Scoring AI**: Automated account/sub-account engagement analysis
- **Cron-based AI**: Automated daily coaching, insights, and monitoring

**Current Model:** `gemini-1.5-flash` (primary), `gemini-1.5-pro` (documented but not implemented as fallback)

---

## 1. IDENTIFIED AI COMPONENTS

### 1.1 Pricing AI
**Location:** `lib/services/aiPricingAnalysis.ts`, `app/api/pricing/analyze/route.ts`, `hooks/useAIPricing.ts`

**Purpose:** Analyzes pricing context (our price, competitor price, client demand) and recommends optimal pricing strategies with win probability.

**What triggers it?**
- User clicks "Analyze Pricing" button in quotation forms
- Manual API call to `/api/pricing/analyze`
- Quotation save operations (stores AI suggestions in DB fields: `ai_suggested_price_per_unit`, `ai_win_probability`, `ai_pricing_insights`)

**Which model does it call?**
- Model: `gemini-1.5-flash` via `runGemini<T>()`
- No fallback model implemented (hardcoded to gemini-1.5-flash)

**What prompt format does it use?**
- **System Prompt:** Pricing strategist role definition with JSON output requirements
- **User Prompt:** Structured context including:
  - Product type (MBCB/Signages/Paint)
  - Our price, competitor price, client demand price
  - Quantity and product specs
  - Optional historical learning context (from `pricingLearningEngine.ts`)
- **Format:** System + User → JSON response parsing

**How does it use database context?**
- ✅ Fetches historical pricing performance data (via `analyzePricingPerformance()`)
- ✅ Includes learning context in prompts (success rates, win/loss patterns)
- ✅ Stores AI recommendations back to quotation tables (`quotes_mbcb`, `quotes_signages`, `quotes_paint`)
- ❌ NO live sync - historical data is fetched per-request (not real-time)

**How does it parse or display answers?**
- Parses JSON response: `{ recommendedPrice, winProbability, reasoning, suggestions }`
- Uses `parseJsonSafely<T>()` with multiple fallback strategies (direct parse, markdown extraction, regex)
- Displays in UI via `useAIPricing` hook with loading/error states
- Formats output with `formatPricingAnalysis()` helper

**Does it have fallback behavior?**
- ✅ Yes: Falls back to current price if AI fails
- ✅ Yes: Default win probability = 50% if parsing fails
- ✅ Yes: Generic suggestions if AI response invalid
- ❌ NO model fallback (doesn't try gemini-1.5-pro if flash fails)

**Is it synchronous or async?**
- **Async** (all API calls are async/await)
- Blocking UI during analysis (loading state shown)

---

### 1.2 CRM Coach AI
**Location:** `app/api/ai/coach/route.ts`, `components/AIChatCoach.tsx`

**Purpose:** Provides sales coaching advice, performance insights, and strategic guidance based on CRM data.

**What triggers it?**
- User opens AI Chat Coach sidebar (`AIChatCoach.tsx` component)
- User sends message in chat interface
- User can toggle between "Sales Coach" mode and "CRM Assistant" mode
- API endpoint: `POST /api/ai/coach`

**Which model does it call?**
- Model: `gemini-1.5-flash` via `runGemini<T>()` for coaching
- Model: `gemini-1.5-flash` via `runGeminiFast<T>()` for query result beautification
- No fallback model implemented

**What prompt format does it use?**
- **System Prompt:** 
  - Role: "AI Sales Coach for YSM Safety CRM"
  - Domain restrictions (only CRM/sales topics)
  - Tone selection rules (encouraging/strategic/warning)
  - JSON output format requirements
- **User Prompt:**
  - Employee/Admin performance metrics
  - Slipping accounts data
  - Activity breakdowns
  - User's question
- **Format:** System + User → JSON: `{ reply, suggestedActions, tone }`

**How does it use database context?**
- ✅ Fetches real-time employee metrics (`getEmployeeMetrics()`)
- ✅ Fetches slipping accounts (`getSlippingAccounts()`)
- ✅ Fetches employee rankings (`getEmployeeRanking()`)
- ✅ Fetches admin insights summary (`getAdminInsightsSummary()`)
- ✅ Logs queries to `ai_queries` table (async, non-blocking)
- ❌ NO persistent memory/conversation history
- ❌ NO embeddings or semantic search
- ❌ Context fetched fresh each request (not cached)

**How does it parse or display answers?**
- Parses JSON response with `parseJsonSafely<T>()`
- Displays in chat UI with tone-based styling (encouraging=green, warning=orange, strategic=blue)
- Shows suggested actions as bullet points
- Falls back to contextual hardcoded responses if AI fails

**Does it have fallback behavior?**
- ✅ Yes: Domain restriction fallback (returns generic message for off-topic questions)
- ✅ Yes: Hardcoded contextual fallback responses if Gemini fails
- ✅ Yes: Validation/sanitization of AI responses
- ❌ NO model fallback

**Is it synchronous or async?**
- **Async** (API route with async/await)
- UI shows loading state during processing

---

### 1.3 Query Engine (CRM Assistant Mode)
**Location:** `lib/ai/queryEngine.ts`, integrated into `app/api/ai/coach/route.ts`

**Purpose:** Handles factual CRM database queries (contacts, accounts, sub-accounts, follow-ups, quotations, leads, activities, metrics).

**What triggers it?**
- User selects "CRM Assistant" mode in AI Chat Coach
- Automatic mode detection via `routeAIRequest()` when user asks data questions
- Pattern matching (e.g., "how many contacts", "list accounts", "show follow-ups")

**Which model does it call?**
- **NO direct AI model calls for query execution** (pure database queries)
- ⚠️ **Optional Gemini beautification**: After query results, may call `runGeminiFast()` to format response text (but never fabricates data)

**What prompt format does it use?**
- **Query Parsing:** Regex patterns and keyword matching (NO AI)
- **Intent Detection:** Pattern-based entity/operation detection
- **Beautification Prompt (optional):**
  - System: "CRM assistant that formats database query results"
  - User: Query result JSON + user question
  - **Critical rule:** Never fabricate facts

**How does it use database context?**
- ✅ Direct Supabase queries (no AI involved in query construction)
- ✅ Role-based filtering (employee vs admin)
- ✅ Supports filters: subaccount name, account name, date ranges, status
- ✅ Joins multiple tables (contacts → sub_accounts → accounts)
- ❌ NO semantic search (only exact/ILIKE pattern matching)
- ❌ NO AI-powered query understanding (pure regex/patterns)

**How does it parse or display answers?**
- Returns structured `CRMQueryResult` objects
- Formats results as text (e.g., "Found 5 contacts")
- Displays tables/cards in UI for different entity types
- Optional AI beautification for natural language formatting

**Does it have fallback behavior?**
- ✅ Yes: Returns empty results gracefully
- ✅ Yes: Provides helpful error messages
- ✅ Yes: Suggests alternative queries if no matches
- ✅ Yes: Falls back to raw formatted text if beautification fails

**Is it synchronous or async?**
- **Async** (all database queries are async)
- Query execution is fast (direct DB queries)

---

### 1.4 Mode Router (AI Request Router)
**Location:** `lib/ai/router.ts`

**Purpose:** Determines whether a user query should use COACH mode (AI reasoning) or QUERY mode (database lookup).

**What triggers it?**
- Called automatically in `/api/ai/coach` endpoint
- Can be overridden by user-selected mode toggle

**Which model does it call?**
- **NO AI MODEL** - Pure pattern matching and keyword detection

**What prompt format does it use?**
- **Regex patterns** for QUERY mode indicators (e.g., `/how many contacts/i`)
- **Regex patterns** for COACH mode indicators (e.g., `/how can I improve/i`)
- **Keyword lists** for strong indicators

**How does it use database context?**
- ❌ NO database access (pure text analysis)

**How does it parse or display answers?**
- Returns `AIMode` enum: `'COACH' | 'QUERY'`
- Logs decision reason to console

**Does it have fallback behavior?**
- ✅ Yes: Defaults to COACH mode for ambiguous queries
- ✅ Yes: Entity keyword detection as fallback

**Is it synchronous or async?**
- **Synchronous** (instant pattern matching)

---

### 1.5 Engagement Scoring AI
**Location:** `lib/ai/engagement.ts`, `utils/ai.ts` (calculateSubaccountAIInsights)

**Purpose:** Calculates AI-powered engagement scores (0-100) for sub-accounts based on activities and context.

**What triggers it?**
- Manual call to `runSubaccountAIScoring(subAccountId)`
- Cron job or scheduled refresh (if implemented)
- Sub-account activity updates

**Which model does it call?**
- Model: `gemini-1.5-flash` via `runGeminiFast<T>()` (for bulk operations)
- Used for: Sub-account engagement scoring, admin insights

**What prompt format does it use?**
- **System Prompt:** "You are a CRM engagement analyst"
- **User Prompt:**
  - Sub-account name, parent account, assigned employee
  - Current engagement score
  - Recent activities with age (days ago)
- **Format:** JSON: `{ score: 0-100, tips: string[], comment: string }`

**How does it use database context?**
- ✅ Fetches sub-account data from `sub_accounts` table
- ✅ Fetches parent account from `accounts` table
- ✅ Fetches recent activities from `activities` table (filtered by account_id)
- ✅ Updates `engagement_score` in database after calculation
- ❌ NO historical trend analysis
- ❌ NO cross-account pattern learning

**How does it parse or display answers?**
- Parses JSON response with validation
- Updates database `engagement_score` field
- Returns structured `SubaccountAIInsights` object
- Falls back to current score if AI fails

**Does it have fallback behavior?**
- ✅ Yes: Default fallback values (current score, generic tips)
- ✅ Yes: Error handling with graceful degradation
- ✅ Yes: Score clamped to 0-100 range
- ❌ NO model fallback

**Is it synchronous or async?**
- **Async** (database queries + AI call)

---

### 1.6 Daily Coaching AI (Cron-based)
**Location:** `app/api/ai/daily-coaching/route.ts`, `app/api/ai/run-daily-coaching/route.ts`, `app/api/cron/daily-tasks/route.ts`

**Purpose:** Generates automated daily coaching insights and tips for employees.

**What triggers it?**
- Cron job: `/api/ai/run-daily-coaching` (scheduled)
- Manual API call: `/api/ai/daily-coaching`
- Daily task cron: `/api/cron/daily-tasks`

**Which model does it call?**
- Model: `gemini-1.5-flash` via `runGemini<T>()`
- Generates: `CoachingInsights` with tips and recommendations

**What prompt format does it use?**
- **System Prompt:** Sales coach role with performance analysis guidelines
- **User Prompt:**
  - Employee metrics (activities, accounts, leads, quotations)
  - Performance trends
  - Slipping accounts
- **Format:** JSON: `{ insights: string, tips: string[], focusAreas: string[] }`

**How does it use database context?**
- ✅ Fetches employee metrics from database
- ✅ Fetches activity history
- ✅ Stores generated insights (likely in notifications or separate table)
- ❌ NO persistent learning from past coaching

**How does it parse or display answers?**
- Parses JSON response
- Stores in database (notifications/coaching table)
- Delivered via notification system

**Does it have fallback behavior?**
- ✅ Yes: Generic coaching messages if AI fails
- ❌ NO model fallback

**Is it synchronous or async?**
- **Async** (cron jobs run async)

---

### 1.7 Weekly Insights AI
**Location:** `app/api/ai/weekly-insights/route.ts`

**Purpose:** Generates weekly performance insights and summaries.

**What triggers it?**
- Manual API call (no automatic cron found)

**Which model does it call?**
- Model: `gemini-1.5-flash` via `runGemini<T>()`

**What prompt format does it use?**
- Similar to daily coaching but with weekly time window
- JSON output: `WeeklyInsights` type

**How does it use database context?**
- ✅ Fetches weekly metrics
- ✅ Activity summaries

**Is it synchronous or async?**
- **Async**

---

### 1.8 Admin Insights AI
**Location:** `app/api/ai/admin-insights/route.ts`

**Purpose:** Provides company-wide insights for admin users.

**What triggers it?**
- Admin dashboard or manual API call

**Which model does it call?**
- Model: `gemini-1.5-flash` via `runGemini<T>()` (used in `lib/ai/engagement.ts`)

**What prompt format does it use?**
- Admin-level context (all employees, all accounts)
- JSON output with company-wide metrics

**Is it synchronous or async?**
- **Async**

---

### 1.9 Gemini Client Wrapper (Core Infrastructure)
**Location:** `utils/ai.ts`

**Purpose:** Centralized Gemini AI client initialization and helper functions.

**What triggers it?**
- Imported by all AI components
- Singleton pattern (single client instance)

**Which model does it call?**
- **Client Initialization:** `GoogleGenerativeAI` from `@google/generative-ai`
- **API Key:** `process.env.GEMINI_API_KEY` or `process.env.GOOGLE_GEMINI_API_KEY`
- **Default Model:** `gemini-1.5-flash` (hardcoded)
- **Fast Model:** `gemini-1.5-flash` (same as default)

**What prompt format does it use?**
- **Function:** `runGemini<T>(systemPrompt, userPrompt)`
- **Function:** `runGeminiFast<T>(systemPrompt, userPrompt)`
- **Format:** Combined system + user prompt sent as single user message
- **Note:** Gemini SDK uses `contents` array with role 'user' (system prompt is concatenated, not separate role)

**How does it use database context?**
- ❌ NO database access (pure AI wrapper)
- ✅ Provides helper functions for fetching CRM data (`getEmployeeMetrics`, etc.)

**How does it parse or display answers?**
- **Response Parsing:**
  1. Extracts text via `result.response.text()`
  2. Attempts direct JSON parse
  3. Falls back to markdown code block extraction
  4. Falls back to regex pattern matching
  5. Throws error if all fail
- **Error Handling:** Logs errors, throws with context

**Does it have fallback behavior?**
- ✅ Yes: Multiple JSON parsing strategies
- ❌ NO model fallback (doesn't try gemini-1.5-pro if flash fails)
- ❌ NO retry logic (fails immediately on error)
- ⚠️ **Model Not Found Error Detection:** Has `isModelNotFoundError()` function but it's not used in retry logic

**Is it synchronous or async?**
- **Async** (all functions are async/await)

---

### 1.10 Sub-account Insights AI
**Location:** `app/api/ai/subaccount-insights/route.ts`

**Purpose:** Generates AI insights for specific sub-accounts.

**What triggers it?**
- Manual API call with sub-account ID

**Which model does it call?**
- Uses engagement scoring AI (`calculateSubaccountAIInsights`)

**Is it synchronous or async?**
- **Async**

---

### 1.11 Auto-Monitor AI (Cron)
**Location:** `app/(system)/api/ai/run-auto-monitor/route.ts`

**Purpose:** Automated monitoring and insights generation (system route, bypasses auth).

**What triggers it?**
- Cron job (external scheduler)

**Which model does it call?**
- Likely uses similar patterns to other cron AI endpoints

**Is it synchronous or async?**
- **Async**

---

### 1.12 Prompt Builders
**Location:** Embedded in each AI service file

**Purpose:** Constructs structured prompts for Gemini.

**Pattern:**
- `buildSystemPrompt()` functions define role and rules
- `buildUserPrompt()` functions construct context + question
- Prompts are string concatenations (not structured objects)

**No centralized prompt management** - each service builds its own.

---

### 1.13 Response Parsing Layer
**Location:** `utils/ai.ts` - `parseJsonSafely<T>()`

**Purpose:** Robust JSON parsing with multiple fallback strategies.

**Strategies:**
1. Direct `JSON.parse()`
2. Markdown code block extraction (` ```json ... ``` `)
3. Regex pattern matching for JSON objects `{...}`
4. Regex pattern matching for JSON arrays `[...]`

**Used by:** All AI components that expect JSON responses.

---

## 2. ARCHITECTURE MAP

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│              (Chat, Pricing Form, Cron Job)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MODE SELECTOR                               │
│                   (lib/ai/router.ts)                             │
│                                                                   │
│  Pattern Matching → 'COACH' | 'QUERY'                            │
│  User Override    → 'coach' | 'assistant'                        │
└────────────┬───────────────────────────────┬─────────────────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐            ┌──────────────────┐
    │   COACH MODE    │            │   QUERY MODE     │
    │                 │            │                  │
    │  ┌───────────┐  │            │  ┌────────────┐ │
    │  │ Coach AI  │  │            │  │ Query      │ │
    │  │ Engine    │  │            │  │ Engine     │ │
    │  │           │  │            │  │            │ │
    │  │ • Fetch   │  │            │  │ • Pattern  │ │
    │  │   Metrics │  │            │  │   Match    │ │
    │  │ • Build   │  │            │  │ • Execute  │ │
    │  │   Prompt  │  │            │  │   DB Query │ │
    │  └─────┬─────┘  │            │  └──────┬─────┘ │
    │        │        │            │         │       │
    │        ▼        │            │         ▼       │
    │  ┌───────────┐  │            │  ┌────────────┐ │
    │  │  Gemini   │  │            │  │ Supabase   │ │
    │  │  (Flash)  │  │            │  │  Database  │ │
    │  └─────┬─────┘  │            │  └──────┬─────┘ │
    │        │        │            │         │       │
    │        ▼        │            │         │       │
    │  Parse JSON     │            │  Format Results│
    │  Validate       │            │  (Optional AI  │
    │  Sanitize       │            │   Beautify)    │
    └────────┬────────┘            └────────┬───────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
                  ┌──────────────────┐
                  │  Response Layer  │
                  │                  │
                  │  • Chat UI       │
                  │  • Pricing UI    │
                  │  • Notifications │
                  └──────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PRICING AI (Separate Flow)                    │
│                                                                   │
│  Pricing Form → useAIPricing Hook                                │
│                     │                                             │
│                     ▼                                             │
│              /api/pricing/analyze                                │
│                     │                                             │
│                     ▼                                             │
│        lib/services/aiPricingAnalysis.ts                         │
│                     │                                             │
│         • Fetch Historical Data (pricingLearningEngine)          │
│         • Build Prompt                                           │
│                     │                                             │
│                     ▼                                             │
│              Gemini (Flash)                                       │
│                     │                                             │
│                     ▼                                             │
│         Parse & Store in DB (quotes_*)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  GEMINI CLIENT (Singleton)                       │
│                    (utils/ai.ts)                                 │
│                                                                   │
│  getGeminiClient() → GoogleGenerativeAI(apiKey)                  │
│                     │                                             │
│                     ├──→ runGemini<T>()                          │
│                     │      Model: gemini-1.5-flash               │
│                     │      Parse: parseJsonSafely<T>()           │
│                     │                                             │
│                     └──→ runGeminiFast<T>()                      │
│                            Model: gemini-1.5-flash               │
│                            Parse: parseJsonSafely<T>()           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. PROBLEMS / GAPS IDENTIFIED

### 3.1 Model Calls Failing
- ⚠️ **Hardcoded Model:** All calls use `gemini-1.5-flash` (no fallback to `gemini-1.5-pro`)
- ⚠️ **No Retry Logic:** If API call fails, it throws immediately (no exponential backoff)
- ⚠️ **No Model Version Handling:** Code references `gemini-2.5-pro` in documentation but uses `gemini-1.5-flash` in code
- ⚠️ **API Key Issues:** Only checks env vars, doesn't validate key before use

### 3.2 No Global Context or Memory Layer
- ❌ **No Conversation Memory:** Each chat message is independent (no conversation history sent to AI)
- ❌ **No User Context Cache:** Fetches employee metrics fresh every request (not cached)
- ❌ **No Cross-Session Learning:** AI doesn't learn from past interactions
- ❌ **No Context Window Management:** Could hit token limits with large datasets

### 3.3 No Embeddings or Semantic Retrieval
- ❌ **No Vector Database:** No embeddings stored for semantic search
- ❌ **No Semantic Search:** Query engine only uses regex/pattern matching (not semantic understanding)
- ❌ **No RAG (Retrieval Augmented Generation):** AI doesn't retrieve relevant documents/context before answering
- ❌ **No Knowledge Base:** No stored embeddings of CRM data for context retrieval

### 3.4 No Live Sync with Database
- ⚠️ **Polling-based:** Data fetched on-demand per request (not real-time)
- ❌ **No Database Change Listeners:** No Supabase real-time subscriptions for AI context updates
- ❌ **No Incremental Updates:** Fetches all data fresh each time (no delta updates)
- ⚠️ **Stale Context Risk:** AI might use outdated metrics if data changed between request and AI call

### 3.5 Wrong Prompt Flows
- ⚠️ **System Prompt Concatenation:** Gemini SDK doesn't support separate system role, so system prompt is concatenated with user prompt (suboptimal)
- ⚠️ **No Few-Shot Examples:** Prompts don't include example inputs/outputs for better AI understanding
- ⚠️ **No Chain-of-Thought:** Complex reasoning tasks don't use step-by-step prompting
- ⚠️ **Inconsistent Prompt Formats:** Each service builds prompts differently (no standardization)

### 3.6 Missing Filtering Logic Before Queries
- ⚠️ **No Query Validation:** Query engine executes patterns without validating if they make sense
- ⚠️ **No Rate Limiting:** No protection against spam/abuse queries
- ⚠️ **No Query Cost Estimation:** Doesn't estimate token cost before calling AI
- ⚠️ **No Input Sanitization:** User input passed directly to prompts (risk of prompt injection)

### 3.7 Query Results Not Fed Back into AI Reasoning
- ❌ **One-Way Flow:** Query results formatted for display, but not used to improve future AI reasoning
- ❌ **No Feedback Loop:** No mechanism to learn which queries/users/patterns work best
- ❌ **No Result Quality Tracking:** Doesn't track if AI suggestions led to successful outcomes
- ❌ **No A/B Testing:** Can't compare different prompt strategies

---

## 4. MISSING CAPABILITIES FOR "CHATGPT OVER CRM DATABASE"

### 4.1 RAG Layer (Retrieval Augmented Generation)
**What's Missing:**
- Vector database (Pinecone, Weaviate, Supabase Vector, or pgvector)
- Embedding generation for CRM entities (accounts, contacts, activities, quotations)
- Semantic search over database content
- Context retrieval before AI reasoning

**Why Needed:**
- Allows AI to "remember" and reference specific CRM data
- Enables natural language queries like "What did I discuss with ABC Corp last month?"
- Provides accurate, context-aware responses

**Implementation Example:**
```typescript
// Pseudo-code
const relevantContext = await semanticSearch(userQuery, embeddingStore);
const aiResponse = await runGemini(systemPrompt, userPrompt + relevantContext);
```

---

### 4.2 Knowledge Memory
**What's Missing:**
- Persistent conversation history storage
- User-specific context cache
- Cross-session learning
- Pattern recognition from past interactions

**Why Needed:**
- AI can reference previous conversations
- Personalizes responses based on user history
- Learns user preferences and patterns

**Implementation Example:**
```typescript
// Store conversation history
await supabase.from('ai_conversations').insert({
  user_id, message, response, context_snapshot
});

// Retrieve recent context
const recentContext = await getConversationHistory(userId, limit: 10);
```

---

### 4.3 Embedding Store
**What's Missing:**
- Embedding generation pipeline for CRM data
- Vector storage (Supabase pgvector extension or external service)
- Embedding update triggers (when data changes)
- Similarity search infrastructure

**Why Needed:**
- Enables semantic search over unstructured data (activity descriptions, notes)
- Finds related entities across different fields
- Powers RAG retrieval

**Implementation Example:**
```typescript
// Generate embeddings for activities
const embedding = await generateEmbedding(activity.description);
await supabase.from('activity_embeddings').insert({
  activity_id, embedding, metadata
});
```

---

### 4.4 Live Sync with Database
**What's Missing:**
- Supabase real-time subscriptions
- WebSocket connections for live updates
- Event-driven AI context refresh
- Incremental embedding updates

**Why Needed:**
- AI always uses latest data (no stale context)
- Immediate reaction to data changes
- Efficient updates (only changed data)

**Implementation Example:**
```typescript
// Real-time subscription
supabase
  .channel('activities')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, 
    async (payload) => {
      await updateEmbeddings(payload.new);
      await refreshAIContext(payload.new.account_id);
    })
  .subscribe();
```

---

### 4.5 Advanced Prompt Engineering
**What's Missing:**
- Chain-of-thought prompting for complex queries
- Few-shot learning examples
- Prompt templates library
- Dynamic prompt construction based on query complexity

**Why Needed:**
- Better AI reasoning for complex questions
- More accurate responses
- Consistent prompt quality

---

### 4.6 Query Understanding & Optimization
**What's Missing:**
- AI-powered query intent detection (beyond regex)
- Query cost estimation
- Query result caching
- Query optimization (combine multiple queries)

**Why Needed:**
- Handles ambiguous queries better
- Reduces API costs
- Faster responses

---

### 4.7 Feedback & Learning Loop
**What's Missing:**
- User feedback collection (thumbs up/down)
- Outcome tracking (did AI suggestion lead to success?)
- Prompt performance metrics
- A/B testing framework

**Why Needed:**
- Continuously improves AI quality
- Learns what works for specific users/contexts

---

## 5. FILE LOCATIONS SUMMARY

### Core AI Infrastructure
- **Gemini Client:** `utils/ai.ts`
- **Mode Router:** `lib/ai/router.ts`
- **Query Engine:** `lib/ai/queryEngine.ts`
- **Engagement Scoring:** `lib/ai/engagement.ts`

### API Endpoints
- **CRM Coach:** `app/api/ai/coach/route.ts`
- **Daily Coaching:** `app/api/ai/daily-coaching/route.ts`
- **Run Daily Coaching (Cron):** `app/api/ai/run-daily-coaching/route.ts`
- **Weekly Insights:** `app/api/ai/weekly-insights/route.ts`
- **Admin Insights:** `app/api/ai/admin-insights/route.ts`
- **Sub-account Insights:** `app/api/ai/subaccount-insights/route.ts`
- **Auto Monitor (Cron):** `app/(system)/api/ai/run-auto-monitor/route.ts`
- **Pricing Analysis:** `app/api/pricing/analyze/route.ts`

### Services
- **Pricing AI Service:** `lib/services/aiPricingAnalysis.ts`
- **Pricing Learning Engine:** `lib/services/pricingLearningEngine.ts` (referenced, not analyzed)

### UI Components
- **AI Chat Coach:** `components/AIChatCoach.tsx`
- **AI Pricing Hook:** `hooks/useAIPricing.ts`

### Database Tables (AI-related)
- `ai_queries` - Logs AI queries
- `quotes_*` - Stores AI pricing suggestions (`ai_suggested_price_per_unit`, `ai_win_probability`, `ai_pricing_insights`)
- `sub_accounts` - Stores `engagement_score` (AI-calculated)
- `accounts` - Stores `engagement_score`, `ai_engagement_tips`

---

## 6. RECOMMENDATIONS FOR IMPROVEMENT

### High Priority
1. **Implement Model Fallback:** Add `gemini-1.5-pro` as fallback if flash fails
2. **Add Retry Logic:** Exponential backoff for API failures
3. **Implement Conversation Memory:** Store and retrieve chat history
4. **Add Prompt Injection Protection:** Sanitize user input before sending to AI

### Medium Priority
5. **Implement Caching:** Cache employee metrics and frequently accessed data
6. **Add RAG Layer:** Vector database + embeddings for semantic search
7. **Real-time Sync:** Supabase subscriptions for live context updates
8. **Standardize Prompts:** Centralized prompt builder with templates

### Low Priority
9. **Query Optimization:** Combine queries, cache results
10. **Feedback Loop:** Collect user feedback and track outcomes
11. **A/B Testing:** Test different prompt strategies
12. **Cost Tracking:** Monitor token usage and API costs

---

## 7. CURRENT STATE SUMMARY

**Strengths:**
- ✅ Well-structured separation of concerns (Router, Query Engine, Coach AI)
- ✅ Multiple JSON parsing fallbacks (robust error handling)
- ✅ Domain restriction (CRM-only focus)
- ✅ Role-based access control (employee vs admin)
- ✅ Integration with database for context

**Weaknesses:**
- ❌ No RAG/embeddings (limited to what's in prompt)
- ❌ No conversation memory
- ❌ No model fallback or retry logic
- ❌ Hardcoded model version
- ❌ No live sync (stale data risk)
- ❌ No semantic search (only pattern matching)

**Overall Assessment:**
The AI implementation is **functional and production-ready for basic use cases** but lacks advanced features needed for a "ChatGPT over CRM database" experience. It works well for:
- Simple coaching questions
- Factual database queries
- Pricing analysis

But struggles with:
- Complex multi-turn conversations
- Natural language queries requiring semantic understanding
- Long-term memory and personalization
- Real-time context awareness

---

**End of Analysis**

