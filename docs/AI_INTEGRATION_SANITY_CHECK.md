# AI Integration Sanity Check

## Integration Points Inventory

### 1. `loadBusinessKnowledge` Calls
**Files:**
- `lib/services/aiPricingAnalysis.ts` (line 271) - Called with `quotationId` and `productType`
- `app/api/ai/coach/route.ts` (line 224, 474) - Called in QUERY and COACH modes
- `lib/ai/liveMemoryEngine.ts` - Called periodically for background refresh
- `lib/ai/knowledgeSync.ts` - Called on data changes

**Context Parameters Used:**
- `quotationId` - Fetches quotation context + similar quotations
- `subAccountId` - Fetches CRM context (sub-account, account, contacts, activities)
- `productType` - Fetches pricing history, competitor trends, demand pricing
- `forceRefresh` - Triggers fresh data fetch (used by liveMemoryEngine)

### 2. `runGemini` / `runGeminiFast` Calls
**Files:**
- `lib/services/aiPricingAnalysis.ts` (line 317) - Uses `runGemini` with knowledge context
- `app/api/ai/coach/route.ts` (line 264, 489) - Uses `runGeminiFast` (QUERY) and `runGemini` (COACH)
- `utils/ai.ts` - Core implementation with model fallback

**Knowledge Context Passed:**
- Pricing AI: Always passes knowledge (quotationId + productType)
- CRM QUERY: Passes knowledge (empty context, loads company insights)
- CRM COACH: Passes knowledge (subAccountId if available)

### 3. `pricingMemory` / `pricingOutcomeMemory` Usage
**Files:**
- `lib/services/aiPricingAnalysis.ts` (line 226, 242) - Calls `findSimilarPastPrice` and `getWinningPatterns`
- `app/api/quotes/outcome/route.ts` - Calls `recordPricingOutcome` when quote marked won/lost

**Functions:**
- `findSimilarPastPrice()` - Searches past quotations for similar specs
- `getWinningPatterns()` - Retrieves winning price patterns
- `recordPricingOutcome()` - Records win/loss outcomes

### 4. `semanticQueryInterpreter` Usage
**Files:**
- `lib/ai/queryEngine.ts` (line 530) - Called first before regex parsing

**Integration:**
- Detects entities: contacts, accounts, subaccounts, activities, quotes
- Detects filters: startsWith, contains, silentAccounts, recentActivity, region, minQuotes, silentDays
- Falls back to regex parsing if semantic interpretation fails

### 5. `conversationMemory` Usage
**Files:**
- `app/api/ai/coach/route.ts` (line 139, 348) - Adds messages to memory
- `app/api/ai/coach/route.ts` (line 252, 436) - Formats memory context for prompts

**Functions:**
- `addToConversationMemory(userId, message)` - Stores last 5 messages
- `formatMemoryContext(userId)` - Formats as bullet points for AI prompts

### 6. `userProfileEngine` Usage
**Files:**
- `app/api/ai/coach/route.ts` (line 234, 413) - Gets profile for role-based customization

**Roles:**
- `admin` - authoritative/overview/directive
- `employee` - supportive/practical/stepByStep
- `data_analyst` - analytical/detailed/informative

---

## Test Cases with Dry-Run Reasoning

### Test Case 1: CRM QUERY - "how many contacts do we have"

**Flow:**
1. **API Endpoint:** `POST /api/ai/coach`
   - Request: `{ user: "user123", role: "admin", question: "how many contacts do we have" }`

2. **Mode Detection:**
   - `routeAIRequest()` detects QUERY mode (contains "how many")

3. **Conversation Memory:**
   - `addToConversationMemory("user123", "how many contacts do we have")` - Stores message

4. **Query Execution:**
   - `executeCRMQuery()` → `parseQueryIntent()` detects `entity: "contacts"`, `operation: "count"`
   - `queryContacts()` executes count query
   - Returns count result

