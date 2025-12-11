# YNM Safety - Price Engine & CRM System

A comprehensive full-stack Next.js application for YNM Safety Pvt Ltd, providing a complete Price Engine for quotation management and a full-featured **AI-powered CRM system** for account, customer, lead, and task management.

---

## 🎯 Overview

This application serves as a centralized platform for:

- **Price Engine**: Calculate prices for Metal Beam Crash Barriers (MBCB), Road Signages, and Thermoplastic Paint with intelligent pricing recommendations
- **AI-Powered CRM System**: Manage accounts, customers, leads, contacts, activities with AI-driven insights and coaching
- **Quotation Management**: Create, track, and manage quotations with status updates, history, and outcome tracking
- **Task & Follow-up Management**: Track tasks, follow-ups, and automated notifications
- **Employee Performance Tracking**: Streaks, leaderboards, engagement scoring, and AI coaching
- **Historical Pricing Recall**: Automatically detect and suggest previous pricing for similar configurations
- **AI Pricing Intelligence**: Intelligent pricing recommendations based on historical data and market analysis

---

## 🚀 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | **Next.js 16** (App Router + Turbopack) |
| Language | **TypeScript** (Strict Mode) |
| Styling | **Tailwind CSS** |
| Database | **Supabase** (PostgreSQL) |
| AI | **Google Gemini 2.5** (`@google/generative-ai`) |
| Animations | **Framer Motion** |
| Charts | **Recharts** |
| PDF Generation | **jsPDF** |
| Excel Processing | **xlsx** |
| Caching | **ioredis** (Redis) |

---

## ✨ Key Features

### 💰 Price Engine Modules

#### 1. MBCB (Metal Beam Crash Barriers)
- **W-Beam**: Single W-beam crash barrier pricing
- **Thrie Beam**: Thrie beam crash barrier pricing
- **Double W-Beam**: Double W-beam crash barrier pricing
- Features:
  - Component-based pricing (W-Beam, Post, Spacer)
  - Transportation and installation cost calculations
  - Distance-based pricing using Google Maps API
  - Historical pricing recall
  - AI pricing recommendations

#### 2. Road Signages
- **Reflective Signages**: Circular, Rectangular, Triangular, Octagonal
- Features:
  - Shape-based area calculations
  - Board type and reflectivity options
  - Historical pricing recall
  - AI pricing recommendations

#### 3. Thermoplastic Paint
- Road marking paint pricing
- Area-based calculations
- Material and application costs

### 🤖 AI Features (Powered by Google Gemini 2.5)

#### 1. RAG-Powered Chatbot
A comprehensive natural language interface for querying CRM data using conversational AI.

- **Component**: `components/RAGChatInterface.tsx`
- **API Endpoint**: `/api/ai/rag-chat`
- **Features**:
  - Natural language queries in plain English
  - Two modes:
    - **COACH Mode**: Get strategic coaching and advice
    - **QUERY Mode**: Query CRM data with natural language
  - Streaming responses for real-time updates
  - Query suggestions based on your data
  - Report generation (CSV, JSON, Markdown, PDF)
  - Conversation memory for follow-up questions
  - Smart query caching for performance
  - SQL transparency (view generated queries)
  - Export options for all query results

**Documentation**: See `docs/AI_FEATURES.md` for comprehensive guide  
**Example Queries**: See `docs/EXAMPLE_QUERIES.md` for query examples

#### 2. AI Pricing Intelligence
Intelligent pricing recommendations based on historical data, market analysis, and business rules.

- **Features**:
  - Historical learning system
  - Pricing recommendation engine
  - Win probability predictions (0-100%)
  - Confidence scoring
  - Competitive benchmarking
  - Margin analysis
  - Feedback loop for continuous improvement

**Documentation**: See `docs/AI_PRICING.md` for detailed guide

#### 3. Historical Pricing Recall
Automatically detects when users enter product specifications that match previous quotations and suggests previous pricing.

- **Features**:
  - Automatic matching based on product specifications
  - Shows previous price, date, and AI insights
  - One-click application of historical pricing
  - Integrated into all price engine forms
  - Supports MBCB and Signages products

**Documentation**: See `HISTORICAL_RECALL_IMPLEMENTATION.md`

#### 4. AI Coach
- **Endpoint**: `/api/ai/coach`
- Context-aware coaching based on user's recent activities
- Role-specific advice (Admin vs Employee)
- Suggested actions with tone indicators
- Considers streak, leaderboard position, and weak account alerts

