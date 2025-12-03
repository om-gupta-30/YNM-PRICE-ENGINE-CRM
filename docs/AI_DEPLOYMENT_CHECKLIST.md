# 🚀 AI Features Deployment Checklist

## Pre-Deployment Verification ✅

### 0. Framework Versions (Updated Dec 3, 2024)
| Package | Version | Status |
|---------|---------|--------|
| Node.js | 20.x LTS | ✅ Specified in `.nvmrc` and `engines` |
| Next.js | 16.0.7 | ✅ Latest stable |
| React | 18.3.1 | ✅ Latest stable |
| TypeScript | 5.9.3 | ✅ Latest stable |

### 1. TypeScript Compilation
- [x] All TypeScript files compile without errors
- [x] No linter warnings in AI modules
- [x] Build succeeds with `npm run build`

### 2. API Routes Verified
| Route | Purpose | Status |
|-------|---------|--------|
| `/api/ai/coach` | Dual-mode AI Chat (Coach + CRM Q&A) | ✅ Ready |
| `/api/ai/daily-coaching` | Get daily coaching insights | ✅ Ready |
| `/api/ai/weekly-insights` | Get weekly performance summary | ✅ Ready |
| `/api/ai/admin-insights` | Admin employee analysis | ✅ Ready |
| `/api/ai/subaccount-insights` | Sub-account AI scoring | ✅ Ready |
| `/api/ai/run-auto-monitor` | CRON: Slipping account detection | ✅ Ready |
| `/api/ai/run-daily-coaching` | CRON: Generate daily coaching | ✅ Ready |
| `/api/notifications` | Employee notifications | ✅ Ready |
| `/api/notifications-admin` | Admin notifications | ✅ Ready |
| `/api/leaderboard` | Team leaderboard | ✅ Ready |
| `/api/streak` | Employee activity streak | ✅ Ready |

### 3. Frontend Components
| Component | Location | Status |
|-----------|----------|--------|
| `AIChatCoach` | `/components/AIChatCoach.tsx` | ✅ Ready |
| `CoachButton` | `/components/CoachButton.tsx` | ✅ Ready |
| `AINotificationsPanel` | `/components/crm/AINotificationsPanel.tsx` | ✅ Ready |
| `EngagementScoreBadge` | `/components/crm/EngagementScoreBadge.tsx` | ✅ Ready |

### 4. AI Core Modules
| Module | Location | Status |
|--------|----------|--------|
| Gemini Client | `/utils/ai.ts` | ✅ Ready |
| Query Engine | `/lib/ai/queryEngine.ts` | ✅ Ready |
| Router | `/lib/ai/router.ts` | ✅ Ready |
| Engagement Scoring | `/lib/ai/engagement.ts` | ✅ Ready |

---

## Database Setup (Run Before Deployment) 📦

### Step 1: Run the Master SQL Script
Run this in **Supabase SQL Editor**:

```
/docs/SETUP_ALL_AI_TABLES.sql
```

This creates all required tables:
- `ai_queries` - AI chat logging
- `employee_notifications` - AI alerts/notifications
- `employee_streaks` - Activity streak tracking
- `engagement_history` - Score trend tracking
- `employee_ai_coaching` - Daily coaching storage

And adds required columns:
- `sub_accounts.ai_insights`
- `sub_accounts.engagement_score`
- `accounts.engagement_score`
- `accounts.ai_engagement_tips`
- `accounts.last_activity_at`

### Step 2: Verify Tables Exist
After running the script, verify with:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'ai_queries', 
    'employee_notifications', 
    'employee_streaks', 
    'engagement_history',
    'employee_ai_coaching'
);
```

Expected result: 5 rows

---

## Environment Variables Required 🔐

Ensure these are set in Vercel (or `.env`):

```env
# Gemini AI (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key
# OR
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional: CRON Security
CRON_SECRET=your_cron_secret
```

---

## Vercel CRON Configuration ⏰

The `vercel.json` is configured with:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-notifications",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/ai/run-daily-coaching",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/ai/run-auto-monitor",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

| CRON Job | Schedule | Purpose |
|----------|----------|---------|
| `generate-notifications` | Daily 9 AM | Generate follow-up reminders |
| `run-daily-coaching` | Daily 9 AM | Generate AI coaching for employees |
| `run-auto-monitor` | Every 6 hours | Detect slipping accounts, escalate |

---

## AI Features Summary 🤖

### For Employees
1. **AI Chat** - Click 🤖 button → Ask questions
   - Coach Mode: Tips, advice, strategies
   - Assistant Mode: CRM data lookups
2. **Notifications Bell** - View AI alerts
3. **Engagement Score Badge** - Click for improvement tips
4. **Weekly Insights** - Performance summary
5. **Daily Coaching** - Personalized daily tips

### For Admins
1. **AI Coaching Dashboard** (`/crm/dashboard`)
   - Team Performance Insights (AI-generated)
   - AI Alerts & Escalations
   - Team Leaderboard
2. **Employee Analysis** - Select employee → Generate AI insights
3. **Critical Escalations** - Auto-escalated by AI

---

## Post-Deployment Testing 🧪

### Test 1: AI Chat Coach
1. Login as employee
2. Click the 🤖 AI Coach button
3. Ask: "How many contacts do I have?"
4. Verify: Response shows database results
5. Switch to Coach mode
6. Ask: "How can I improve?"
7. Verify: Response shows coaching advice

### Test 2: Admin Insights
1. Login as admin
2. Go to `/crm/dashboard`
3. Select an employee
4. Click "Generate Team Insights"
5. Verify: AI analysis appears

### Test 3: Engagement Score
1. View any sub-account
2. Click the engagement score badge
3. Verify: Modal shows improvement tips

### Test 4: Notifications
1. Click notification bell
2. Verify: AI alerts are displayed
3. Click a notification to mark as read

### Test 5: Manual CRON Test (Optional)
```bash
# Test auto-monitor
curl https://your-domain.vercel.app/api/ai/run-auto-monitor

# Test daily coaching
curl https://your-domain.vercel.app/api/ai/run-daily-coaching
```

---

## Troubleshooting 🔧

### "Missing GEMINI_API_KEY"
- Add `GEMINI_API_KEY` or `GOOGLE_GEMINI_API_KEY` to environment variables

### "Table does not exist"
- Run `/docs/SETUP_ALL_AI_TABLES.sql` in Supabase

### "No notifications appearing"
- Check `employee_notifications` table exists
- Verify user has matching `employee` value

### "Engagement score not updating"
- Ensure activities are being logged
- Check `sub_accounts.engagement_score` column exists

### "AI Chat returns generic responses"
- Verify Gemini API key is valid
- Check browser console for errors
- Verify `/api/ai/coach` endpoint is accessible

---

## Success Criteria ✅

Before showing to stakeholders, verify:

- [ ] AI Chat opens and responds
- [ ] Mode toggle works (Coach ↔ Assistant)
- [ ] CRM data queries return real database results
- [ ] Admin dashboard loads with leaderboard
- [ ] AI insights can be generated for employees
- [ ] Notifications panel shows AI alerts
- [ ] Engagement score badges are clickable
- [ ] No console errors in browser

---

**Last Updated:** December 3, 2024
**Version:** 2.0 (Dual-Mode AI Assistant)
