# 🤖 AI Implementation Guide

## YSM CRM - Google Gemini AI Integration

This document provides a comprehensive overview of how AI is implemented throughout the CRM system, where it's used, and how to leverage it effectively.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [AI Architecture](#ai-architecture)
3. [Core AI Functions](#core-ai-functions)
4. [API Endpoints](#api-endpoints)
5. [UI Components](#ui-components)
6. [Automated AI Features](#automated-ai-features)
7. [Database Integration](#database-integration)
8. [How to Use Each Feature](#how-to-use-each-feature)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The YSM CRM uses **Google Gemini AI 2.5** (`models/gemini-2.5-pro` for coaching, `models/gemini-2.5-flash` for bulk scoring) to power intelligent features across the entire platform. AI is deeply integrated into:

| Feature | Description | Who Uses It |
|---------|-------------|-------------|
| **AI Coach** | Real-time Q&A assistant | Employees & Admins |
| **Engagement Scoring** | Automatic account health analysis | System (auto) |
| **Daily Coaching** | Personalized daily insights | Employees |
| **Weekly Insights** | 7-day performance summary | Employees |
| **Admin Insights** | Employee performance analysis | Admins |
| **Slipping Detection** | Proactive risk alerts | System (auto) |
| **Escalation System** | Auto-escalate critical issues | System (auto) |

---

## 🏗️ AI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ AI Coach     │  │ Notifications │  │ Engagement Badge     │  │
│  │ Sidebar      │  │ Panel         │  │ (click for details)  │  │
│  └──────┬───────┘  └──────┬────────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ /api/ai/     │  │ /api/ai/     │  │ /api/ai/             │  │
│  │ coach        │  │ weekly-      │  │ subaccount-insights  │  │
│  │              │  │ insights     │  │                      │  │
│  └──────┬───────┘  └──────┬────────┘  └──────────┬───────────┘  │
│         │                 │                      │               │
│  ┌──────┴───────┐  ┌──────┴────────┐  ┌──────────┴───────────┐  │
│  │ /api/ai/     │  │ /api/ai/      │  │ /api/ai/             │  │
│  │ admin-       │  │ daily-        │  │ run-auto-monitor     │  │
│  │ insights     │  │ coaching      │  │ (CRON)               │  │
│  └──────┬───────┘  └──────┬────────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI CORE LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    utils/ai.ts                               ││
│  │  • runGemini<T>(systemPrompt, userPrompt) → JSON            ││
│  │  • calculateSubaccountAIInsights()                          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    lib/ai/engagement.ts                      ││
│  │  • runSubaccountAIScoring()                                 ││
│  │  • runAdminAIScoring()                                      ││
│  │  • triggerAIScoringForActivity()                            ││
│  │  • detectSlippingEngagementAndSuggestActions()              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE GEMINI API 2.5                         │
│         (models/gemini-2.5-pro | models/gemini-2.5-flash)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Core AI Functions

### 1. `runGemini<T>()` - Base AI Function

**Location:** `utils/ai.ts`

```typescript
export async function runGemini<T>(
  systemPrompt: string, 
  userPrompt: string
): Promise<T>
```

**What it does:**
- Sends prompts to Google Gemini API
- Expects JSON response
- Auto-parses JSON from markdown code blocks
- Returns typed response

**Example Usage:**
```typescript
const result = await runGemini<{ score: number; tips: string[] }>(
  "You are a CRM analyst...",
  "Analyze this account: ..."
);
```

---

### 2. `calculateSubaccountAIInsights()` - Account Scoring

**Location:** `utils/ai.ts`

```typescript
export async function calculateSubaccountAIInsights(input: {
  subaccountName: string;
  accountName: string;
  assignedEmployee?: string | null;
  currentScore: number;
  activities: Array<{
    activity_type: string;
    created_at: string;
    description?: string | null;
  }>;
}): Promise<SubaccountAIInsights>
```

**Returns:**
```typescript
{
  score: number;     // 0-100 engagement score
  tips: string[];    // 2-3 actionable suggestions
  comment: string;   // Short explanation
}
```

**When it's called:**
- After any activity is logged on an account
- When viewing sub-account details
- During automated monitoring scans

---

### 3. `runSubaccountAIScoring()` - Full Sub-Account Analysis

**Location:** `lib/ai/engagement.ts`

```typescript
export async function runSubaccountAIScoring(subAccountId: number)
```

**What it does:**
1. Fetches sub-account data from database
2. Fetches parent account info
3. Fetches recent activities (last 25)
4. Calls `calculateSubaccountAIInsights()`
5. Updates sub-account with new score and insights
6. Inserts engagement history snapshot
7. Creates notification if AI has a comment

---

### 4. `runAdminAIScoring()` - Employee Performance Analysis

**Location:** `lib/ai/engagement.ts`

```typescript
export async function runAdminAIScoring(
  employeeUsername: string
): Promise<AdminAIScoringResult>
```

**Returns:**
```typescript
{
  summary: string;           // 2-3 sentence overview
  strengths: string[];       // What employee does well
  weaknesses: string[];      // Areas for improvement
  coachingAdvice: string[];  // Actionable recommendations
  suggestedFocusAccounts: Array<{
    accountName: string;
    reason: string;
  }>;
}
```

---

### 5. `detectSlippingEngagementAndSuggestActions()` - Proactive Alerts

**Location:** `lib/ai/engagement.ts`

```typescript
export async function detectSlippingEngagementAndSuggestActions()
```

**What it does:**
1. Finds all sub-accounts with engagement score ≤ 60
2. For each risky account:
   - Fetches recent activities
   - Calls Gemini for coaching suggestions
   - Updates AI insights with alert
   - Creates admin notification
   - Checks for escalation conditions

**Escalation Triggers:**
- 3+ admin alerts in past 7 days → High priority escalation
- Score < 40 with 2+ alerts → Major engagement drop alert

---

## 🌐 API Endpoints

### AI Coach - Interactive Q&A

**Endpoint:** `POST /api/ai/coach`

```typescript
// Request
{
  user: string;           // Employee username
  role: 'employee' | 'admin';
  question: string;       // User's question
  context?: {
    subAccountId?: number;
    accountId?: number;
  };
}

// Response
{
  success: true;
  reply: string;              // AI's answer
  suggestedActions: string[]; // Action items
  tone: 'encouraging' | 'strategic' | 'warning';
}
```

**Context Automatically Gathered:**
- Recent activities (7 days)
- Employee streak
- Engagement trends
- High-priority alerts
- Leaderboard position

---

### Weekly Insights

**Endpoint:** `GET /api/ai/weekly-insights?employee=username`

```typescript
// Response
{
  success: true;
  insights: {
    summary: string;         // Week summary
    topOpportunity: string;  // Best win/opportunity
    improvementArea: string; // Focus area for next week
  }
}
```

---

### Daily Coaching

**Endpoint:** `GET /api/ai/daily-coaching?employee=username`

```typescript
// Response
{
  success: true;
  coaching: {
    motivation: string;        // Motivational message
    strengths: string[];       // What's going well
    weaknesses: string[];      // Areas to improve
    recommendations: string[]; // Action items
    priorityAccounts: string[]; // Accounts to focus on
  }
}
```

---

### Admin Insights

**Endpoint:** `GET /api/ai/admin-insights?employeeUsername=username`

```typescript
// Response
{
  success: true;
  data: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    coachingAdvice: string[];
    suggestedFocusAccounts: Array<{
      accountName: string;
      reason: string;
    }>;
  }
}
```

---

### Sub-Account AI Insights

**Endpoint:** `GET /api/ai/subaccount-insights?subAccountId=123`

```typescript
// Response
{
  success: true;
  data: {
    score: number;
    tips: string[];
    comment: string;
  }
}
```

---

### Auto-Monitor (CRON)

**Endpoint:** `GET /api/ai/run-auto-monitor`

```typescript
// Response
{
  success: true;
  message: 'AI monitoring run completed';
  updated: number; // Count of accounts updated
}
```

---

## 🎨 UI Components

### 1. AI Chat Coach (`components/AIChatCoach.tsx`)

**Features:**
- Slide-in sidebar from right
- Real-time Q&A with Gemini
- Tone-based styling (encouraging/strategic/warning)
- Suggested actions list
- Role-aware (employee vs admin mode)

**Usage:**
```tsx
<AIChatCoach
  isOpen={showCoach}
  onClose={() => setShowCoach(false)}
  user="john_doe"
  role="employee"
  context={{ subAccountId: 123 }}
/>
```

---

### 2. AI Notifications Panel (`components/crm/AINotificationsPanel.tsx`)

**Features:**
- Dropdown panel for AI alerts
- Priority-based color coding
- Unread count badge
- Click to mark as read
- IST timestamp formatting

**Priority Colors:**
| Priority | Color |
|----------|-------|
| Critical | Red |
| High | Orange |
| Normal | Blue |
| Low | Gray |

---

### 3. Engagement Score Badge (`components/crm/EngagementScoreBadge.tsx`)

**Features:**
- Clickable score badge
- Color-coded by score range
- Modal with detailed feedback
- Point-based improvement tips
- Progress visualization

**Score Ranges:**
| Score | Status | Color |
|-------|--------|-------|
| 0-25 | Poor | 🔴 Red |
| 26-50 | Fair | 🟡 Yellow |
| 51-75 | Good | 🟠 Orange |
| 76-100 | Excellent | 🟢 Green |

---

## ⚡ Automated AI Features

### 1. Activity-Triggered Scoring

**Trigger:** Any activity logged in `activityLogger.ts`

**Flow:**
```
Activity Logged
     ↓
triggerAIScoringForActivity()
     ↓
runSubaccountAIScoring()
     ↓
Updates engagement_score
     ↓
Creates notification
```

---

### 2. CRON Monitoring

**Endpoint:** `/api/ai/run-auto-monitor`

**Recommended Schedule:** Every 6 hours

**What happens:**
1. Scans all sub-accounts with score ≤ 60
2. Generates AI coaching suggestions
3. Updates `ai_insights` field
4. Creates admin notifications
5. Triggers escalation if needed

**Vercel CRON Setup:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/ai/run-auto-monitor",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

### 3. Escalation System

**Escalation Rules:**

| Condition | Action | Priority |
|-----------|--------|----------|
| 3+ alerts in 7 days | "Escalate follow-up" notification | High |
| Score < 40 + 2+ alerts | "Major engagement drop" notification | Critical |

---

## 🗄️ Database Integration

### Tables Used by AI

```sql
-- Sub-account scores and insights
sub_accounts.engagement_score      -- AI-calculated score (0-100)
sub_accounts.ai_insights           -- JSON: { tips, comment, alert }

-- Historical tracking
engagement_history.sub_account_id
engagement_history.score
engagement_history.created_at

-- AI notifications
employee_notifications.employee
employee_notifications.message     -- AI-generated message
employee_notifications.priority    -- low/normal/high/critical
employee_notifications.target_role -- 'employee' or 'admin'
employee_notifications.is_read

-- AI coaching storage
employee_ai_coaching.employee
employee_ai_coaching.coaching_data
employee_ai_coaching.created_at
```

---

## 📖 How to Use Each Feature

### For Employees

#### 1. Ask AI Coach a Question
1. Click the **🤖 AI Coach** button in sidebar
2. Type your question (e.g., "How can I improve my performance?")
3. Press Enter or click "Ask Coach"
4. Review the answer and suggested actions

**Example Questions:**
- "How can I improve engagement for ABC Corp?"
- "What should I focus on today?"
- "Why is my account engagement score low?"
- "Give me tips for closing more deals"

#### 2. View AI Notifications
1. Click the **🔔 bell icon** in header
2. Review AI-generated alerts and insights
3. Click any notification to mark as read

#### 3. Check Engagement Score
1. View any sub-account in the CRM
2. Click the colored score badge (e.g., **75**)
3. Read why the score is what it is
4. Follow improvement tips to increase score

---

### For Admins

#### 1. View Employee AI Analysis
1. Go to Admin dashboard
2. Select an employee
3. Click "Get AI Insights"
4. Review:
   - Performance summary
   - Strengths & weaknesses
   - Coaching advice
   - Suggested focus accounts

#### 2. Monitor Slipping Accounts
1. AI automatically scans accounts every 6 hours
2. Check admin notifications for alerts
3. High-priority items need immediate action
4. Critical items indicate major engagement drops

#### 3. Weekly Insights Review
1. Use `/api/ai/weekly-insights?employee=username`
2. Get AI summary of employee's week
3. Identify top opportunities and improvement areas

---

## ⚙️ Configuration

### Environment Variables

```env
# Required for all AI features
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Supabase (required for data)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Model Configuration

**Available Models:**
- `models/gemini-2.5-pro` - DEFAULT_MODEL for coaching, admin insights, complex analysis
- `models/gemini-2.5-flash` - FAST_MODEL for bulk scoring, engagement analysis

To change, modify in `utils/ai.ts`:
```typescript
const DEFAULT_MODEL = 'models/gemini-2.5-pro';
const FAST_MODEL = 'models/gemini-2.5-flash';
```

**Model Usage:**
- `runGemini<T>()` - Uses DEFAULT_MODEL with automatic fallback to FAST_MODEL
- `runGeminiFast<T>()` - Uses FAST_MODEL directly for bulk operations

---

## 🔍 Troubleshooting

### Common Issues

#### "Missing GOOGLE_GEMINI_API_KEY env"
- Add `GOOGLE_GEMINI_API_KEY` to your `.env` file
- Restart the development server

#### "Gemini response was not valid JSON"
- The AI sometimes returns non-JSON text
- The system has fallbacks for this
- If persistent, check the prompt format

#### AI Coach not responding
1. Check browser console for errors
2. Verify API key is set
3. Check `/api/ai/coach` endpoint directly

#### Engagement scores not updating
1. Ensure activities are being logged
2. Check `triggerAIScoringForActivity()` is called
3. Verify database columns exist
4. Run the FIX_ACTIVITY_TYPE_TRIGGER.sql script

#### Notifications not appearing
1. Check `employee_notifications` table
2. Verify employee username matches exactly
3. Check `target_role` filter ('employee' vs 'admin')

---

## 📊 AI Prompt Templates

### Engagement Scoring Prompt
```
System: You are a CRM engagement analyst. Given a sub-account name, 
parent account, existing score, and recent activities, output a JSON 
object with score (0-100), tips array (2-3 actionable suggestions), 
and comment (short explanation of the score).

User: Sub-account: [name], Activities: [list], Current Score: [number]
```

### Coach Prompt
```
System: You are a CRM AI coach. Provide concise, practical, and 
actionable coaching advice. Keep responses short (2-3 sentences max 
for reply, 3-5 action items). Be contextual and specific.

User: [Role], [Context], Question: [user question]
```

### Slipping Detection Prompt
```
System: You are a CRM Engagement coach. This sub-account seems at risk. 
Provide 1-2 actionable suggestions in human coaching style.

User: Sub-account: [name], Score: [number], Activities: [list]
```

---

## 🚀 Future Enhancements (Roadmap)

- [ ] Voice-to-text AI coaching
- [ ] Predictive deal closing analysis
- [ ] AI-generated email drafts
- [ ] Competitive intelligence insights
- [ ] Customer sentiment analysis
- [ ] Auto-generated meeting summaries

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Dec 2024 | Migrated to Google Gemini, removed Claude |
| 1.5 | Nov 2024 | Added escalation system |
| 1.0 | Oct 2024 | Initial AI implementation |

---

**Last Updated:** December 3, 2024  
**AI Provider:** Google Gemini 2.5 (models/gemini-2.5-pro, models/gemini-2.5-flash)  
**Maintained by:** YSM Tech Team