#### 5. Engagement Scoring
- **Endpoint**: `/api/ai/subaccount-insights`
- AI-driven engagement score (0-100) for each sub-account
- Actionable improvement tips
- Automatic score history tracking
- Employee notifications for low engagement

#### 6. Admin Insights
- **Endpoint**: `/api/ai/admin-insights`
- Employee performance analysis
- Strengths and weaknesses identification
- Coaching advice for managers
- Priority account recommendations

#### 7. Weekly Insights
- **Endpoint**: `/api/ai/weekly-insights`
- 7-day performance summary
- Top opportunities identification
- Improvement area recommendations

#### 8. Daily Coaching
- **Endpoint**: `/api/ai/daily-coaching`
- Daily motivational messages
- Strengths and weaknesses analysis
- Actionable recommendations
- Priority accounts identification

#### 9. AI Monitoring Dashboard
- **Page**: `/admin/ai-monitoring`
- System health metrics
- Query performance tracking
- AI accuracy monitoring
- Error rate tracking
- User engagement metrics
- Real-time analytics

### 📊 CRM Features

#### Account Management
- Full CRUD operations for accounts
- Sub-account management with engagement scoring
- Account assignment to sales employees
- Account hierarchy and relationships
- Bulk import from Excel
- Account analytics and insights

#### Customer Management
- Customer profiles with contact information
- Customer assignment to sales employees
- Customer history and activity tracking
- Related accounts and sub-accounts

#### Lead Management
- Lead creation and tracking
- Priority levels (High, Medium, Low)
- Lead status workflow
- Lead scoring
- Conversion tracking

#### Contact Management
- Contact person profiles
- Multiple contacts per account
- Contact roles and responsibilities
- Communication history

#### Task Management
- Task creation and assignment
- Task status tracking (Pending, In Progress, Completed)
- Task priority levels
- Due date management
- Task history and comments

#### Activity Tracking
- Comprehensive activity logging
- Activity types: Call, Follow-up, Meeting, Email, etc.
- Activity history timeline
- Activity-based streak tracking
- Employee activity analytics

### 📈 Gamification Features

#### Streak System
- Tracks consecutive days of activity
- Resets if user misses a day
- Motivational messages based on streak length
- Only counts meaningful activities (excludes login/logout)

#### Leaderboard
- **Scoring Formula**: `(calls×1) + (followups×2) + (closedWon×5) + (streak×1.5)`
- Configurable time period (default: 30 days)
- Shows: score, calls, followups, closed won, streak, total activities
- Real-time updates

#### Engagement Score Badge
- Color-coded: Red (0-25), Yellow (26-50), Orange (51-75), Green (76-100)
- Click to see improvement tips with potential points
- Interactive modal with progress tracking

#### Celebrations
- Confetti animation for achievements
- Toast notifications for milestones
- Visual feedback for positive actions

### 📋 Quotation Management

#### Quotation Features
- Create quotations for MBCB, Signages, and Paint
- Save and retrieve quotations
- Quotation status tracking (Draft, Sent, Accepted, Rejected)
- Status history with timestamps
- Comments and notes
- PDF generation
- Quotation history view

#### Outcome Tracking
- Track quotation outcomes: Won, Lost, or Pending
- Outcome notes for context
- Automatic closed date tracking
- Analytics integration for win rate analysis
- AI learning from outcomes

**Documentation**: See `QUOTATION_OUTCOME_TRACKING_IMPLEMENTATION.md`

### 🔔 Notification System

#### Features
- Employee notifications for follow-ups and tasks
- Admin notifications for critical alerts
- AI-generated coaching notifications
- Low engagement alerts
- Notification center with filtering
- Read/unread status tracking
- Auto-generation via cron jobs

### 📊 Analytics & Reporting

#### Dashboard
- Real-time performance metrics
- Activity summaries
- Engagement trends
- Win rate analytics
- Employee performance comparisons

#### Report Generation
- Convert query results to professional reports
- Executive summaries
- Detailed analysis reports
- Action items with priorities
- Export as Markdown or PDF
- Company branding included

---

## 📁 Project Structure

