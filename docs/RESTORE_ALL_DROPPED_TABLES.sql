-- ============================================
-- RESTORE ALL DROPPED TABLES
-- ============================================
-- This script recreates all tables that were accidentally dropped
-- It preserves: users, states, cities, industries, sub_industries
-- And recreates all other tables with their full schema
-- ============================================
-- Run this in your Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- 1. CREATE ENUM TYPES (if they don't exist)
-- ============================================

-- Company Stage ENUM
DO $$ BEGIN
    CREATE TYPE company_stage_enum AS ENUM (
        'Enterprise',
        'SMB',
        'Pan India',
        'APAC',
        'Middle East & Africa',
        'Europe',
        'North America',
        'LATAM_SouthAmerica'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Company Tag ENUM
DO $$ BEGIN
    CREATE TYPE company_tag_enum AS ENUM (
        'New',
        'Prospect',
        'Customer',
        'Onboard',
        'Lapsed',
        'Needs Attention',
        'Retention',
        'Renewal',
        'Upselling'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Call Status ENUM
DO $$ BEGIN
    CREATE TYPE call_status_enum AS ENUM (
        'Connected',
        'DNP',
        'ATCBL',
        'Unable to connect',
        'Number doesn''t exist',
        'Wrong number'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Activity Type ENUM (add login/logout if needed)
DO $$ BEGIN
    CREATE TYPE activity_type_enum AS ENUM (
        'call',
        'note',
        'followup',
        'quotation',
        'email',
        'task',
        'meeting',
        'login',
        'logout'
    );
EXCEPTION
    WHEN duplicate_object THEN 
        -- Try to add login/logout if they don't exist
        BEGIN
            ALTER TYPE activity_type_enum ADD VALUE IF NOT EXISTS 'login';
            ALTER TYPE activity_type_enum ADD VALUE IF NOT EXISTS 'logout';
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
END $$;

-- Notification Type ENUM
DO $$ BEGIN
    CREATE TYPE notification_type_enum AS ENUM (
        'followup_due',
        'callback_scheduled',
        'task_due',
        'quotation_update'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. CREATE REFERENCE TABLES
-- ============================================

-- Places of Supply Table
CREATE TABLE IF NOT EXISTS places_of_supply (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_of_supply_name ON places_of_supply(name);

-- Purposes Table
CREATE TABLE IF NOT EXISTS purposes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purposes_name ON purposes(name);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    location TEXT,
    address TEXT,
    gst_number TEXT,
    category TEXT CHECK (category IN ('Contractor', 'Government', 'Trader', 'Other')),
    related_products JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    sales_employee TEXT NOT NULL,
    city TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT customers_name_sales_employee_unique UNIQUE (name, sales_employee)
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_sales_employee ON customers(sales_employee);
CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- ============================================
-- 3. CREATE ACCOUNTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    account_name TEXT NOT NULL,
    company_stage company_stage_enum,
    company_tag company_tag_enum,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    website TEXT,
    gst_number TEXT,
    related_products TEXT[] DEFAULT '{}',
    assigned_employee TEXT,
    assigned_to TEXT,  -- Alias for assigned_employee
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    engagement_score DECIMAL(10, 2) DEFAULT 0,
    industries JSONB DEFAULT '[]'::jsonb,
    industry_projects JSONB DEFAULT '{}'::jsonb,
    state_id INTEGER REFERENCES states(id),
    city_id INTEGER REFERENCES cities(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_account_name ON accounts(account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_company_stage ON accounts(company_stage);
CREATE INDEX IF NOT EXISTS idx_accounts_company_tag ON accounts(company_tag);
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_employee ON accounts(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_accounts_engagement_score ON accounts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_last_activity ON accounts(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_state_id ON accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_accounts_city_id ON accounts(city_id);
CREATE INDEX IF NOT EXISTS idx_accounts_industries ON accounts USING GIN (industries);

-- ============================================
-- 4. CREATE SUB_ACCOUNTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sub_accounts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sub_account_name TEXT NOT NULL,
    state_id INTEGER REFERENCES states(id),
    city_id INTEGER REFERENCES cities(id),
    address TEXT,
    pincode TEXT,
    is_headquarter BOOLEAN DEFAULT false,
    office_type TEXT,
    engagement_score NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT sub_accounts_account_name_unique UNIQUE (account_id, sub_account_name)
);

CREATE INDEX IF NOT EXISTS idx_sub_accounts_account_id ON sub_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_state_id ON sub_accounts(state_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_city_id ON sub_accounts(city_id);
CREATE INDEX IF NOT EXISTS idx_sub_accounts_is_active ON sub_accounts(is_active);

-- ============================================
-- 5. CREATE CONTACTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    designation TEXT,
    email TEXT,
    phone TEXT,
    call_status call_status_enum,
    notes TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_sub_account_id ON contacts(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up_date ON contacts(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_contacts_call_status ON contacts(call_status);

-- ============================================
-- 6. CREATE ACTIVITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    employee_id TEXT NOT NULL,
    activity_type activity_type_enum NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_employee_created_at ON activities(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_metadata_gin ON activities USING GIN (metadata);

-- ============================================
-- 7. CREATE LEADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    lead_name TEXT NOT NULL,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    location TEXT,
    address TEXT,
    requirements TEXT,
    lead_source TEXT,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Quotation Sent', 'Follow-up', 'Closed', 'Lost')),
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
    assigned_employee TEXT NOT NULL,
    assigned_to TEXT,  -- Alias for assigned_employee
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_employee ON leads(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_account_id ON leads(account_id);
CREATE INDEX IF NOT EXISTS idx_leads_sub_account_id ON leads(sub_account_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);

-- ============================================
-- 8. CREATE TASKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN ('Follow-up', 'Meeting', 'Call')),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    assigned_employee TEXT NOT NULL,
    assigned_to TEXT,  -- Alias for assigned_employee
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_value INTEGER,
    reminder_unit TEXT CHECK (reminder_unit IN ('hour', 'day', 'week')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee ON tasks(assigned_employee);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_account_id ON tasks(sub_account_id);

-- ============================================
-- 9. CREATE NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    notification_type notification_type_enum NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
    quotation_id INTEGER,
    related_id INTEGER,
    related_type TEXT,
    is_seen BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    is_snoozed BOOLEAN DEFAULT false,
    snooze_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_seen ON notifications(is_seen);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_account_id ON notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_contact_id ON notifications(contact_id);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON notifications(task_id);

-- ============================================
-- 10. CREATE EMPLOYEE_CUSTOMER JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS employee_customer (
    id SERIAL PRIMARY KEY,
    employee_username TEXT NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by TEXT,
    UNIQUE(employee_username, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_customer_employee ON employee_customer(employee_username);
CREATE INDEX IF NOT EXISTS idx_employee_customer_customer ON employee_customer(customer_id);

-- ============================================
-- 11. CREATE QUOTATION TABLES
-- ============================================

-- Quotes MBCB
CREATE TABLE IF NOT EXISTS quotes_mbcb (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    place_of_supply TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    purpose TEXT,
    date TEXT NOT NULL,
    quantity_rm NUMERIC,
    total_weight_per_rm NUMERIC,
    total_cost_per_rm NUMERIC,
    final_total_cost NUMERIC,
    raw_payload JSONB,
    created_by TEXT,
    is_saved BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost')),
    comments TEXT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
    state_id INTEGER REFERENCES states(id),
    city_id INTEGER REFERENCES cities(id),
    status_history JSONB DEFAULT '[]'::jsonb,
    comments_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_customer_name ON quotes_mbcb(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_created_by ON quotes_mbcb(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_status ON quotes_mbcb(status);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_customer_id ON quotes_mbcb(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_account_id ON quotes_mbcb(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mbcb_sub_account_id ON quotes_mbcb(sub_account_id);

-- Quotes Signages
CREATE TABLE IF NOT EXISTS quotes_signages (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    place_of_supply TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    purpose TEXT,
    date TEXT NOT NULL,
    quantity NUMERIC,
    area_sq_ft NUMERIC,
    cost_per_piece NUMERIC,
    final_total_cost NUMERIC,
    raw_payload JSONB,
    created_by TEXT,
    is_saved BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost')),
    comments TEXT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
    state_id INTEGER REFERENCES states(id),
    city_id INTEGER REFERENCES cities(id),
    status_history JSONB DEFAULT '[]'::jsonb,
    comments_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_signages_customer_name ON quotes_signages(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_created_by ON quotes_signages(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_status ON quotes_signages(status);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_customer_id ON quotes_signages(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_account_id ON quotes_signages(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_signages_sub_account_id ON quotes_signages(sub_account_id);

-- Quotes Paint
CREATE TABLE IF NOT EXISTS quotes_paint (
    id SERIAL PRIMARY KEY,
    section TEXT NOT NULL,
    place_of_supply TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    purpose TEXT,
    date TEXT NOT NULL,
    quantity NUMERIC,
    area_sq_ft NUMERIC,
    cost_per_piece NUMERIC,
    final_total_cost NUMERIC,
    raw_payload JSONB,
    created_by TEXT,
    is_saved BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'negotiation', 'on_hold', 'closed_won', 'closed_lost')),
    comments TEXT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    sub_account_id INTEGER REFERENCES sub_accounts(id) ON DELETE SET NULL,
    state_id INTEGER REFERENCES states(id),
    city_id INTEGER REFERENCES cities(id),
    status_history JSONB DEFAULT '[]'::jsonb,
    comments_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_paint_customer_name ON quotes_paint(customer_name);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_created_by ON quotes_paint(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_status ON quotes_paint(status);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_customer_id ON quotes_paint(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_account_id ON quotes_paint(account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_paint_sub_account_id ON quotes_paint(sub_account_id);

-- ============================================
-- 12. CREATE ADDITIONAL TABLES (if they existed)
-- ============================================

-- Activity Logs (if it existed)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_id ON activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Lead Activities (if it existed)
CREATE TABLE IF NOT EXISTS lead_activities (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    employee_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_employee_id ON lead_activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Logout Reasons (if it existed)
CREATE TABLE IF NOT EXISTS logout_reasons (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    reason_tag TEXT,
    reason_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logout_reasons_user_id ON logout_reasons(user_id);
CREATE INDEX IF NOT EXISTS idx_logout_reasons_created_at ON logout_reasons(created_at DESC);

-- Engagement AI State (if it existed)
CREATE TABLE IF NOT EXISTS engagement_ai_state (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    state_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_ai_state_account_id ON engagement_ai_state(account_id);

-- Engagement Suggestions (if it existed)
CREATE TABLE IF NOT EXISTS engagement_suggestions (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    suggestion_type TEXT NOT NULL,
    suggestion_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_suggestions_account_id ON engagement_suggestions(account_id);

-- ============================================
-- 13. CREATE TRIGGERS AND FUNCTIONS
-- ============================================

-- Function to update accounts timestamp
CREATE OR REPLACE FUNCTION update_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_update_timestamp ON accounts;
CREATE TRIGGER accounts_update_timestamp
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_accounts_timestamp();

-- Function to update engagement score
CREATE OR REPLACE FUNCTION update_account_engagement_score()
RETURNS TRIGGER AS $$
DECLARE
    score_change DECIMAL(10, 2) := 0;
BEGIN
    CASE NEW.activity_type
        WHEN 'call' THEN
            IF NEW.metadata->>'call_status' = 'Connected' THEN
                score_change := 10;
            ELSIF NEW.metadata->>'call_status' = 'DNP' THEN
                score_change := -5;
            ELSIF NEW.metadata->>'call_status' IN ('Unable to connect', 'Number doesn''t exist', 'Wrong number') THEN
                score_change := -10;
            END IF;
        WHEN 'note' THEN
            score_change := 5;
        WHEN 'quotation' THEN
            IF NEW.metadata->>'quotation_status' = 'closed_won' THEN
                score_change := 20;
            ELSIF NEW.metadata->>'quotation_status' = 'closed_lost' THEN
                score_change := -20;
            ELSE
                score_change := 15;
            END IF;
        WHEN 'task' THEN
            IF NEW.metadata->>'task_status' = 'Completed' THEN
                score_change := 5;
            END IF;
        WHEN 'followup' THEN
            score_change := 10;
    END CASE;

    UPDATE accounts
    SET engagement_score = COALESCE(engagement_score, 0) + score_change,
        last_activity_at = NOW()
    WHERE id = NEW.account_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activities_update_engagement_score ON activities;
CREATE TRIGGER activities_update_engagement_score
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION update_account_engagement_score();

-- Function to create follow-up notifications
CREATE OR REPLACE FUNCTION create_followup_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.follow_up_date IS NOT NULL THEN
        INSERT INTO notifications (
            user_id,
            notification_type,
            title,
            message,
            account_id,
            contact_id
        ) VALUES (
            NEW.created_by,
            'callback_scheduled',
            'Follow-up Scheduled',
            'Follow up with ' || NEW.name || ' from account (scheduled for ' || 
            TO_CHAR(NEW.follow_up_date, 'DD Mon YYYY HH24:MI') || ')',
            NEW.account_id,
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_create_followup_notification ON contacts;
CREATE TRIGGER contacts_create_followup_notification
AFTER INSERT OR UPDATE ON contacts
FOR EACH ROW
WHEN (NEW.follow_up_date IS NOT NULL)
EXECUTE FUNCTION create_followup_notification();

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESTORATION COMPLETE!';
    RAISE NOTICE 'Total tables in database: %', table_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'All tables have been restored. Your preserved tables (users, states, cities, industries, sub_industries) are still intact.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next time, use: CLEAR_ALL_DATA_EXCEPT_USERS_STATES_CITIES_INDUSTRIES.sql';
    RAISE NOTICE 'to DELETE DATA and RESET IDs (not drop tables)';
    RAISE NOTICE '========================================';
END $$;