5. **Semantic Interpreter:**
   - `interpretSemanticQuery()` may detect "contacts" entity
   - Falls back to regex parsing (count operation)

6. **Knowledge Loading:**
   - `loadBusinessKnowledge({})` - Loads company-level insights only
   - Returns: `metaStats`, `crmWeighted` (always included)

7. **AI Interpretation:**
   - `runGeminiFast()` called with:
     - System prompt (includes profile context for admin)
     - User prompt (includes conversation memory + query context)
     - Knowledge context

8. **Expected Logs:**
   ```
   [AI] CRM QUERY: Starting query mode
   [AI] CRM QUERY: Added to conversation memory
   [AI] QueryEngine: Starting query execution
   [AI] SemanticQueryInterpreter: Analyzing query
   [AI] QueryEngine: Semantic intent { entity: 'contacts', ... }
   [AI] KnowledgeLoader: Starting loadBusinessKnowledge
   [AI] KnowledgeLoader: Completed loadBusinessKnowledge
   [AI] CRM QUERY: Role detected: admin, Profile: authoritative/overview
   [AI] ConversationMemory: Formatted 1 previous messages
   [AI] CRM QUERY: Calling runGeminiFast with knowledge context
   [AI] CRM QUERY: runGeminiFast completed
   [AI] CRM QUERY: Query interpretation complete
   ```

**Files Involved:**
- `app/api/ai/coach/route.ts` (handleQueryMode)
- `lib/ai/queryEngine.ts` (executeCRMQuery)
- `lib/ai/semanticQueryInterpreter.ts` (interpretSemanticQuery)
- `lib/ai/knowledgeLoader.ts` (loadBusinessKnowledge)
- `lib/ai/conversationMemory.ts` (formatMemoryContext)
- `lib/ai/userProfileEngine.ts` (getUserProfile)
- `utils/ai.ts` (runGeminiFast)

---

### Test Case 2: CRM QUERY - "show me all contacts whose name starts with a"

**Flow:**
1. **API Endpoint:** `POST /api/ai/coach`
   - Request: `{ user: "user123", role: "employee", question: "show me all contacts whose name starts with a" }`

2. **Mode Detection:**
   - `routeAIRequest()` detects QUERY mode

3. **Semantic Interpreter:**
   - `interpretSemanticQuery()` detects:
     - `entity: "contacts"`
     - `filterType: "startsWith"`
     - `filterValue: "a"`

4. **Query Execution:**
   - `executeCRMQuery()` → Semantic handler triggers
   - `runContactStartsWithQuery()` executes with prefix "a"
   - Returns filtered contacts

5. **Knowledge Loading:**
   - `loadBusinessKnowledge({})` - Company insights only

6. **AI Interpretation:**
   - `runGeminiFast()` interprets results with employee profile context

7. **Expected Logs:**
   ```
   [AI] CRM QUERY: Starting query mode
   [AI] QueryEngine: Starting query execution
   [AI] SemanticQueryInterpreter: Analyzing query
   [AI] SemanticQueryInterpreter: Result { entity: 'contacts', filterType: 'startsWith', ... }
   [AI] QueryEngine: Semantic intent { entity: 'contacts', filterType: 'startsWith' }
   [Semantic Query] Contact name startsWith match detected
   [AI] KnowledgeLoader: Starting loadBusinessKnowledge
   [AI] CRM QUERY: Role detected: employee, Profile: supportive/practical
   [AI] CRM QUERY: Calling runGeminiFast with knowledge context
   [AI] CRM QUERY: runGeminiFast completed
   ```

**Files Involved:**
- `app/api/ai/coach/route.ts` (handleQueryMode)
- `lib/ai/queryEngine.ts` (executeCRMQuery, runContactStartsWithQuery)
- `lib/ai/semanticQueryInterpreter.ts` (interpretSemanticQuery)

---

