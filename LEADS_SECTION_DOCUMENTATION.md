# Leads Section Documentation

## Overview

The Leads section is a comprehensive Customer Relationship Management (CRM) module designed to track, manage, and convert potential customers into accounts. It provides a complete workflow from lead creation to conversion, with advanced features for scoring, prioritization, follow-up management, and activity tracking.

## What is the Leads Section?

The Leads section is a centralized hub for managing sales leads - potential customers who have shown interest in your products or services. It allows sales teams to:

- **Track potential customers** from initial contact to conversion
- **Prioritize leads** based on scoring and manual priority assignment
- **Manage follow-ups** with automated reminders and due date tracking
- **Monitor lead progression** through different stages (New → In Progress → Quotation Sent → Closed)
- **Track activities** and interactions with each lead
- **Analyze lead sources** and performance metrics
- **Assign leads** to specific sales employees for better accountability

---

## Key Features

### 1. **Lead Scoring System**
- **Automatic scoring** based on multiple factors:
  - +10 points for having an email
  - +10 points for having a phone number
  - +20 points for detailed requirements (length > 30 characters)
  - +15 points for inbound sources (Website, Google, Inbound Call)
  - +20 points if status is "Quotation Sent"
  - -20 points if status is "Closed Lost"
- **Score range**: 0-100
- **Visual indicators**: Color-coded badges (Green: 80+, Blue: 60+, Yellow: 40+, Orange: 20+, Red: <20)
- **Priority suggestions**: High (70+), Medium (40-69), Low (<40)

### 2. **Dual View Modes**

#### Table View
- Traditional tabular layout
- Shows all lead information in columns
- Supports sorting by:
  - Newest/Oldest
  - Lead Score (High to Low)
  - Priority (High to Low)
- Pagination (30 leads per page for performance)
- Quick action buttons (View, Edit, History, Delete)

#### Pipeline/Kanban View
- Visual board with status columns:
  - New
  - In Progress
  - Quotation Sent
  - Follow-Up
  - Closed Won
  - Closed Lost
- **Drag-and-drop** functionality to move leads between statuses
- Card-based layout showing key information
- Real-time status updates

### 3. **Advanced Filtering & Search**
- **Search**: By lead name, contact person, phone, or email
- **Filters**:
  - Status (New, In Progress, Quotation Sent, etc.)
  - Lead Source (Website, Referral, Inbound Call, etc.)
  - Assigned Employee
- **Sorting options**: Newest, Oldest, Score, Priority
- **Debounced search** (300ms delay) for better performance
- **Active filter indicators** with quick clear option

### 4. **Follow-Up Management**
- **Follow-up date tracking** with visual indicators:
  - 🔴 Red badge: Overdue follow-ups
  - 🟠 Orange badge: Due today
  - 🔵 Blue badge: Upcoming follow-ups
- **Dashboard widget** showing follow-ups due today
- **Set/Update follow-ups** from lead details modal
- **Automatic reminders** and notifications

### 5. **Activity Timeline**
- **Complete activity history** for each lead:
  - Notes added
  - Status changes
  - Priority changes
  - Employee reassignments
  - Follow-up set/completed
  - Calls made
  - Emails sent
- **Color-coded timeline** with icons
- **Real-time updates** when activities are added
- **User attribution** (who performed the action)

### 6. **Quick Actions**
- **Add Note**: Quick note-taking for lead interactions
- **Set Follow-Up**: Schedule follow-up dates
- **Call**: Direct phone call (opens dialer)
- **WhatsApp**: Open WhatsApp chat (auto-formats Indian numbers)
- **Convert to Account**: (Coming soon)
- **Send Quotation**: (Coming soon)

### 7. **Dashboard Analytics**
- **Total Leads**: Overall count
- **New Leads This Week**: Weekly growth metric
- **Follow-Ups Due Today**: Actionable reminder count
- **Status Distribution**: Count by status (6 status boxes)
- **Lead Source Chart**: Visual distribution with percentages
- **Recent Leads**: Last 5 created leads

### 8. **Priority Management**
- **Manual priority assignment**:
  - High Priority
  - Medium Priority
  - Low Priority
- **Auto-suggestions** based on lead score
- **Visual indicators** with color-coded badges
- **Priority-based sorting** and filtering

---

## Data Structure

### Lead Object
```typescript
interface Lead {
  id: number;
  lead_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  requirements: string | null;
  lead_source: string | null;
  status: string | null;
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority' | null;
  assigned_employee: string | null;
  accounts: number | null;              // account_id
  sub_accounts: number | null;        // sub_account_id
  contact_id: number | null;
  follow_up_date: string | null;
  account_name: string | null;         // Joined from accounts table
  sub_account_name: string | null;    // Joined from sub_accounts table
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
```