```
/
├── app/                              # Next.js App Router
│   ├── (system)/                     # System routes (bypass auth)
│   │   └── api/ai/run-auto-monitor/  # Cron AI monitoring endpoint
│   │
│   ├── api/                          # API routes
│   │   ├── accounts/                 # Accounts CRUD & related data
│   │   ├── activities/               # Activity logging & history
│   │   ├── admin/                    # Admin utilities
│   │   │   ├── bulk-add-accounts/    # Bulk account import
│   │   │   ├── import-accounts-excel/# Excel import
│   │   │   ├── normalize-ids/        # ID normalization
│   │   │   └── reset-sequences/      # Sequence reset
│   │   ├── ai/                       # 🤖 AI endpoints (Gemini-powered)
│   │   │   ├── admin-insights/       # Admin performance insights
│   │   │   ├── coach/                # AI Coach chat
│   │   │   ├── daily-coaching/       # Daily coaching tips
│   │   │   ├── generate-report/      # Report generation
│   │   │   ├── query-suggestions/    # Query suggestions
│   │   │   ├── rag-chat/             # RAG chatbot endpoint
│   │   │   ├── run-daily-coaching/   # Cron: generate daily coaching
│   │   │   ├── subaccount-insights/  # Sub-account AI scoring
│   │   │   └── weekly-insights/      # Weekly performance insights
│   │   ├── auth/                     # Authentication
│   │   │   ├── login/                # Login endpoint
│   │   │   ├── logout/               # Logout with reason tracking
│   │   │   ├── change-password/      # Password reset
│   │   │   └── user-status/          # User status tracking
│   │   ├── cron/                     # Scheduled tasks
│   │   │   └── generate-notifications/ # Auto-generate follow-up notifications
│   │   ├── crm/                      # CRM modules
│   │   │   ├── accounts/             # Account management
│   │   │   ├── customers/            # Customer management
│   │   │   ├── dashboard/            # Dashboard data
│   │   │   ├── employees/            # Employee list
│   │   │   ├── leads/                # Lead management
│   │   │   └── tasks/                # Task management
│   │   ├── engagement-history/       # Engagement score history
│   │   ├── leaderboard/              # Employee leaderboard
│   │   ├── notifications/            # Notification CRUD
│   │   ├── notifications-admin/      # Admin notifications
│   │   ├── quotes/                   # Quotation endpoints
│   │   │   ├── historical-lookup/    # Historical pricing lookup
│   │   │   └── outcome/              # Outcome tracking
│   │   ├── streak/                   # Employee streak tracking
│   │   └── subaccounts/              # Sub-account management
│   │
│   ├── crm/                          # CRM pages
│   │   ├── accounts/                 # Accounts list & detail
│   │   │   ├── [id]/                 # Account detail page
│   │   │   │   └── sub-accounts/     # Sub-accounts page
│   │   │   └── page.tsx              # Accounts list
│   │   ├── activities/               # Activities page
│   │   ├── admin/                    # Admin pages
│   │   │   ├── contacts/             # Contact admin
│   │   │   └── subaccounts/          # Sub-account admin
│   │   ├── contacts/                 # Contacts page
│   │   ├── customers/                # Customer management
│   │   ├── dashboard/                # Dashboard
│   │   ├── leads/                    # Leads management
│   │   ├── notifications/            # Notifications center
│   │   ├── subaccounts/              # Sub-account pages
│   │   │   └── [id]/                 # Sub-account detail
│   │   └── tasks/                    # Task manager
│   │
│   ├── mbcb/                         # MBCB module pages
│   │   ├── double-w-beam/            # Double W-Beam
│   │   ├── thrie/                    # Thrie Beam
│   │   └── w-beam/                   # W-Beam
│   ├── paint/                        # Paint module
│   ├── signages/                     # Signages module
│   │   └── reflective/               # Reflective Part
│   ├── home/                         # Home page
│   ├── login/                        # Login page
│   ├── change-password/              # Password change
│   ├── history/                      # Quotation history
│   ├── quotation-status/            # Quotation status (Admin)
│   ├── quotation-status-update/      # Status update (Employee)
│   └── layout.tsx                    # Root layout
│
├── components/                       # React components
│   ├── RAGChatInterface.tsx          # 🤖 RAG-powered chatbot interface
│   ├── DataResultTable.tsx           # Data table with report generation
│   ├── AIChatCoach.tsx               # 🤖 AI Coach sidebar
│   ├── CoachButton.tsx               # AI Coach trigger button
│   ├── animations/                   # Animation components
│   │   ├── FloatingMascot.tsx
│   │   ├── GlobalLoader.tsx
│   │   ├── LandingAnimation.tsx
│   │   ├── PageTransition.tsx
│   │   └── ParticleBackground.tsx
│   ├── crm/                          # CRM components
│   │   ├── activities/               # Activity components
│   │   ├── tasks/                    # Task components
│   │   ├── AINotificationsPanel.tsx  # 🤖 AI notifications panel
│   │   ├── CelebrationEffect.tsx     # Achievement celebrations
│   │   ├── CelebrationToast.tsx      # Toast notifications
│   │   ├── EngagementScoreBadge.tsx  # Score badge with tips
│   │   └── NotificationsBell.tsx     # Notification bell
│   ├── forms/                        # Form components
│   │   ├── AccountSelect.tsx
│   │   ├── ContactSelect.tsx
│   │   ├── CustomerSelect.tsx
│   │   ├── SmartDropdown.tsx         # Main dropdown component
│   │   ├── StateCitySelect.tsx
│   │   └── SubAccountSelect.tsx
│   ├── layout/                       # Layout components
│   │   ├── AuthGuard.tsx             # Authentication guard
│   │   ├── ClientLayout.tsx          # Client-side layout
│   │   ├── CRMLayout.tsx             # CRM layout wrapper
│   │   ├── CRMSidebar.tsx            # CRM sidebar navigation
│   │   └── LogoutButton.tsx          # Logout with reason modal
│   ├── modals/                       # Modal components
│   │   └── InactivityReasonModal.tsx # Inactivity reason capture
│   ├── pricing/                      # Pricing components
│   │   └── HistoricalPricingAlert.tsx # Historical pricing alert
│   ├── quotations/                   # Quotation components
│   │   └── QuotationOutcomePanel.tsx # Outcome tracking panel
│   └── ui/                           # UI components
│       ├── ButtonCard.tsx            # Card button component
│       ├── ButtonCarousel.tsx        # Carousel component
│       └── NotificationBell.tsx      # Global notification bell
│
├── contexts/                         # React contexts
│   └── UserContext.tsx               # User context provider
│
├── hooks/                            # Custom React hooks
│   ├── useAIPricing.ts               # AI pricing hook
│   ├── useDebounce.ts
│   └── useFollowUpNotifications.ts
│
├── lib/                              # Library code
│   ├── ai/                           # 🤖 AI utilities
│   │   ├── ragEngine.ts              # RAG engine (query execution & AI responses)
│   │   ├── ragEngineStreaming.ts     # Streaming RAG engine
│   │   ├── intentClassifier.ts       # Intent classification
│   │   ├── dynamicQueryBuilder.ts    # SQL query generation
│   │   ├── queryCache.ts             # Smart query caching
│   │   ├── querySuggestions.ts       # Personalized query suggestions
│   │   ├── conversationRouterV2.ts   # COACH vs QUERY mode routing
│   │   ├── conversationMemory.ts    # Conversation history
│   │   ├── sessionManager.ts        # Session management
│   │   ├── contextFormatter.ts       # Data formatting for AI
│   │   ├── monitoring.ts             # AI operation logging
│   │   ├── databaseSchemaContext.ts  # Database schema metadata
│   │   ├── engagement.ts             # Engagement scoring & AI logic
│   │   └── engagementGuard.ts        # Activity type guards
│   ├── calculations/                 # Price calculations
│   │   ├── areaCalculations.ts
│   │   ├── postCalculations.ts
│   │   ├── thrieBeamCalculations.ts
│   │   └── wBeamCalculations.ts
│   ├── constants/
│   │   └── types.ts                  # Type definitions
│   ├── services/                     # Service layer
│   │   └── historicalQuoteLookup.ts  # Historical pricing lookup
│   ├── utils/
│   │   ├── activityLogger.ts         # Activity + streak logging
│   │   ├── dateFormatters.ts         # IST date formatting
│   │   ├── leadScore.ts              # Lead scoring
│   │   ├── notificationSync.ts       # Notification sync
│   │   ├── performanceUtils.ts       # Performance utilities
│   │   └── supabaseClient.ts         # Supabase client
│   └── pdfGenerator.ts               # PDF generation
│
├── docs/                             # Documentation & SQL
│   ├── COMPLETE_DATABASE_SETUP.sql   # ⭐ Main database setup
│   ├── AI_FEATURES.md                # 🤖 Comprehensive AI features guide
│   ├── AI_PRICING.md                 # 💰 AI pricing intelligence guide
│   ├── EXAMPLE_QUERIES.md            # 📝 Example queries for RAG chatbot
│   ├── ADD_AI_PRICING_FIELDS_TO_QUOTES.sql # AI pricing fields migration
│   ├── ADD_OUTCOME_TRACKING_FIELDS.sql     # Outcome tracking migration
│   └── [other SQL migrations...]
│
├── middleware.ts                     # Next.js middleware
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
└── README.md                         # This file
```

