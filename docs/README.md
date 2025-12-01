# Documentation Index

This directory contains all documentation and SQL scripts for the YNM Safety Price Engine & CRM System.

## 🚀 Quick Start

**For first-time setup, run this script:**
- [`COMPLETE_DATABASE_SETUP.sql`](./COMPLETE_DATABASE_SETUP.sql) - **START HERE!** Complete database setup with all tables and initial data

## 📋 SQL Scripts

### Complete Setup
- **`COMPLETE_DATABASE_SETUP.sql`** ⭐ - Complete database setup from scratch (includes all tables, constraints, triggers, and initial data)

### Module-Specific Scripts
- **`CRM_DATABASE_SCHEMA.sql`** - CRM module schema (customers, leads, tasks)
- **`ACCOUNTS_DATABASE_SCHEMA.sql`** - Accounts module base schema
- **`ACCOUNTS_EXTENDED_SCHEMA.sql`** - Accounts extended (contacts, activities, notifications, engagement score)

### Feature-Specific Scripts
- **`ADD_QUOTATION_STATUS.sql`** - Add status field to quotation tables
- **`ADD_COMMENTS_TO_QUOTATIONS.sql`** - Add comments field to quotation tables
- **`ADD_QUOTATION_HISTORY.sql`** - Add history tracking to quotation tables
- **`ADD_SALES_EMPLOYEE_TO_CUSTOMERS.sql`** - Add sales employee assignment to customers

### User Management Scripts
- **`CREATE_SIMPLE_USERS.sql`** - Create simplified users (Admin, Employee1-3)
- **`UPDATE_TO_SIMPLE_USERS.sql`** - Migrate existing data to simplified usernames
- **`UPDATE_SUPABASE_TABLES_COMPLETE.sql`** - Complete table updates (legacy)

## 📚 Documentation Files

- **`README.md`** (this file) - Documentation index
- **`DATABASE_SETUP_GUIDE.md`** - Step-by-step database setup guide
- **`API_DOCUMENTATION.md`** - Complete API reference
- **`FEATURES_OVERVIEW.md`** - Feature list and capabilities

## 📖 Implementation Summaries

- **`CRM_IMPLEMENTATION_SUMMARY.md`** - CRM module implementation details
- **`ACCOUNTS_MODULE_SUMMARY.md`** - Accounts module implementation details
- **`ACCOUNTS_EXTENDED_IMPLEMENTATION.md`** - Accounts extended features (contacts, activities, notifications)

## 🔧 Usage

### For New Setup
1. Run `COMPLETE_DATABASE_SETUP.sql` in Supabase SQL Editor
2. This creates everything from scratch

### For Updates
1. Check which module/feature you need to add
2. Run the corresponding SQL script
3. Follow the setup guide if needed

## 📝 Notes

- All scripts use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` for safety
- Scripts can be run multiple times without issues
- Always backup your database before running scripts in production
- Test scripts in a development environment first

## 🔍 Script Order (if running individually)

1. Base tables and ENUMs
2. CRM module tables
3. Accounts module tables
4. Accounts extended tables
5. Quotation updates
6. User management
7. Initial data

**However, we recommend using `COMPLETE_DATABASE_SETUP.sql` for simplicity!**