### Lead Statuses
- **New**: Initial lead entry
- **In Progress**: Active engagement
- **Quotation Sent**: Proposal/quotation delivered
- **Follow-Up**: Awaiting response
- **Closed Won**: Successfully converted
- **Closed Lost**: Lead lost/declined

### Lead Sources
- Website
- Referral
- Inbound Call
- Existing Customer
- Marketing
- Email
- India Mart
- Dollar Business
- WhatsApp
- Exhibition
- Other

---

## Components Architecture

### Main Components

#### 1. **LeadsPage** (`app/crm/leads/page.tsx`)
- Main page component
- Manages state (leads, filters, view mode)
- Handles CRUD operations
- Coordinates between child components
- Implements pagination and filtering logic

#### 2. **LeadsDashboard** (`components/crm/LeadsDashboard.tsx`)
- Analytics widgets
- Status distribution cards
- Lead source chart
- Recent leads list
- Follow-ups due today counter

#### 3. **LeadsKanban** (`components/crm/LeadsKanban.tsx`)
- Pipeline/Kanban board view
- Drag-and-drop functionality
- Status column organization
- Card-based lead display

#### 4. **LeadDetailsModal** (`components/crm/LeadDetailsModal.tsx`)
- Comprehensive lead information display
- Inline editing (status, employee, priority)
- Activity timeline integration
- Quick actions panel
- Follow-up date management

#### 5. **LeadForm** (`components/crm/LeadForm.tsx`)
- Create/Edit lead form
- Cascading dropdowns (Account → Sub-Account → Contact)
- Auto-fill from contact selection
- Validation and error handling
- Employee auto-assignment (for admins)

#### 6. **LeadActivityTimeline** (`components/crm/LeadActivityTimeline.tsx`)
- Activity history display
- Color-coded activity types
- Timeline visualization
- Real-time updates

#### 7. **LeadQuickActions** (`components/crm/LeadQuickActions.tsx`)
- Action buttons (Note, Follow-up, Call, WhatsApp, etc.)
- Direct integrations (phone, WhatsApp)
- Modal triggers for complex actions

---

## User Roles & Permissions

### Admin Users
- **Full access** to all leads
- Can view leads assigned to any employee
- Can assign/reassign leads to any employee
- Can edit all lead fields
- Can delete leads
- Auto-assignment from account's assigned employee

### Sales Employees
- **Restricted access** to their own leads
- Can only view/edit leads assigned to them
- Cannot reassign leads (admin-only)
- Auto-assigned to themselves when creating leads
- Can add notes, set follow-ups, update status

### Data Analysts
- **Blocked access** - redirected to CRM dashboard
- Cannot access leads section

---

## CRUD Operations

### Create Lead
1. Click "Add Lead" button
2. Select Account (required)
3. Select Sub-Account (required, loads after account)
4. Select Contact (required, loads after sub-account, auto-fills details)
5. Fill in lead details:
   - Lead Name (required)
   - Contact Person (auto-filled from contact)
   - Phone (required, auto-filled from contact)
   - Email (auto-filled from contact)
   - Requirements
   - Lead Source
   - Status (default: New)
   - Priority (optional)
   - Assigned Employee (auto-assigned for non-admins)
6. Submit form

**Validation**:
- Account, Sub-Account, Contact are required
- Lead Name and Phone are required
- Email format validation
- Account must have assigned employee (for admins)

### Read/View Leads
- **Table View**: All leads in sortable table
- **Pipeline View**: Leads organized by status columns
- **Details Modal**: Click "View" to see full lead information
- **History Modal**: Click "History" to see change log

### Update Lead
- **Quick Updates** (from details modal):
  - Status (dropdown)
  - Assigned Employee (dropdown, admin only)
  - Priority (dropdown)
- **Full Edit** (from edit button):
  - Opens full form with all fields editable
- **Drag-and-Drop** (Kanban view):
  - Drag lead card to different status column

### Delete Lead
- Click "Delete" button
- Confirm deletion in modal
- Optimistic update (removed immediately)
- Background sync with database

---

## Lead Scoring Algorithm

The lead scoring system automatically calculates a score (0-100) based on:

```typescript
Score Calculation:
- Base: 0
- +10 if email exists
- +10 if phone exists
- +20 if requirements length > 30 characters
- +15 if lead_source is inbound (Website, Google, Inbound Call)
- +20 if status === "Quotation Sent"
- -20 if status === "Lost" or "Closed Lost"
- Final: Clamped between 0 and 100
```

**Score Interpretation**:
- **80-100**: Excellent lead (Green) - High conversion probability
- **60-79**: Good lead (Blue) - Strong potential
- **40-59**: Average lead (Yellow) - Moderate interest
- **20-39**: Low quality (Orange) - Needs nurturing
- **0-19**: Poor quality (Red) - Low priority