### Test Case 3: CRM COACH - "Explain step by step how pricing is calculated for our quotations"

**Flow:**
1. **API Endpoint:** `POST /api/ai/coach`
   - Request: `{ user: "user123", role: "admin", question: "Explain step by step how pricing is calculated for our quotations" }`

2. **Mode Detection:**
   - `routeAIRequest()` detects COACH mode (coaching question)

3. **Conversation Memory:**
   - `addToConversationMemory("user123", "...")` - Stores message

4. **CRM Data Fetching:**
   - `getAdminInsightsSummary()` - Fetches company-wide metrics
   - Builds context string with account counts, top performers, slipping accounts

5. **Knowledge Loading:**
   - `loadBusinessKnowledge({ subAccountId: context?.subAccountId })` - May include CRM context if subAccountId provided

6. **User Profile:**
   - `getUserProfile("admin")` → authoritative/overview/directive

7. **AI Call:**
   - `runGemini()` called with:
     - System prompt (includes profile context)
     - Enhanced user prompt (includes conversation memory + CRM data + reasoning steps)
     - Knowledge context

8. **Expected Logs:**
   ```
   [AI] CRM COACH: Starting coach mode
   [AI] CRM COACH: Added to conversation memory
   [AI] CRM COACH: Role detected: admin, Profile: authoritative/overview
   [AI] KnowledgeLoader: Starting loadBusinessKnowledge
   [AI] KnowledgeLoader: Completed loadBusinessKnowledge
   [AI] ConversationMemory: Formatted 1 previous messages
   [AI] CRM COACH: Calling runGemini with knowledge context
   [AI] CRM COACH: runGemini completed
   [AI] CRM COACH: Coach response complete
   ```

**Files Involved:**
- `app/api/ai/coach/route.ts` (handleCoachMode)
- `lib/ai/knowledgeLoader.ts` (loadBusinessKnowledge)
- `lib/ai/conversationMemory.ts` (formatMemoryContext)
- `lib/ai/userProfileEngine.ts` (getUserProfile)
- `utils/ai.ts` (runGemini)

---

### Test Case 4: CRM COACH - "Which accounts seem to be slipping and what should I do?"

**Flow:**
1. **API Endpoint:** `POST /api/ai/coach`
   - Request: `{ user: "user456", role: "employee", question: "Which accounts seem to be slipping and what should I do?" }`

2. **Mode Detection:**
   - COACH mode (coaching question)

3. **CRM Data Fetching:**
   - `getEmployeeMetrics("user456")` - Personal metrics
   - `getSlippingAccounts("user456", 50)` - Slipping accounts for employee
   - `getEmployeeRanking("user456", 30)` - Ranking data

4. **Knowledge Loading:**
   - `loadBusinessKnowledge({})` - Company insights

5. **User Profile:**
   - `getUserProfile("employee")` → supportive/practical/stepByStep

6. **AI Call:**
   - `runGemini()` with employee profile context and slipping accounts data

7. **Expected Logs:**
   ```
   [AI] CRM COACH: Starting coach mode
   [AI] CRM COACH: Role detected: employee, Profile: supportive/practical
   [AI] KnowledgeLoader: Starting loadBusinessKnowledge
   [AI] CRM COACH: Calling runGemini with knowledge context
   [AI] CRM COACH: runGemini completed
   ```

**Files Involved:**
- `app/api/ai/coach/route.ts` (handleCoachMode)
- `lib/ai/knowledgeLoader.ts` (loadBusinessKnowledge)
- `lib/ai/userProfileEngine.ts` (getUserProfile)

---

### Test Case 5: Pricing AI - MBCB with competitor + client demand prices

**Flow:**
1. **API Endpoint:** `POST /api/pricing/analyze`
   - Request: `{ productType: "mbcb", ourPricePerUnit: 150, competitorPricePerUnit: 155, clientDemandPricePerUnit: 145, quantity: 1000, userRole: "admin" }`

