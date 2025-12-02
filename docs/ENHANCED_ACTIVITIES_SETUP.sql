-- ============================================
-- ENHANCED ACTIVITIES TABLE SETUP
-- This script ensures the activities table is properly configured
-- to store detailed edit tracking for contacts, sub-accounts, accounts, leads, and tasks
-- ============================================
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ENSURE ACTIVITIES TABLE EXISTS WITH CORRECT STRUCTURE
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

-- Make account_id nullable (for activities that don't require an account)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'account_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE activities ALTER COLUMN account_id DROP NOT NULL;
        RAISE NOTICE 'Made account_id nullable in activities table';
    ELSE
        RAISE NOTICE 'account_id is already nullable in activities table';
    END IF;
END $$;

-- Ensure created_at column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activities' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE activities ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to activities table';
    ELSE
        RAISE NOTICE 'created_at column already exists in activities table';
    END IF;
END $$;

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee_id ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_employee_created_at ON activities(employee_id, created_at DESC);

-- Index for querying by metadata fields (lead_id, task_id, sub_account_id)
-- Use B-tree indexes on extracted text values for equality searches
CREATE INDEX IF NOT EXISTS idx_activities_metadata_lead_id ON activities ((metadata->>'lead_id')) WHERE metadata->>'lead_id' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_metadata_task_id ON activities ((metadata->>'task_id')) WHERE metadata->>'task_id' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_metadata_sub_account_id ON activities ((metadata->>'sub_account_id')) WHERE metadata->>'sub_account_id' IS NOT NULL;

-- GIN index on entire metadata column for general JSONB queries
CREATE INDEX IF NOT EXISTS idx_activities_metadata_gin ON activities USING GIN (metadata);

-- ============================================
-- 3. EXAMPLE INSERT STATEMENTS FOR DIFFERENT ACTIVITY TYPES
-- ============================================

-- ============================================
-- CONTACT EDIT EXAMPLE
-- ============================================
-- When a contact is edited, the activity includes:
-- - contact_id: The contact being edited
-- - account_id: The account the contact belongs to
-- - activity_type: 'call' (if call_status changed) or 'note' (for other edits)
-- - description: Summary of changes
-- - metadata: Contains changes array, old_data, new_data, call_status

/*
INSERT INTO activities (
  account_id,
  contact_id,
  employee_id,
  activity_type,
  description,
  metadata
) VALUES (
  1,  -- account_id
  5,  -- contact_id
  'Employee1',  -- employee_id
  'note',  -- activity_type ('call' if call_status changed, 'note' otherwise)
  'Contact "John Doe" edited - Call status: "None" → "Connected", Notes updated',
  jsonb_build_object(
    'call_status', 'Connected',
    'changes', ARRAY[
      'Call status: "None" → "Connected"',
      'Notes updated'
    ],
    'old_data', jsonb_build_object(
      'name', 'John Doe',
      'designation', 'Manager',
      'email', 'john@example.com',
      'phone', '1234567890',
      'call_status', NULL,
      'notes', 'Old notes',
      'follow_up_date', NULL
    ),
    'new_data', jsonb_build_object(
      'name', 'John Doe',
      'designation', 'Manager',
      'email', 'john@example.com',
      'phone', '1234567890',
      'call_status', 'Connected',
      'notes', 'Updated notes',
      'follow_up_date', NULL
    )
  )
);
*/

-- ============================================
-- SUB-ACCOUNT EDIT EXAMPLE
-- ============================================
-- When a sub-account is edited, the activity includes:
-- - account_id: The parent account
-- - activity_type: 'note'
-- - description: Summary of changes
-- - metadata: Contains sub_account_id, changes array, old_data, new_data

/*
INSERT INTO activities (
  account_id,
  employee_id,
  activity_type,
  description,
  metadata
) VALUES (
  1,  -- account_id
  'Employee1',  -- employee_id
  'note',  -- activity_type
  'Sub-account "Mumbai Office" updated: Name: "Mumbai Branch" → "Mumbai Office", State updated, Address updated',
  jsonb_build_object(
    'sub_account_id', 3,
    'changes', ARRAY[
      'Name: "Mumbai Branch" → "Mumbai Office"',
      'State updated',
      'Address updated'
    ],
    'old_data', jsonb_build_object(
      'account_id', 1,
      'sub_account_name', 'Mumbai Branch',
      'state_id', 14,
      'city_id', 101,
      'address', 'Old Address',
      'pincode', '400001',
      'is_headquarter', false,
      'office_type', 'Branch'
    ),
    'new_data', jsonb_build_object(
      'account_id', 1,
      'sub_account_name', 'Mumbai Office',
      'state_id', 14,
      'city_id', 102,
      'address', 'New Address',
      'pincode', '400002',
      'is_headquarter', false,
      'office_type', 'Head Office'
    )
  )
);
*/

-- ============================================
-- ACCOUNT EDIT EXAMPLE
-- ============================================
-- When an account is edited, the activity includes:
-- - account_id: The account being edited
-- - activity_type: 'note'
-- - description: Summary of changes
-- - metadata: Contains changes array, old_data, new_data

/*
INSERT INTO activities (
  account_id,
  employee_id,
  activity_type,
  description,
  metadata
) VALUES (
  1,  -- account_id
  'Admin',  -- employee_id
  'note',  -- activity_type
  'Account "ABC Corporation" updated: Name: "ABC Corp" → "ABC Corporation", Stage: Enterprise, Assigned: "Employee1" → "Employee2"',
  jsonb_build_object(
    'changes', ARRAY[
      'Name: "ABC Corp" → "ABC Corporation"',
      'Stage: Enterprise',
      'Assigned: "Employee1" → "Employee2"'
    ],
    'old_data', jsonb_build_object(
      'account_name', 'ABC Corp',
      'company_stage', 'SMB',
      'company_tag', 'Prospect',
      'assigned_employee', 'Employee1',
      'website', 'https://oldwebsite.com',
      'gst_number', 'OLDGST123',
      'notes', 'Old notes'
    ),
    'new_data', jsonb_build_object(
      'account_name', 'ABC Corporation',
      'company_stage', 'Enterprise',
      'company_tag', 'Customer',
      'assigned_employee', 'Employee2',
      'website', 'https://newwebsite.com',
      'gst_number', 'NEWGST456',
      'notes', 'Updated notes'
    )
  )
);
*/

-- ============================================
-- LEAD EDIT EXAMPLE
-- ============================================
-- When a lead is edited, the activity includes:
-- - account_id: The account the lead is associated with (if any)
-- - activity_type: 'note'
-- - description: Summary of changes
-- - metadata: Contains lead_id, changes array, old_data, new_data, status

/*
INSERT INTO activities (
  account_id,
  employee_id,
  activity_type,
  description,
  metadata
) VALUES (
  1,  -- account_id (can be NULL if lead is not associated with an account)
  'Employee1',  -- employee_id
  'note',  -- activity_type
  'Lead "XYZ Company" edited - Name: "XYZ Corp" → "XYZ Company", Status: "New" → "In Progress", Priority: "None" → "High"',
  jsonb_build_object(
    'lead_id', 10,
    'changes', ARRAY[
      'Name: "XYZ Corp" → "XYZ Company"',
      'Status: "New" → "In Progress"',
      'Priority: "None" → "High"'
    ],
    'status', 'In Progress',
    'old_data', jsonb_build_object(
      'lead_name', 'XYZ Corp',
      'contact_person', 'John Doe',
      'phone', '1234567890',
      'email', 'john@xyz.com',
      'requirements', 'Old requirements',
      'lead_source', 'Website',
      'status', 'New',
      'priority', NULL,
      'assigned_employee', 'Employee1',
      'account_id', 1,
      'sub_account_id', 3,
      'contact_id', 5,
      'follow_up_date', NULL
    ),
    'new_data', jsonb_build_object(
      'lead_name', 'XYZ Company',
      'contact_person', 'Jane Smith',
      'phone', '9876543210',
      'email', 'jane@xyz.com',
      'requirements', 'New requirements',
      'lead_source', 'Referral',
      'status', 'In Progress',
      'priority', 'High',
      'assigned_employee', 'Employee2',
      'account_id', 1,
      'sub_account_id', 3,
      'contact_id', 5,
      'follow_up_date', '2024-12-25T10:00:00Z'
    )
  )
);
*/

-- ============================================
-- TASK EDIT EXAMPLE
-- ============================================
-- When a task is edited, the activity includes:
-- - account_id: The account the task is associated with (if any)
-- - activity_type: 'task'
-- - description: Summary of changes
-- - metadata: Contains task_id, changes array, old_data, new_data, status, task_type

/*
INSERT INTO activities (
  account_id,
  employee_id,
  activity_type,
  description,
  metadata
) VALUES (
  1,  -- account_id (can be NULL if task is not associated with an account)
  'Employee1',  -- employee_id
  'task',  -- activity_type
  'Task "Follow up with client" edited - Title: "Follow up" → "Follow up with client", Status: "Pending" → "In Progress", Due date: 2024-12-20 → 2024-12-25',
  jsonb_build_object(
    'task_id', 15,
    'changes', ARRAY[
      'Title: "Follow up" → "Follow up with client"',
      'Status: "Pending" → "In Progress"',
      'Due date: 2024-12-20 → 2024-12-25'
    ],
    'status', 'In Progress',
    'task_type', 'Follow-up',
    'old_data', jsonb_build_object(
      'title', 'Follow up',
      'description', 'Old description',
      'task_type', 'Call',
      'due_date', '2024-12-20',
      'status', 'Pending',
      'assigned_employee', 'Employee1',
      'customer_id', 2,
      'customer_name', 'Customer ABC',
      'account_id', 1,
      'sub_account_id', 3,
      'reminder_enabled', false,
      'reminder_value', NULL,
      'reminder_unit', NULL
    ),
    'new_data', jsonb_build_object(
      'title', 'Follow up with client',
      'description', 'Updated description',
      'task_type', 'Follow-up',
      'due_date', '2024-12-25',
      'status', 'In Progress',
      'assigned_employee', 'Employee2',
      'customer_id', 2,
      'customer_name', 'Customer ABC',
      'account_id', 1,
      'sub_account_id', 3,
      'reminder_enabled', true,
      'reminder_value', 1,
      'reminder_unit', 'day'
    )
  )
);
*/

-- ============================================
-- 4. USEFUL QUERIES TO VIEW ACTIVITIES
-- ============================================

-- ============================================
-- View all edit activities (contacts, sub-accounts, accounts, leads, tasks)
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.activity_type,
  a.description,
  a.account_id,
  a.contact_id,
  a.metadata->>'lead_id' as lead_id,
  a.metadata->>'task_id' as task_id,
  a.metadata->>'sub_account_id' as sub_account_id,
  a.metadata->'changes' as changes,
  a.metadata->'old_data' as old_data,
  a.metadata->'new_data' as new_data
FROM activities a
WHERE a.description LIKE '%edited%' OR a.description LIKE '%updated%'
ORDER BY a.created_at DESC
LIMIT 50;
*/

-- ============================================
-- View contact edit activities
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.contact_id,
  a.description,
  a.metadata->'changes' as changes,
  a.metadata->'old_data' as old_data,
  a.metadata->'new_data' as new_data
FROM activities a
WHERE a.contact_id IS NOT NULL
  AND (a.description LIKE '%Contact%edited%' OR a.description LIKE '%Contact%updated%')
ORDER BY a.created_at DESC;
*/

-- ============================================
-- View sub-account edit activities
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.account_id,
  a.description,
  a.metadata->>'sub_account_id' as sub_account_id,
  a.metadata->'changes' as changes,
  a.metadata->'old_data' as old_data,
  a.metadata->'new_data' as new_data
FROM activities a
WHERE a.metadata->>'sub_account_id' IS NOT NULL
ORDER BY a.created_at DESC;
*/

-- ============================================
-- View account edit activities
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.account_id,
  a.description,
  a.metadata->'changes' as changes,
  a.metadata->'old_data' as old_data,
  a.metadata->'new_data' as new_data
FROM activities a
WHERE a.account_id IS NOT NULL
  AND a.contact_id IS NULL
  AND a.metadata->>'sub_account_id' IS NULL
  AND a.metadata->>'lead_id' IS NULL
  AND a.metadata->>'task_id' IS NULL
  AND (a.description LIKE '%Account%updated%' OR a.description LIKE '%Account%edited%')
ORDER BY a.created_at DESC;
*/

-- ============================================
-- View lead edit activities
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.account_id,
  a.description,
  a.metadata->>'lead_id' as lead_id,
  a.metadata->'changes' as changes,
  a.metadata->'status' as status,
  a.metadata->'old_data' as old_data,
  a.metadata->'new_data' as new_data
FROM activities a
WHERE a.metadata->>'lead_id' IS NOT NULL
ORDER BY a.created_at DESC;
*/

-- ============================================
-- View task edit activities
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.account_id,
  a.description,
  a.metadata->>'task_id' as task_id,
  a.metadata->'changes' as changes,
  a.metadata->'status' as status,
  a.metadata->'task_type' as task_type,
  a.metadata->'old_data' as old_data,
  a.metadata->'new_data' as new_data
FROM activities a
WHERE a.metadata->>'task_id' IS NOT NULL
ORDER BY a.created_at DESC;
*/

-- ============================================
-- View activities for a specific account with all edit types
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.activity_type,
  a.description,
  a.contact_id,
  a.metadata->>'lead_id' as lead_id,
  a.metadata->>'task_id' as task_id,
  a.metadata->>'sub_account_id' as sub_account_id,
  a.metadata->'changes' as changes
FROM activities a
WHERE a.account_id = 1  -- Replace with your account_id
ORDER BY a.created_at DESC;
*/

-- ============================================
-- View activities by employee
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.activity_type,
  a.description,
  a.account_id,
  a.contact_id,
  a.metadata->>'lead_id' as lead_id,
  a.metadata->>'task_id' as task_id,
  a.metadata->'changes' as changes
FROM activities a
WHERE a.employee_id = 'Employee1'  -- Replace with your employee username
ORDER BY a.created_at DESC;
*/

-- ============================================
-- View recent edit activities (last 24 hours)
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.activity_type,
  a.description,
  a.account_id,
  a.contact_id,
  a.metadata->>'lead_id' as lead_id,
  a.metadata->>'task_id' as task_id,
  a.metadata->'changes' as changes
FROM activities a
WHERE a.created_at >= NOW() - INTERVAL '24 hours'
  AND (a.description LIKE '%edited%' OR a.description LIKE '%updated%')
ORDER BY a.created_at DESC;
*/

-- ============================================
-- Count activities by type
-- ============================================
/*
SELECT 
  activity_type,
  COUNT(*) as count
FROM activities
GROUP BY activity_type
ORDER BY count DESC;
*/

-- ============================================
-- View activities with detailed change information
-- ============================================
/*
SELECT 
  a.id,
  a.created_at,
  a.employee_id,
  a.activity_type,
  a.description,
  jsonb_array_length(a.metadata->'changes') as number_of_changes,
  a.metadata->'changes' as all_changes,
  a.metadata->'old_data' as old_data,
  a.metadata->'new_data' as new_data
FROM activities a
WHERE a.metadata->'changes' IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 20;
*/

-- ============================================
-- 5. VERIFICATION
-- ============================================

DO $$
DECLARE
    activity_count INTEGER;
    edit_activity_count INTEGER;
BEGIN
    -- Count total activities
    SELECT COUNT(*) INTO activity_count FROM activities;
    RAISE NOTICE 'Total activities in database: %', activity_count;
    
    -- Count edit activities
    SELECT COUNT(*) INTO edit_activity_count 
    FROM activities 
    WHERE description LIKE '%edited%' OR description LIKE '%updated%';
    RAISE NOTICE 'Total edit activities: %', edit_activity_count;
    
    RAISE NOTICE 'Enhanced activities table setup completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'The activities table now supports detailed tracking of:';
    RAISE NOTICE '  - Contact edits (with call_status, notes, follow_up_date changes)';
    RAISE NOTICE '  - Sub-account edits (with name, state, city, address, pincode, etc.)';
    RAISE NOTICE '  - Account edits (with name, stage, tag, assigned employee, etc.)';
    RAISE NOTICE '  - Lead edits (with name, status, priority, assigned employee, etc.)';
    RAISE NOTICE '  - Task edits (with title, status, due date, assigned employee, etc.)';
    RAISE NOTICE '';
    RAISE NOTICE 'All edit activities include:';
    RAISE NOTICE '  - changes: Array of change descriptions';
    RAISE NOTICE '  - old_data: Complete old record data';
    RAISE NOTICE '  - new_data: Complete new record data';
END $$;

-- ============================================
-- END OF SCRIPT
-- ============================================