---

## Follow-Up System

### Features
- **Follow-up date tracking**: Store and display follow-up dates
- **Visual indicators**:
  - ⚠️ Red: Overdue
  - 📅 Orange: Due today
  - 📅 Blue: Upcoming
- **Dashboard widget**: Shows count of follow-ups due today
- **Set/Update**: From lead details modal or quick actions
- **Notifications**: Dashboard notifications for due follow-ups

### Follow-Up Workflow
1. Create lead or open existing lead
2. Click "Set Follow-Up" or use quick action
3. Select date in modal
4. Save - follow-up date is stored
5. System tracks and displays status (overdue/due today/upcoming)

---

## Activity Tracking

### Activity Types
- **note**: Notes added to lead
- **status_change**: Status updated
- **priority_change**: Priority changed
- **employee_reassigned**: Lead reassigned
- **follow_up_set**: Follow-up scheduled
- **follow_up_completed**: Follow-up completed
- **call**: Call made (manual entry)
- **email_sent**: Email sent (manual entry)
- **meeting_scheduled**: Meeting scheduled

### Activity Display
- **Timeline view**: Chronological list of activities
- **Color-coded borders**: Different colors per activity type
- **Icons**: Visual indicators for each activity type
- **Metadata**: Additional information (old/new values, notes)
- **User attribution**: Who performed the action
- **Timestamp**: When the action occurred

---

## API Endpoints

### GET `/api/crm/leads/list`
- Fetch all leads (filtered by employee if not admin)
- Returns leads with joined account/sub-account names
- Query params:
  - `employee`: Filter by assigned employee
  - `isAdmin`: Admin access flag

### POST `/api/crm/leads/create`
- Create new lead
- Validates required fields
- Auto-assigns employee from account if not provided
- Creates activity log entry
- Creates dashboard notification

### POST `/api/crm/leads/update`
- Update lead fields
- Supports partial updates
- Creates activity log for changes
- Validates priority values

### POST `/api/crm/leads/delete`
- Delete lead
- Soft delete (if implemented)
- Removes from database

### GET `/api/crm/leads/analytics`
- Fetch analytics data:
  - Total leads
  - New leads this week
  - Leads by status
  - Leads by source
  - Follow-ups due today

### GET `/api/crm/leads/[id]/history`
- Fetch change history for a lead
- Returns chronological list of changes
- Includes metadata (old/new values)

### POST `/api/crm/leads/[id]/follow-up`
- Set or update follow-up date
- Creates activity log entry

### GET `/api/crm/leads/activities?lead_id={id}`
- Fetch activities for a lead
- Returns timeline of all activities

---

## Performance Optimizations

### Frontend
- **Dynamic imports**: Heavy components loaded on demand
- **Debounced search**: 300ms delay to reduce API calls
- **Pagination**: 30 items per page to limit DOM size
- **Memoization**: useMemo and useCallback for expensive operations
- **Optimistic updates**: Immediate UI updates before API confirmation

### Backend
- **Efficient queries**: Single query with joins for account/sub-account names
- **Indexed fields**: Database indexes on frequently queried fields
- **Caching**: No-store cache policy for fresh data
- **Batch operations**: Parallel API calls where possible

---

## Integration Points

### Accounts Module
- Leads must be linked to an Account
- Auto-assignment of employee from account
- Account name displayed in lead details

### Sub-Accounts Module
- Leads must be linked to a Sub-Account
- Sub-account name displayed in lead details

### Contacts Module
- Leads must be linked to a Contact
- Contact details auto-fill lead form
- Contact information displayed in lead

### Activity Logging
- All lead changes logged to activities table
- Activity timeline displays in lead details
- Dashboard notifications for important events

---

## Workflow Examples

### Example 1: Creating a New Lead
1. Sales employee receives inquiry via website
2. Navigate to Leads → Click "Add Lead"
3. Select Account → Sub-Account → Contact
4. Form auto-fills contact details
5. Enter requirements and select lead source "Website"
6. Lead is created with status "New"
7. System calculates lead score (e.g., 45 - has email, phone, inbound source)
8. Lead appears in dashboard and table view

### Example 2: Managing Follow-Up
1. Sales employee calls lead and needs to follow up in 3 days
2. Open lead details → Click "Set Follow-Up"
3. Select date 3 days from today
4. Follow-up is saved
5. On follow-up date, dashboard shows "Follow-Ups Due Today: 1"
6. Lead card shows orange badge "Due Today"
7. Employee completes follow-up → Updates status to "In Progress"

### Example 3: Converting Lead to Account
1. Lead progresses through stages: New → In Progress → Quotation Sent
2. Customer accepts quotation
3. Update status to "Closed Won"
4. (Future feature) Click "Convert to Account" to create account from lead
5. Lead is archived and account is created