2. **Service Call:**
   - `analyzePricingWithAI()` with full input

3. **Learning Context:**
   - `analyzePricingPerformance("mbcb", 90)` - Fetches learning stats
   - `formatLearningStatsForPrompt()` - Formats for prompt

4. **Pricing Memory:**
   - `findSimilarPastPrice()` - Searches `quotes_mbcb` for similar specs
   - Returns: `{ lastPrice, quantity, createdAt, outcome }` or null

5. **Pricing Outcome Memory:**
   - `getWinningPatterns("mbcb")` - Searches `pricing_outcomes` table
   - Returns: `{ averageWinningPrice, bestMargin, count }` or null

6. **Knowledge Loading:**
   - `loadBusinessKnowledge({ productType: "mbcb" })` - Fetches:
     - Pricing history (last 90 days)
     - Competitor trends
     - Demand price trends
     - Applies weighting to pricing quotations

7. **AI Call:**
   - `runGemini()` with:
     - System prompt (pricing strategist)
     - Enhanced prompt (step-by-step reasoning + all context)
     - Knowledge context

8. **Role-Based Adjustment:**
   - `adjustPriceForRole()` - Admin: no adjustment (neutral)
   - `roleBasedInsightMessage()` - Admin: "consider pushing higher" message

9. **Expected Logs:**
   ```
   [AI] Pricing AI: Starting analysis
   [AI] Pricing AI: Input { productType: 'mbcb', userRole: 'admin', ... }
   [AI] Pricing AI: Fetching pricingMemory (findSimilarPastPrice)
   [AI] Pricing AI: pricingMemory returned: ₹150.00 from 2024-01-15
   [AI] Pricing AI: Fetching pricingOutcomeMemory (getWinningPatterns)
   [AI] Pricing AI: pricingOutcomeMemory returned: 5 wins, avg ₹152.00
   [AI] Pricing AI: Loading business knowledge
   [AI] KnowledgeLoader: Starting loadBusinessKnowledge
   [AI] KnowledgeLoader: Applied weighting to 20 pricing quotations
   [AI] KnowledgeLoader: Completed loadBusinessKnowledge
   [AI] Pricing AI: Knowledge loaded successfully
   [AI] Pricing AI: Calling runGemini with knowledge context
   [AI] Pricing AI: runGemini completed
   [AI] Pricing AI: Role detected: admin (normalized: admin, isDataAnalyst: false)
   [AI] Pricing AI: No role-based price adjustment (role: admin)
   [AI] Pricing AI: Added role-based insight for admin
   [AI] Pricing AI: Analysis complete - Recommended: ₹152.50, Win Prob: 75%
   ```

**Files Involved:**
- `app/api/pricing/analyze/route.ts` (API handler)
- `lib/services/aiPricingAnalysis.ts` (analyzePricingWithAI)
- `lib/services/pricingMemory.ts` (findSimilarPastPrice)
- `lib/services/pricingOutcomeMemory.ts` (getWinningPatterns)
- `lib/ai/knowledgeLoader.ts` (loadBusinessKnowledge)
- `lib/ai/pricingRoleBehavior.ts` (adjustPriceForRole, roleBasedInsightMessage)
- `utils/ai.ts` (runGemini)

---

### Test Case 6: Pricing AI - Signages with employee role

**Flow:**
1. **API Endpoint:** `POST /api/pricing/analyze`
   - Request: `{ productType: "signages", ourPricePerUnit: 200, competitorPricePerUnit: 205, quantity: 500, userRole: "employee" }`

2. **Service Call:**
   - Similar to Test Case 5, but:
     - Searches `quotes_signages` table
     - Employee role triggers -2% price adjustment
     - Employee gets warning message about minimum margin