---

## 🔐 Environment Variables

Create `.env.local` with:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required - AI (Google Gemini)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Required - Google Maps (for distance calculation in MBCB price engine)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Optional - Cron Security
CRON_SECRET=your_cron_secret

# Optional - Redis (for caching)
REDIS_URL=your_redis_url
```

---

## 👥 User Roles & Permissions

| Role | Access Level |
|------|--------------|
| **Admin** | Full access to all accounts, quotations, leads, AI insights, and price engine |
| **Data Analyst** | View all accounts (no delete), no leads, no price engine access |
| **Sales Employee** | Access only to assigned accounts, full price engine access |

### Test Users
```
ADMIN PORTAL:
  Admin / Admin@123

DATA ANALYSTS (Admin Portal with restrictions):
  DataAnalyst_SwamyMahesh / SwamyMahesh@123
  DataAnalyst_Mahesh / Mahesh@123

SALES EMPLOYEES (Employee Portal):
  Sales_Shweta / Shweta@123
  Sales_Saumya / Saumya@123
  Sales_Nagender / Nagender@123
  Sales_Abhijeet / Abhijeet@123
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Supabase account
- Google Gemini API key
- Google Maps API key (for distance calculation)

### Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd "price engine ysm"

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Run database setup in Supabase SQL Editor
# Execute: docs/COMPLETE_DATABASE_SETUP.sql

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