### Example 4: Lead Scoring in Action
1. Lead created with:
   - Email: ✓ (+10)
   - Phone: ✓ (+10)
   - Requirements: Detailed description (+20)
   - Source: Website (+15)
   - Status: New
   - **Total Score: 55** (Yellow badge - Medium priority)
2. Status updated to "Quotation Sent"
   - Additional +20 points
   - **New Score: 75** (Blue badge - High priority)
3. Lead score helps prioritize which leads to focus on

---

## Best Practices

### For Sales Employees
1. **Always link to contact**: Ensures data consistency
2. **Add detailed requirements**: Improves lead score
3. **Set follow-ups immediately**: Never miss a follow-up
4. **Update status regularly**: Keep pipeline accurate
5. **Add notes after interactions**: Maintain activity history

### For Admins
1. **Review lead scores**: Identify high-quality leads
2. **Monitor follow-ups**: Ensure team follows up on time
3. **Analyze lead sources**: Focus on best-performing sources
4. **Assign leads appropriately**: Balance workload
5. **Review activity timelines**: Track team performance

### Data Quality
1. **Complete contact information**: Email and phone improve score
2. **Detailed requirements**: Helps with scoring and conversion
3. **Accurate lead source**: Important for analytics
4. **Regular status updates**: Maintains pipeline accuracy
5. **Follow-up discipline**: Set and complete follow-ups

---

## Future Enhancements (Coming Soon)

- **Convert to Account**: Direct conversion from lead to account
- **Send Quotation**: Integration with quotation system
- **Email Integration**: Send emails directly from lead details
- **Advanced Analytics**: Conversion rates, source performance, employee metrics
- **Bulk Operations**: Bulk status updates, bulk assignment
- **Lead Import**: Import leads from CSV/Excel
- **Custom Fields**: Additional custom fields per organization
- **Lead Duplication Detection**: Prevent duplicate leads
- **Automated Workflows**: Auto-assign based on rules
- **Lead Enrichment**: Auto-populate data from external sources

---

## Troubleshooting

### Common Issues

**Issue**: Lead not showing in list
- **Solution**: Check if assigned to correct employee (non-admins only see their leads)
- **Solution**: Check filters - may be filtered out

**Issue**: Cannot create lead - "Account has no assigned employee"
- **Solution**: Admin must assign an employee to the account first

**Issue**: Follow-up not showing as due
- **Solution**: Check date format and timezone (uses IST)
- **Solution**: Refresh page to update dashboard

**Issue**: Lead score seems incorrect
- **Solution**: Check all fields (email, phone, requirements, source, status)
- **Solution**: Score recalculates on status change

**Issue**: Cannot drag lead in Kanban view
- **Solution**: Ensure JavaScript is enabled
- **Solution**: Try clicking lead card first, then drag

---

## Technical Details

### Technologies Used
- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Activity timeline updates

### Key Dependencies
- `next/dynamic`: Code splitting for performance
- `useDebounce`: Search debouncing hook
- `createPortal`: Modal rendering
- Supabase client: Database operations

### File Structure
```
app/crm/leads/
  └── page.tsx                    # Main leads page

components/crm/
  ├── LeadsDashboard.tsx          # Analytics dashboard
  ├── LeadsKanban.tsx             # Pipeline/Kanban view
  ├── LeadDetailsModal.tsx        # Lead details modal
  ├── LeadForm.tsx                # Create/Edit form
  ├── LeadActivityTimeline.tsx    # Activity timeline
  └── LeadQuickActions.tsx        # Quick action buttons

app/api/crm/leads/
  ├── list/route.ts               # GET leads
  ├── create/route.ts             # POST create lead
  ├── update/route.ts              # POST update lead
  ├── delete/route.ts              # POST delete lead
  ├── analytics/route.ts           # GET analytics
  └── [id]/history/route.ts        # GET lead history

lib/utils/
  └── leadScore.ts                # Lead scoring algorithm
```

---

## Summary

The Leads section is a comprehensive CRM module that provides:

✅ **Complete lead lifecycle management** from creation to conversion  
✅ **Intelligent lead scoring** to prioritize efforts  
✅ **Dual view modes** (Table and Pipeline) for different workflows  
✅ **Advanced filtering and search** for quick access  
✅ **Follow-up management** with automated reminders  
✅ **Activity tracking** for complete audit trail  
✅ **Dashboard analytics** for insights  
✅ **Role-based access control** for security  
✅ **Performance optimizations** for scalability  
✅ **User-friendly interface** with modern UI/UX  

This system enables sales teams to efficiently manage leads, prioritize high-quality prospects, and convert more leads into customers.