3. **Expected Logs:**
   ```
   [AI] Pricing AI: Starting analysis
   [AI] Pricing AI: Input { productType: 'signages', userRole: 'employee', ... }
   [AI] Pricing AI: Fetching pricingMemory (findSimilarPastPrice)
   [AI] Pricing AI: Fetching pricingOutcomeMemory (getWinningPatterns)
   [AI] Pricing AI: Loading business knowledge
   [AI] KnowledgeLoader: Starting loadBusinessKnowledge
   [AI] KnowledgeLoader: Completed loadBusinessKnowledge
   [AI] Pricing AI: Calling runGemini with knowledge context
   [AI] Pricing AI: runGemini completed
   [AI] Pricing AI: Role detected: employee (normalized: employee, isDataAnalyst: false)
   [AI] Pricing AI: Role-based price adjustment applied: ₹200.00 → ₹196.00
   [AI] Pricing AI: Added role-based insight for employee
   [AI] Pricing AI: Analysis complete - Recommended: ₹196.00, Win Prob: 70%
   ```

**Files Involved:**
- Same as Test Case 5, with role-based adjustments

---

## Manual Test Steps

### CRM AI Testing

#### Test 1: Basic Contact Count Query
1. Navigate to CRM AI Coach interface
2. Enter question: **"how many contacts do we have"**
3. Select role: **Admin** (or Employee)
4. Click Send

**Expected Behavior:**
- Query executes successfully
- Returns count of contacts
- AI provides interpretation of the count

**Logs to Verify:**
```
[AI] CRM QUERY: Starting query mode
[AI] QueryEngine: Starting query execution
[AI] SemanticQueryInterpreter: Analyzing query
[AI] KnowledgeLoader: Starting loadBusinessKnowledge
[AI] KnowledgeLoader: Completed loadBusinessKnowledge
[AI] CRM QUERY: Role detected: admin, Profile: authoritative/overview
[AI] CRM QUERY: Calling runGeminiFast with knowledge context
[AI] CRM QUERY: runGeminiFast completed
```

#### Test 2: Semantic Contact Filter Query
1. Enter question: **"show me all contacts whose name starts with a"**
2. Select role: **Employee**
3. Click Send

**Expected Behavior:**
- Semantic interpreter detects "contacts" + "startsWith" + "a"
- Returns filtered contacts list
- AI interprets the results

**Logs to Verify:**
```
[AI] SemanticQueryInterpreter: Analyzing query
[AI] SemanticQueryInterpreter: Result { entity: 'contacts', filterType: 'startsWith', ... }
[Semantic Query] Contact name startsWith match detected
```

#### Test 3: Multi-Condition Query
1. Enter question: **"customers in telangana with 3+ quotations but silent in 45 days"**
2. Select role: **Admin**
3. Click Send

**Expected Behavior:**
- Semantic interpreter detects:
  - `region: "Telangana"`
  - `minQuotes: 3`
  - `silentDays: 45`
- Returns filtered sub-accounts matching all conditions

**Logs to Verify:**
```
[AI] SemanticQueryInterpreter: Result { entity: 'subaccounts', filters: { region: 'Telangana', minQuotes: 3, silentDays: 45 } }
[Semantic Query] Complex multi-condition CRM query detected
```

#### Test 4: Coaching Question
1. Enter question: **"Which accounts seem to be slipping and what should I do?"**
2. Select role: **Employee**
3. Click Send

**Expected Behavior:**
- COACH mode detected
- Fetches employee metrics and slipping accounts
- AI provides personalized coaching with specific actions

**Logs to Verify:**
```
[AI] CRM COACH: Starting coach mode
[AI] CRM COACH: Role detected: employee, Profile: supportive/practical
[AI] KnowledgeLoader: Starting loadBusinessKnowledge
[AI] CRM COACH: Calling runGemini with knowledge context
[AI] CRM COACH: runGemini completed
```

#### Test 5: Follow-up Question (Conversation Memory)
1. First question: **"how many contacts do we have"**
2. Second question: **"what about accounts"**
3. Select role: **Admin**

