# 🤖 YSM CRM - AI Features Overview

## For Director/Management Review

---

## 🎯 What Does the AI Do?

The CRM uses **Google Gemini AI** to help your sales team work smarter. Here's what it does:

---

## 📊 Feature 1: Smart Engagement Scoring (0-100)

**What it is:** Every account/sub-account gets an AI-calculated engagement score.

**How it works:**
- AI analyzes all activities (calls, notes, quotations, follow-ups)
- Scores range from 0 (poor) to 100 (excellent)
- Color-coded badges: 🔴 Red (0-25) → 🟡 Yellow (26-50) → 🟠 Orange (51-75) → 🟢 Green (76-100)

**Business Value:**
- Instantly see which accounts need attention
- Prioritize follow-ups based on data, not gut feeling
- Prevent accounts from going cold

**Where to see it:** Click any account → See the colored score badge → Click for improvement tips

---

## 💬 Feature 2: AI Sales Coach Chatbot

**What it is:** A ChatGPT-like assistant that knows your CRM data.

**What employees can ask:**
- "How can I improve my performance this week?"
- "Which accounts need attention?"
- "Give me tips to close more deals"
- "Why is my engagement score low?"

**What admins can ask:**
- "How is [employee name] performing?"
- "Which accounts are at risk?"
- "What should the team focus on?"

**Business Value:**
- 24/7 coaching available
- Personalized advice based on actual data
- Reduces management overhead for routine questions

**Where to find it:** 🤖 Floating button in bottom-right corner of every page

---

## 📅 Feature 3: Weekly AI Insights

**What it is:** AI-generated weekly performance summary for each employee.

**What it shows:**
- Week overview (activities, calls, quotations)
- Top opportunity/win of the week
- Area to focus on next week

**Business Value:**
- Replace manual weekly reports
- Consistent performance feedback
- Data-driven goal setting

**Where to see it:** Dashboard → "Your Weekly AI Summary" → Click "Generate"

---

## 💪 Feature 4: Daily AI Coaching

**What it is:** Personalized daily tips and motivation.

**What it shows:**
- Motivational message
- Today's recommended actions
- Priority accounts to focus on

**Business Value:**
- Employees start each day with clear priorities
- Reduces decision fatigue
- Keeps team motivated

**Where to see it:** Dashboard → "Today's AI Coaching" → Click "Get Daily Coaching"

---

## 🔔 Feature 5: Smart Alerts & Escalations

**What it is:** AI automatically monitors all accounts and creates alerts.

**Alert types:**
| Priority | Meaning |
|----------|---------|
| ⚪ Low | Minor attention needed |
| 🔵 Normal | Follow-up recommended |
| 🟠 High | Urgent action required |
| 🔴 Critical | Immediate escalation needed |

**Escalation Rules:**
- 3+ alerts in 7 days → Auto-escalates to admin
- Score drops below 40 → Admin notified
- No activity in 30 days → Warning generated

**Business Value:**
- No account falls through the cracks
- Admins see problems before they become crises
- Automated monitoring reduces oversight burden

**Where to see it:** 
- Employees: Bell icon → Notifications
- Admins: Dashboard → "AI Alerts & Escalations"

---

## 🏆 Feature 6: Team Leaderboard

**What it is:** Real-time performance rankings with AI-weighted scoring.

**Scoring Formula:**
| Activity | Points |
|----------|--------|
| Closed Won | 20 |
| Quotation | 15 |
| Follow-up | 10 |
| Call | 5 |
| Note | 3 |
| Streak Bonus | +2 per day |

**Business Value:**
- Gamification increases engagement
- Transparent performance metrics
- Healthy competition

**Where to see it:** Dashboard → "Team Leaderboard"

---

## 👨‍💼 Feature 7: Admin AI Analysis

**What it is:** Admin can generate AI reports for any employee.

**Report includes:**
- Performance summary
- Strengths identified
- Weaknesses/gaps
- Specific coaching advice
- Accounts that need focus

**Business Value:**
- Data-backed performance reviews
- Objective assessments
- Actionable coaching plans

**Where to see it:** Admin Dashboard → Select Employee → "Generate AI Report"

---

## 🔄 How AI Runs

| Feature | Trigger | Frequency |
|---------|---------|-----------|
| Engagement Scoring | After any activity | Real-time |
| Slipping Alerts | CRON job | Every 6 hours |
| Weekly Insights | On demand | User clicks button |
| Daily Coaching | On demand | User clicks button |
| Admin Analysis | On demand | Admin clicks button |

---

## 💰 Business Impact Summary

| Before AI | After AI |
|-----------|----------|
| Manual account tracking | Automated engagement scores |
| Accounts going cold | Proactive alerts before problems |
| Generic coaching | Personalized AI advice |
| Weekly status meetings | AI-generated reports |
| Subjective performance reviews | Data-driven analysis |

---

## 🚀 Quick Demo Flow

1. **Login as Employee**
2. **Go to Dashboard** → See your streak, rank, AI insights
3. **Click "Generate Weekly Insights"** → Show AI analysis
4. **Click 🤖 button** → Ask "How can I improve?"
5. **Go to Accounts** → Click any account → Show engagement score badge
6. **Click the score** → Show improvement tips

---

## 📞 Questions?

The AI system is powered by **Google Gemini** (same technology as Google's AI).

All data stays within your Supabase database - AI only analyzes, it doesn't store your data externally.

---

**Version:** 2.0  
**Last Updated:** December 2024  
**AI Provider:** Google Gemini 2.5 (models/gemini-2.5-pro, models/gemini-2.5-flash)
