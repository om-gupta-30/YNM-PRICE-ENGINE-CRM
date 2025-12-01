# YNM Safety - Price Engine & CRM System

A comprehensive full-stack Next.js application for YNM Safety Pvt Ltd, providing a complete Price Engine for quotation management and a full-featured CRM system for account, customer, lead, and task management.

## 🎯 Purpose

This application serves as a centralized platform for:
- **Price Engine**: Calculate prices for Metal Beam Crash Barriers (MBCB), Road Signages, and Thermoplastic Paint
- **CRM System**: Manage accounts, customers, leads, contacts, activities, and track engagement
- **Quotation Management**: Create, track, and manage quotations with status updates and history
- **Task & Follow-up Management**: Track tasks, follow-ups, and notifications

## 🚀 Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend database and authentication
- **Framer Motion** - Animation library
- **next-themes** - Dark/light mode support
- **pdfmake** - PDF generation for quotations
- **xlsx** - Excel file processing
- **Recharts** - Data visualization and charts

## 📁 Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── accounts/             # Accounts CRUD & related data
│   │   ├── auth/                 # Authentication (login, password reset)
│   │   ├── crm/                  # CRM modules (customers, leads, tasks, dashboard)
│   │   ├── contacts/             # Contacts management
│   │   ├── meta/                 # Metadata endpoints (customers, places)
│   │   ├── notifications/        # Notifications system
│   │   ├── quotes/               # Quotation endpoints (status, comments, history)
│   │   └── quotations/           # Quotation status summary
│   ├── crm/                      # CRM pages
│   │   ├── accounts/             # Accounts management
│   │   ├── customers/            # Customer management
│   │   ├── dashboard/            # Dashboard (Admin & Employee)
│   │   ├── leads/                # Leads management
│   │   ├── notifications/        # Notifications center
│   │   └── tasks/                # Task manager
│   ├── history/                  # Quotation history page
│   ├── login/                    # Login page
│   ├── mbcb/                     # MBCB module pages
│   │   ├── double-w-beam/        # Double W-Beam page
│   │   ├── thrie/                # Thrie Beam page
│   │   └── w-beam/               # W-Beam page
│   ├── paint/                    # Paint module page
│   ├── quotation-status/         # Admin quotation status view
│   ├── quotation-status-update/  # Employee quotation status update
│   ├── signages/                 # Signages module pages
│   │   └── reflective/           # Reflective Part page
│   ├── change-password/          # Password reset page
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
│
├── components/                   # React components
│   ├── animations/                # Animation components
│   │   ├── FloatingMascot.tsx
│   │   ├── GlobalLoader.tsx
│   │   ├── LandingAnimation.tsx
│   │   └── PageTransition.tsx
│   ├── crm/                      # CRM-specific components
│   │   ├── ActivityTimeline.tsx  # Activity history timeline
│   │   ├── ContactFormModal.tsx  # Contact add/edit modal
│   │   ├── NotificationsBell.tsx # Notifications bell icon
│   │   └── QuotationStatusChart.tsx # Pie chart component
│   ├── forms/                    # Form components
│   │   ├── CustomerSelect.tsx    # Customer dropdown (read-only)
│   │   └── SmartDropdown.tsx     # Smart autocomplete dropdown
│   ├── layout/                   # Layout components
│   │   ├── AuthGuard.tsx
│   │   ├── ClientLayout.tsx
│   │   ├── Footer.tsx
│   │   ├── GlobalBackground.tsx
│   │   ├── LogoutButton.tsx
│   │   ├── Navbar.tsx
│   │   └── ThemeProvider.tsx
│   ├── modals/                   # Modal components
│   │   ├── DeleteConfirmationModal.tsx
│   │   ├── QuotationDetailsModal.tsx
│   │   └── StatusHistoryModal.tsx
│   ├── ui/                       # UI components
│   │   ├── BackButton.tsx
│   │   ├── ButtonCard.tsx
│   │   ├── ButtonCarousel.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── Toast.tsx
│   └── utils/                    # Utility components
│
├── contexts/                     # React contexts
│   └── UserContext.tsx           # User context provider
│
├── data/                         # Data files
│   ├── config/                   # Configuration data
│   │   ├── msAngleOptions.ts
│   │   └── msPipeOptions.ts
│
├── docs/                         # Documentation & SQL scripts
│   ├── COMPLETE_DATABASE_SETUP.sql  # Complete database setup (run this first!)
│   ├── ACCOUNTS_DATABASE_SCHEMA.sql  # Accounts module schema
│   ├── ACCOUNTS_EXTENDED_SCHEMA.sql  # Accounts extended (contacts, activities, notifications)
│   ├── CRM_DATABASE_SCHEMA.sql       # CRM module schema
│   ├── ADD_QUOTATION_STATUS.sql      # Quotation status fields
│   ├── ADD_COMMENTS_TO_QUOTATIONS.sql # Comments fields
│   ├── ADD_QUOTATION_HISTORY.sql     # History tracking
│   ├── ADD_SALES_EMPLOYEE_TO_CUSTOMERS.sql # Sales employee assignment
│   ├── CREATE_SIMPLE_USERS.sql       # User creation
│   ├── UPDATE_TO_SIMPLE_USERS.sql    # User migration
│   └── UPDATE_SUPABASE_TABLES_COMPLETE.sql # Complete table updates
│
├── lib/                          # Library code
│   ├── constants/                # Constants and types
│   │   └── types.ts              # TypeScript type definitions
│   └── utils/                    # Utility functions
│       ├── pdfGeneratorYNMEST.ts # YNM Estimate PDF generator
│       └── supabaseClient.ts     # Supabase client
│
├── public/                       # Static assets
│
└── README.md                     # This file
```

## 🗄️ Database Schema

### Core Tables

- **users** - User authentication (Admin, Employee1-3)
- **places_of_supply** - 28 Indian states
- **purposes** - Purpose options for quotations
- **customers** - Customer information with CRM fields
- **accounts** - Company accounts with engagement scoring
- **contacts** - Contacts under each account
- **activities** - Activity tracking and history
- **leads** - Lead management
- **tasks** - Task and follow-up management
- **notifications** - Notification system
- **quotes_mbcb** - MBCB quotations
- **quotes_signages** - Signages quotations
- **quotes_paint** - Paint quotations

### Key Features

- **Engagement Score**: Automated scoring based on activities
- **Activity Tracking**: Complete audit trail of all interactions
- **Status History**: Track quotation status and comment changes
- **Notifications**: Follow-up alerts and reminders
- **Role-Based Access**: Admin vs Employee permissions

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "price engine ysm"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Copy your Supabase URL and anon key
   - Create `.env.local` file:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run database setup**
   - Open Supabase SQL Editor
   - Run `docs/COMPLETE_DATABASE_SETUP.sql`
   - This creates all tables, constraints, and initial data

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   - Navigate to `http://localhost:3000`
   - Login with:
     - Admin: `Admin` / `Admin@123`
     - Employee1: `Employee1` / `Employee1@123`
     - Employee2: `Employee2` / `Employee2@123`
     - Employee3: `Employee3` / `Employee3@123`

