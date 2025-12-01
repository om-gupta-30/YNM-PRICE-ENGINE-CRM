# SQL Scripts Index

Complete index of all SQL scripts in the `docs/` folder, organized by purpose.

## 🚀 Primary Setup Scripts

### Complete Setup (Use This First!)
- **`COMPLETE_DATABASE_SETUP.sql`** ⭐ **START HERE**
  - Creates all tables from scratch
  - Includes all ENUMs, constraints, indexes
  - Creates all triggers and functions
  - Inserts initial data (users, states, customers)
  - Safe to run multiple times

## 📊 Module Setup Scripts

### CRM Module
- **`CRM_DATABASE_SCHEMA.sql`**
  - Customers table (extended)
  - Leads table
  - Tasks table
  - Employee-customer junction table

### Accounts Module
- **`ACCOUNTS_DATABASE_SCHEMA.sql`**
  - Accounts table
  - Company stage and tag ENUMs
  - Basic accounts structure

- **`ACCOUNTS_EXTENDED_SCHEMA.sql`**
  - Contacts table
  - Activities table
  - Notifications table
  - Engagement score field
  - Call status ENUM
  - Activity type ENUM
  - Notification type ENUM
  - Triggers for engagement score and notifications

## 🔧 Feature-Specific Scripts

### Quotation Features
- **`ADD_QUOTATION_STATUS.sql`**
  - Adds `status` field to all quotation tables
  - Status constraint (draft, sent, negotiation, on_hold, closed_won, closed_lost)

- **`ADD_COMMENTS_TO_QUOTATIONS.sql`**
  - Adds `comments` field to all quotation tables

- **`ADD_QUOTATION_HISTORY.sql`**
  - Adds `status_history` and `comments_history` JSONB fields
  - Enables audit trail tracking

### Customer Management
- **`ADD_SALES_EMPLOYEE_TO_CUSTOMERS.sql`**
  - Adds `sales_employee` field to customers
  - Updates unique constraint
  - Creates index

- **`ADD_TEST_CUSTOMERS.sql`**
  - Adds test customers (a-i) for employees

## 👥 User Management Scripts

### User Creation
- **`CREATE_SIMPLE_USERS.sql`**
  - Creates Admin, Employee1, Employee2, Employee3
  - Sets passwords

- **`CREATE_DEPARTMENT_USERS.sql`**
  - Creates department-specific users (legacy)

- **`UPDATE_TO_SIMPLE_USERS.sql`**
  - Migrates existing data to simplified usernames
  - Updates all references

- **`REMOVE_ADMIN_USER.sql`**
  - Removes old Admin user (legacy)

### Password Management
- **`SUPABASE_MIGRATE_TO_PLAIN_TEXT_PASSWORD.sql`**
  - Migrates to plain text passwords

- **`SUPABASE_FIX_PASSWORD_TO_PLAIN_TEXT.sql`**
  - Fixes password format

- **`SUPABASE_PASSWORD_RECOVERY_QUERIES.sql`**
  - Password recovery utilities

## 🔄 Update Scripts

### Complete Updates
- **`UPDATE_SUPABASE_TABLES_COMPLETE.sql`**
  - Comprehensive table updates
  - Includes all CRM and Accounts features

- **`COMPLETE_DATABASE_UPDATE.sql`**
  - Complete database update (alternative)

### Fix Scripts
- **`IMMEDIATE_FIX_DATABASE.sql`**
  - Immediate fixes for database issues

## 📐 Legacy Schema Scripts

### Original Schemas
- **`supabase-schema.sql`**
  - Original database schema

- **`supabase-schema-separate-tables.sql`**
  - Schema with separate quotation tables

- **`supabase-users-schema.sql`**
  - Users table schema

- **`supabase-bill-to-ship-to-tables.sql`**
  - Bill-to and Ship-to tables (legacy)

## 📝 Usage Guidelines

### For New Projects
1. **Run `COMPLETE_DATABASE_SETUP.sql`** - This is all you need!

### For Existing Projects
1. Check which features you need
2. Run corresponding module scripts
3. Run feature-specific scripts if needed
4. Run user management scripts if needed

### Script Safety
- All scripts use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`
- Safe to run multiple times
- Always backup before running in production

## 🔍 Script Dependencies

### Required Order (if running individually):
1. ENUM types
2. Base tables (users, places, purposes)
3. Customers table
4. Accounts table
5. Extended tables (contacts, activities, notifications)
6. Quotation tables
7. Junction tables
8. Triggers and functions
9. Initial data

**But again, just use `COMPLETE_DATABASE_SETUP.sql` for simplicity!**