---

## 📝 API Quick Reference

### AI Endpoints (Gemini-Powered)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/rag-chat` | RAG chatbot (natural language queries) |
| POST | `/api/ai/rag-chat?stream=true` | Streaming RAG chatbot |
| POST | `/api/ai/generate-report` | Generate professional reports from data |
| POST | `/api/ai/query-suggestions` | Get personalized query suggestions |
| POST | `/api/ai/coach` | AI coaching chat |
| GET | `/api/ai/admin-insights?employeeUsername=X` | Admin insights |
| GET | `/api/ai/subaccount-insights?subAccountId=X` | Sub-account scoring |
| GET | `/api/ai/weekly-insights?employee=X` | Weekly insights |
| GET | `/api/ai/daily-coaching?employee=X` | Daily coaching |
| GET | `/api/admin/ai-monitoring` | AI monitoring dashboard data |

### Quotation Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/quotes/historical-lookup` | Lookup historical pricing |
| PATCH | `/api/quotes/outcome` | Update quotation outcome |
| GET | `/api/quotes/outcome?quoteId=X&productType=Y` | Get quotation outcome |

### Cron Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cron/generate-notifications` | Generate notifications |
| GET | `/(system)/api/ai/run-auto-monitor` | AI monitoring scan |

### Core Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List accounts |
| GET | `/api/subaccounts?account_id=X` | List sub-accounts |
| GET | `/api/notifications?employee=X` | Get notifications |
| GET | `/api/streak?employee=X` | Get streak data |
| GET | `/api/leaderboard?days=30` | Get leaderboard |

---

## 🗄️ Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User authentication |
| `accounts` | Company accounts |
| `sub_accounts` | Sub-accounts with engagement scores |
| `contacts` | Contact persons |
| `activities` | Activity log |
| `employee_streaks` | Streak tracking |
| `employee_notifications` | AI & system notifications |
| `employee_ai_coaching` | Daily coaching data |
| `engagement_history` | Score snapshots |
| `leads` | Lead management |
| `tasks` | Task tracking |
| `quotes_mbcb` | MBCB quotations |
| `quotes_signages` | Signages quotations |
| `quotes_paint` | Paint quotations |
| `pricing_outcomes` | Quotation outcome tracking |
| `pricing_learning_stats` | AI learning statistics |
| `ai_sessions` | AI conversation sessions |
| `ai_queries` | AI query history |
| `ai_conversation_history` | Conversation history |

### AI Pricing Fields (All Quote Tables)
- `competitor_price_per_unit` - Competitor pricing for comparison
- `client_demand_price_per_unit` - Client's requested/expected price
- `ai_suggested_price_per_unit` - AI-generated optimal price recommendation
- `ai_win_probability` - AI-calculated win probability (0-100)
- `ai_pricing_insights` - Structured JSON containing AI reasoning