**Expected Behavior:**
- Second question should reference previous context
- AI understands "what about accounts" as follow-up

**Logs to Verify:**
```
[AI] ConversationMemory: Formatted 1 previous messages for user user123
```

---

### Pricing AI Testing

#### Test 1: MBCB Pricing with Admin Role
1. Navigate to MBCB pricing page
2. Fill in:
   - Product specs (section, thickness, coating)
   - Quantity: 1000
   - Competitor price: 155
   - Client demand price: 145
3. Select role: **Admin** (if role selector exists)
4. Click "Analyze with AI"

**Expected Behavior:**
- AI recommends price
- No price adjustment (admin = neutral)
- Includes admin insight: "consider pushing higher"

**Logs to Verify:**
```
[AI] Pricing AI: Starting analysis
[AI] Pricing AI: Fetching pricingMemory (findSimilarPastPrice)
[AI] Pricing AI: Fetching pricingOutcomeMemory (getWinningPatterns)
[AI] Pricing AI: Loading business knowledge
[AI] KnowledgeLoader: Applied weighting to X pricing quotations
[AI] Pricing AI: Role detected: admin
[AI] Pricing AI: No role-based price adjustment (role: admin)
[AI] Pricing AI: Analysis complete - Recommended: ₹X, Win Prob: X%
```

#### Test 2: Signages Pricing with Employee Role
1. Navigate to Signages pricing page
2. Fill in:
   - Product specs
   - Quantity: 500
   - Competitor price: 205
3. Select role: **Employee**
4. Click "Analyze with AI"

**Expected Behavior:**
- AI recommends price
- Price adjusted -2% (employee negotiation buffer)
- Includes employee warning: "ensure pricing does not go below minimum margin"

**Logs to Verify:**
```
[AI] Pricing AI: Role detected: employee
[AI] Pricing AI: Role-based price adjustment applied: ₹X → ₹Y (2% reduction)
[AI] Pricing AI: Added role-based insight for employee
```

#### Test 3: Pricing with Data Analyst Role
1. Same as Test 1, but select role: **DATA_ANALYST**

**Expected Behavior:**
- No price adjustment (bypasses role logic)
- No role-based insight message
- Base AI recommendation returned

**Logs to Verify:**
```
[AI] Pricing AI: Role detected: DATA_ANALYST (normalized: dataanalyst, isDataAnalyst: true)
[AI] Pricing AI: Data Analyst role - bypassing price adjustments
```

---

## Expected Log Patterns

### Successful CRM QUERY Flow
```
[AI] CRM QUERY: Starting query mode
[AI] CRM QUERY: Added to conversation memory
[AI] QueryEngine: Starting query execution
[AI] SemanticQueryInterpreter: Analyzing query: "..."
[AI] SemanticQueryInterpreter: Result { entity: 'contacts', ... }
[AI] QueryEngine: Semantic intent { entity: 'contacts', ... }
[AI] KnowledgeLoader: Starting loadBusinessKnowledge { ... }
[AI] KnowledgeLoader: Applied weighting to X CRM accounts
[AI] KnowledgeLoader: Completed loadBusinessKnowledge { hasCrmContext: false, ... }
[AI] CRM QUERY: Role detected: admin, Profile: authoritative/overview
[AI] ConversationMemory: Formatted 1 previous messages for user user123
[AI] CRM QUERY: Calling runGeminiFast with knowledge context
[AI] CRM QUERY: runGeminiFast completed
[AI] CRM QUERY: Query interpretation complete
```

### Successful CRM COACH Flow
```
[AI] CRM COACH: Starting coach mode
[AI] CRM COACH: Added to conversation memory
[AI] CRM COACH: Role detected: employee, Profile: supportive/practical
[AI] KnowledgeLoader: Starting loadBusinessKnowledge { subAccountId: undefined }
[AI] KnowledgeLoader: Completed loadBusinessKnowledge { ... }
[AI] ConversationMemory: Formatted 1 previous messages for user user456
[AI] CRM COACH: Calling runGemini with knowledge context
[AI] CRM COACH: runGemini completed
[AI] CRM COACH: Coach response complete
```