## 👥 User Roles & Permissions

### Admin
- Full access to all accounts, customers, leads, and quotations
- Can view all employee data
- Can delete accounts
- Can assign customers to employees
- Dashboard shows company-wide metrics

### Employee (Employee1, Employee2, Employee3)
- Access only to assigned customers and accounts
- Can create quotations for assigned customers
- Can update quotation status and comments
- Can view own quotation history
- Cannot delete accounts
- Dashboard shows personal metrics

## 📊 Features

### Price Engine Module

#### MBCB (Metal Beam Crash Barriers)
- **W-Beam**: Calculate weights and prices for W-beam barriers
- **Thrie Beam**: Calculate weights and prices for Thrie-beam barriers
- **Double W-Beam**: Calculate weights and prices for Double W-beam barriers
- Features:
  - Material cost calculation
  - Transportation cost
  - Installation cost
  - Fastener options (Hex bolts, Button bolts)
  - PDF generation

#### Signages
- **Reflective Part**: Calculate prices for reflective signages
- **MS Part**: Calculate prices for MS (Mild Steel) components
- Features:
  - Board specifications
  - MS angle and pipe options
  - Area-based pricing
  - Combined reflective + MS pricing

#### Paint
- **Thermoplastic Paint**: Calculate prices for road marking paint
- Features:
  - Area-based calculation
  - Cost per square foot
  - Profit margin calculation