### Outcome Tracking Fields (All Quote Tables)
- `outcome_status` - ENUM ('pending', 'won', 'lost')
- `outcome_notes` - Optional context about the outcome
- `closed_at` - Auto-set when marking won/lost

---

## 🔧 Latest Updates & Implementations

### ✅ Recent Features (December 2024)

1. **Historical Pricing Recall**
   - Automatic detection of matching previous quotations
   - One-click application of historical pricing
   - Integrated into all price engine forms
   - See `HISTORICAL_RECALL_IMPLEMENTATION.md`

2. **Quotation Outcome Tracking**
   - Track won/lost/pending outcomes
   - Analytics integration
   - AI learning from outcomes
   - See `QUOTATION_OUTCOME_TRACKING_IMPLEMENTATION.md`

3. **AI Pricing Intelligence**
   - Intelligent pricing recommendations
   - Win probability predictions
   - Historical learning system
   - See `docs/AI_PRICING.md`

4. **RAG Chatbot Enhancements**
   - Streaming responses
   - Query suggestions
   - Report generation
   - Enhanced conversation memory

5. **Performance Optimizations**
   - Query caching
   - Database indexing
   - Optimized API responses

### ✅ System Status (December 2024)

| System | Status | Notes |
|--------|--------|-------|
| TypeScript Compilation | ✅ 0 errors | All files compile cleanly |
| Next.js Build | ✅ Success | Compiled with Turbopack |
| Middleware Config | ✅ Correct | Properly whitelists cron/AI routes |
| AI Integration (Gemini) | ✅ Working | All AI features powered by Gemini 2.5 |
| Cron System | ✅ Working | Notification generation + AI monitoring |
| Streak System | ✅ Working | Activity-based streak tracking |
| Leaderboard | ✅ Working | Weighted scoring algorithm |
| Engagement Scoring | ✅ Working | AI-driven score calculation |
| Notifications | ✅ Working | Employee + Admin notifications |
| Historical Pricing | ✅ Working | Integrated into all forms |
| Outcome Tracking | ✅ Working | Full analytics support |

---

## 🐛 Troubleshooting

### Common Issues

1. **TypeScript Errors**: Run `npx tsc --noEmit` to check
2. **Build Fails**: Ensure all env variables are set
3. **AI Not Working**: Verify `GOOGLE_GEMINI_API_KEY` is set correctly
4. **Database Errors**: Run latest migration scripts in `docs/`
5. **Historical Pricing Not Showing**: Check that previous quotes exist with matching specs
6. **Outcome Tracking Not Saving**: Verify database migration has been run

### Database Migrations

Run migrations in order:
1. `docs/COMPLETE_DATABASE_SETUP.sql` - Main setup
2. `docs/ADD_AI_PRICING_FIELDS_TO_QUOTES.sql` - AI pricing fields
3. `docs/ADD_OUTCOME_TRACKING_FIELDS.sql` - Outcome tracking

---

## 📚 Documentation

### Main Documentation Files
- `docs/AI_FEATURES.md` - Comprehensive AI features guide
- `docs/AI_PRICING.md` - AI pricing intelligence guide
- `docs/EXAMPLE_QUERIES.md` - Example queries for RAG chatbot
- `PROJECT_STRUCTURE.md` - Detailed project structure guide
- `HISTORICAL_RECALL_IMPLEMENTATION.md` - Historical pricing feature
- `QUOTATION_OUTCOME_TRACKING_IMPLEMENTATION.md` - Outcome tracking feature

### Implementation Summaries
- `AI_PRICING_IMPLEMENTATION_SUMMARY.md`
- `HISTORICAL_RECALL_IMPLEMENTATION.md`
- `QUOTATION_OUTCOME_TRACKING_IMPLEMENTATION.md`

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 📄 License

Proprietary - YNM Safety Pvt Ltd

---

## 📞 Support

For questions or issues:
- Review the documentation in `docs/`
- Check implementation summaries for specific features
- Review code comments in each file
- Test API endpoints using the examples in documentation

---

**Version**: 2.0.0 (AI-Enhanced CRM with Pricing Intelligence)  
**Last Updated**: December 2024  
**Last Audit**: December 2024 - All systems verified ✅  
**AI Provider**: Google Gemini 2.5 (models/gemini-2.5-pro, models/gemini-2.5-flash)  
**Node Version**: >=20.0.0

---

## 🎉 Acknowledgments

Built with ❤️ for YNM Safety Pvt Ltd