### Successful Pricing AI Flow
```
[AI] Pricing AI: Starting analysis
[AI] Pricing AI: Input { productType: 'mbcb', userRole: 'admin', ... }
[AI] Pricing AI: Fetching pricingMemory (findSimilarPastPrice)
[AI] Pricing AI: pricingMemory returned: ₹150.00 from 2024-01-15
[AI] Pricing AI: Fetching pricingOutcomeMemory (getWinningPatterns)
[AI] Pricing AI: pricingOutcomeMemory returned: 5 wins, avg ₹152.00
[AI] Pricing AI: Loading business knowledge
[AI] KnowledgeLoader: Starting loadBusinessKnowledge { productType: 'mbcb', ... }
[AI] KnowledgeLoader: Applied weighting to 20 pricing quotations
[AI] KnowledgeLoader: Completed loadBusinessKnowledge { pricingHistoryCount: 1, pricingWeightedCount: 20, ... }
[AI] Pricing AI: Knowledge loaded successfully
[AI] Pricing AI: Calling runGemini with knowledge context
[AI] Pricing AI: runGemini completed
[AI] Pricing AI: Role detected: admin (normalized: admin, isDataAnalyst: false)
[AI] Pricing AI: No role-based price adjustment (role: admin)
[AI] Pricing AI: Added role-based insight for admin
[AI] Pricing AI: Analysis complete - Recommended: ₹152.50, Win Prob: 75%
```

---

## Potential Break Points

### 1. Missing Role Parameter
**Location:** `app/api/pricing/analyze/route.ts`
**Issue:** If `userRole` is not provided in request body
**Impact:** No role-based adjustments, no insight messages
**Mitigation:** Logs show "Role detected: none" - system continues with base price

### 2. Missing quotationId in Pricing AI
**Location:** `lib/services/aiPricingAnalysis.ts` (line 272)
**Issue:** If `quotationId` not provided, quotation context not loaded
**Impact:** Less context for AI, but system continues
**Mitigation:** Logs show "quotationId: not provided" - knowledge loader handles gracefully

### 3. Empty Database (No Historical Data)
**Location:** `lib/services/pricingMemory.ts`, `lib/services/pricingOutcomeMemory.ts`
**Issue:** No past quotations or outcomes in database
**Impact:** `findSimilarPastPrice()` and `getWinningPatterns()` return null
**Mitigation:** System continues with "No historical match found" message

### 4. Knowledge Loader Failures
**Location:** `lib/ai/knowledgeLoader.ts`
**Issue:** Database query failures (table missing, connection issues)
**Impact:** Knowledge context missing, but AI call continues
**Mitigation:** Try-catch blocks log warnings and continue without context

### 5. Semantic Interpreter Edge Cases
**Location:** `lib/ai/semanticQueryInterpreter.ts`
**Issue:** Ambiguous queries that don't match patterns
**Impact:** Falls back to regex parsing or returns "unknown" entity
**Mitigation:** System provides helpful suggestions

### 6. Conversation Memory Overflow
**Location:** `lib/ai/conversationMemory.ts`
**Issue:** Memory limited to 5 messages (by design)
**Impact:** Older messages dropped (expected behavior)
**Mitigation:** System logs memory size, oldest messages auto-removed

### 7. Model Fallback Failures
**Location:** `utils/ai.ts` (`runWithFallback`)
**Issue:** All Gemini models fail
**Impact:** Request fails with error
**Mitigation:** Logs show all model attempts, throws descriptive error