### CRM Module

#### Accounts Management
- Create and manage company accounts
- **Company Stages**: Enterprise, SMB, Pan India, APAC, Middle East & Africa, Europe, North America, LATAM_SouthAmerica
- **Company Tags**: New, Prospect, Customer, Onboard, Lapsed, Needs Attention, Retention, Renewal, Upselling
- **Engagement Score**: Automated scoring based on activities
- Account details with tabs: Overview, Contacts, Leads, Quotations, Tasks, Activities

#### Contacts Management
- Manage contacts under each account
- **Call Status Tracking**: Connected, DNP, ATCBL, Unable to connect, Number doesn't exist, Wrong number
- **Follow-up Scheduling**: Google Calendar integration for ATCBL
- Activity history per contact

#### Leads Management
- Create and track leads
- **Lead Status**: New → In Progress → Quotation Sent → Follow-up → Closed / Lost
- Convert leads to customers
- Link leads to accounts

#### Task Management
- Create tasks: Follow-up, Meeting, Call
- **Task Status**: Pending, In Progress, Completed, Cancelled
- Due date tracking
- Quick stats: Tasks due today, Overdue, Pending follow-ups

#### Activity Tracking
- Complete activity history
- **Activity Types**: Call, Note, Follow-up, Quotation, Email, Task, Meeting
- Timeline view with icons and colors
- Automatic activity creation

#### Notifications System
- Follow-up alerts
- Call-back reminders
- Task due notifications
- Quotation updates
- Bell icon with unread count
- Mark as seen/completed
- Snooze functionality

#### Dashboard
- **Admin Dashboard**:
  - Total customers, leads, quotations
  - Conversion rate
  - Product-wise breakdown
  - Top employees
  - Tasks due today
- **Employee Dashboard**:
  - Assigned customers and leads
  - Quotations created
  - Total quotation value
  - Tasks due today
  - Pending follow-ups

### Quotation Management

#### Quotation Creation
- Create quotations from MBCB, Signages, or Paint modules
- Automatic customer assignment
- Link to accounts
- Save quotations to database

#### Quotation History
- View all quotations
- Filter by customer, date, section, employee
- Admin sees all quotations
- Employees see only their quotations

#### Quotation Status Update
- **Status Options**: Draft, Sent, Negotiation, On Hold, Closed Won, Closed Lost
- Add comments for each quotation
- Edit status and comments
- View history of all changes

#### Quotation Status View (Admin)
- View all quotation statuses
- See comments from employees
- View complete history (status and comments)
- Audit trail with timestamps and user info

#### Quotation Analytics
- Status breakdown pie chart
- Total value tracking
- Conversion metrics
- Per-account quotation analytics

## 🔐 Authentication

### Login
- Username and password authentication
- Department detection (Sales/Accounts)
- Role detection (Admin/Employee)
- Session management via localStorage

### Password Reset
- Reset code: `YNMSafety@reset`
- New password and captcha required
- No old password needed

## 📄 PDF Generation

### YNM Estimate PDF
- Professional PDF generation using pdfmake
- Absolute positioning for precise alignment
- Background template images
- Multi-page support
- Currency formatting
- Tax calculation (IGST/CGST+SGST based on state)

## 🎨 Design System

- **Glassmorphic UI**: Modern glassmorphic design
- **Color Scheme**: Dark theme with purple/slate gradients
- **Brand Colors**: Premium gold accents
- **Responsive**: Mobile-first responsive design
- **Animations**: Smooth transitions and animations

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Password reset

### Accounts
- `GET /api/accounts` - List accounts (with filters)
- `POST /api/accounts` - Create account
- `GET /api/accounts/[id]` - Get account details
- `PUT /api/accounts/[id]` - Update account
- `DELETE /api/accounts/[id]` - Delete account (admin only)
- `GET /api/accounts/[id]/contacts` - Get account contacts
- `POST /api/accounts/[id]/contacts` - Create contact
- `GET /api/accounts/[id]/activities` - Get account activities
- `POST /api/accounts/[id]/activities` - Create activity
- `GET /api/accounts/[id]/related` - Get related data

### Contacts
- `GET /api/contacts/[id]` - Get contact
- `PUT /api/contacts/[id]` - Update contact
- `DELETE /api/contacts/[id]` - Delete contact

### CRM
- `GET /api/crm/customers` - List customers
- `POST /api/crm/customers` - Create customer
- `GET /api/crm/customers/[id]` - Get customer
- `PUT /api/crm/customers/[id]` - Update customer
- `DELETE /api/crm/customers/[id]` - Delete customer
- `GET /api/crm/leads` - List leads
- `POST /api/crm/leads` - Create lead
- `GET /api/crm/tasks` - List tasks
- `POST /api/crm/tasks` - Create task
- `GET /api/crm/dashboard` - Get dashboard data

### Notifications
- `GET /api/notifications` - List notifications
- `POST /api/notifications` - Create notification
- `PUT /api/notifications/[id]` - Update notification
- `DELETE /api/notifications/[id]` - Delete notification

### Quotations
- `GET /api/quotes` - List quotations
- `POST /api/quotes` - Create quotation
- `GET /api/quotes/update-status` - Update quotation status
- `POST /api/quotes/update-comments` - Update quotation comments
- `GET /api/quotations/status-summary` - Get status summary for charts

### Metadata
- `GET /api/meta/[type]` - Get metadata (customers, places, purposes)
- `POST /api/meta/[type]` - Create metadata entry

## 🧪 Testing

### Test Users

**Admin:**
- Username: `Admin`
- Password: `Admin@123`
- Access: Full system access

**Employees:**
- Username: `Employee1`, `Employee2`, `Employee3`
- Passwords: `Employee1@123`, `Employee2@123`, `Employee3@123`
- Access: Limited to assigned customers

### Test Data

- **Customers**: 
  - Employee1: a, b, c
  - Employee2: d, e, f
  - Employee3: g, h, i
- **Places of Supply**: All 28 Indian states

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📚 Documentation

- **Database Setup**: See `docs/COMPLETE_DATABASE_SETUP.sql`
- **API Documentation**: See individual API route files
- **Component Documentation**: See component files with JSDoc comments

## 🔧 Development

### Code Style
- TypeScript strict mode
- ESLint configuration
- Prettier formatting (if configured)

### File Naming
- Components: PascalCase (e.g., `ButtonCard.tsx`)
- Pages: lowercase with hyphens (e.g., `quotation-status-update`)
- Utilities: camelCase (e.g., `pdfGeneratorYNMEST.ts`)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify Supabase credentials in `.env.local`
   - Check Supabase project status

2. **Authentication Issues**
   - Clear localStorage
   - Verify user exists in database

3. **PDF Generation Issues**
   - Check browser console for errors
   - Verify font files are loaded

## 📞 Support

For issues or questions, please contact the development team.

## 📄 License

Proprietary - YNM Safety Pvt Ltd

---

**Last Updated**: 2024
**Version**: 2.0.0 (CRM Extended)