### 8. Role Normalization Issues
**Location:** `lib/ai/pricingRoleBehavior.ts`, `lib/ai/userProfileEngine.ts`
**Issue:** Role string variations ("ADMIN" vs "admin" vs "Admin")
**Impact:** May not match role profiles
**Mitigation:** `.toLowerCase().replace(/_/g, '')` normalizes all variations

### 9. Data Analyst Role in Pricing
**Location:** `lib/services/aiPricingAnalysis.ts` (line 331)
**Issue:** Data Analyst should bypass pricing logic
**Impact:** If not detected correctly, may apply adjustments
**Mitigation:** Explicit `isDataAnalyst` check with logging

### 10. Missing Sub-Account ID in CRM Context
**Location:** `app/api/ai/coach/route.ts` (line 474)
**Issue:** `context.subAccountId` not provided
**Impact:** CRM context not loaded, but system continues
**Mitigation:** Knowledge loader handles undefined gracefully

---

## Checklist: Scenarios to Test Manually

### CRM AI Scenarios
- [ ] **Basic count query:** "how many contacts do we have" (Admin)
- [ ] **Semantic filter query:** "show me all contacts whose name starts with a" (Employee)
- [ ] **Multi-condition query:** "customers in telangana with 3+ quotations but silent in 45 days" (Admin)
- [ ] **Silent accounts query:** "which customers are silent?" (Admin)
- [ ] **Slipping engagement query:** "tell me slipping accounts" (Employee)
- [ ] **Coaching question:** "Which accounts seem to be slipping and what should I do?" (Employee)
- [ ] **Coaching question:** "Explain step by step how pricing is calculated for our quotations" (Admin)
- [ ] **Follow-up question:** Ask "how many contacts" then "what about accounts" (tests conversation memory)
- [ ] **Unknown entity:** "show me employees" (should provide helpful suggestions)

### Pricing AI Scenarios
- [ ] **MBCB with Admin role:** Full pricing analysis, verify no price adjustment
- [ ] **MBCB with Employee role:** Verify -2% adjustment and warning message
- [ ] **Signages with Admin role:** Full pricing analysis
- [ ] **Signages with Employee role:** Verify -2% adjustment
- [ ] **Paint with Data Analyst role:** Verify bypass of role adjustments
- [ ] **Pricing without quotationId:** Should still work (loads productType context only)
- [ ] **Pricing with quotationId:** Should load quotation context + similar quotations
- [ ] **Pricing with no historical data:** Should still provide recommendation

### Edge Cases
- [ ] **Missing userRole in pricing request:** Should continue without adjustments
- [ ] **Invalid role string:** Should default to no adjustments
- [ ] **Empty database (no contacts/accounts):** Should return "0 found" gracefully
- [ ] **Gemini API failure:** Should show model fallback attempts in logs
- [ ] **Knowledge loader timeout:** Should continue without knowledge context

---

## Log Verification Guide

When running `npm run dev` and testing, you should see these log prefixes:

### CRM AI Logs
- `[AI] CRM QUERY:` - Query mode operations
- `[AI] CRM COACH:` - Coach mode operations
- `[AI] QueryEngine:` - Query execution
- `[AI] SemanticQueryInterpreter:` - Semantic analysis

### Pricing AI Logs
- `[AI] Pricing AI:` - Pricing analysis operations
- `[AI] Pricing AI: pricingMemory` - Historical price lookup
- `[AI] Pricing AI: pricingOutcomeMemory` - Win/loss patterns

### Knowledge & Memory Logs
- `[AI] KnowledgeLoader:` - Knowledge loading operations
- `[AI] ConversationMemory:` - Conversation history
- `[AI] UserProfileEngine:` - Role profile detection

### AI Core Logs
- `[AI] Trying model:` - Model fallback attempts
- `[AI Recovery] Model fallback executed at runtime` - Successful fallback

---

## Summary

All integration points are logged with `[AI]` prefix for easy filtering. The system is designed to gracefully handle missing data, role variations, and API failures. Test each scenario above and verify the expected log patterns match actual output.

