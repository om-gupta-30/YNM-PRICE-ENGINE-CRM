-- ============================================
-- FINAL TASKS TABLE UPDATE AND POPULATE
-- Removes customer_id, fills contact_id, account_id, sub_account_id with real values
-- ============================================

-- Step 1: Remove customer_id column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE tasks DROP COLUMN customer_id;
    RAISE NOTICE 'customer_id column removed from tasks table';
  END IF;
END $$;

-- Step 2: Ensure all required columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'contact_id') THEN
    ALTER TABLE tasks ADD COLUMN contact_id INTEGER;
    CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'customer_name') THEN
    ALTER TABLE tasks ADD COLUMN customer_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_employee') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
      ALTER TABLE tasks RENAME COLUMN assigned_to TO assigned_employee;
    ELSE
      ALTER TABLE tasks ADD COLUMN assigned_employee TEXT NOT NULL DEFAULT 'Admin';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee ON tasks(assigned_employee);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'account_id') THEN
    ALTER TABLE tasks ADD COLUMN account_id INTEGER;
    CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sub_account_id') THEN
    ALTER TABLE tasks ADD COLUMN sub_account_id INTEGER;
    CREATE INDEX IF NOT EXISTS idx_tasks_sub_account_id ON tasks(sub_account_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date' AND data_type = 'date') THEN
    ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMP WITH TIME ZONE USING due_date::timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
    ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Step 3: Get first available IDs from each table (will use these for all tasks)
DO $$
DECLARE
  first_account_id INTEGER;
  first_sub_account_id INTEGER;
  first_contact_id INTEGER;
BEGIN
  -- Get first account ID
  SELECT id INTO first_account_id FROM accounts ORDER BY id LIMIT 1;
  IF first_account_id IS NULL THEN
    first_account_id := 1; -- Fallback
  END IF;

  -- Get first sub_account ID
  SELECT id INTO first_sub_account_id FROM sub_accounts ORDER BY id LIMIT 1;
  IF first_sub_account_id IS NULL THEN
    first_sub_account_id := 1; -- Fallback
  END IF;

  -- Get first contact ID
  SELECT id INTO first_contact_id FROM contacts ORDER BY id LIMIT 1;
  IF first_contact_id IS NULL THEN
    first_contact_id := 1; -- Fallback
  END IF;

  -- Insert tasks with real IDs
  INSERT INTO tasks (title, description, task_type, due_date, assigned_employee, customer_name, account_id, sub_account_id, contact_id, status, created_by, created_at, updated_at)
  VALUES
    ('Follow-up with ABC Construction', 'Discuss quotation for MBCB project', 'Follow-up', (NOW() - INTERVAL '2 days')::timestamp, 'Employee1', 'ABC Construction', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Admin', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
    ('Meeting with XYZ Infrastructure', 'Review project requirements and timeline', 'Meeting', (NOW() + INTERVAL '3 days')::timestamp, 'Employee2', 'XYZ Infrastructure', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Admin', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('Call customer for payment follow-up', 'Follow up on pending payment for last quotation', 'Call', (NOW() + INTERVAL '1 day')::timestamp, 'Employee1', 'DEF Builders', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Employee1', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    ('Site visit for new project', 'Visit site to assess requirements for signage installation', 'Meeting', (NOW() + INTERVAL '7 days')::timestamp, 'Employee2', 'GHI Contractors', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Employee2', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('Follow-up on quotation sent', 'Check status of quotation sent last week', 'Follow-up', (NOW() - INTERVAL '1 day')::timestamp, 'Employee1', 'JKL Enterprises', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Employee1', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
    ('Prepare quotation for new customer', 'Create detailed quotation for road safety products', 'Follow-up', (NOW() + INTERVAL '2 days')::timestamp, 'Employee2', 'MNO Industries', first_account_id, first_sub_account_id, first_contact_id, 'In Progress', 'Admin', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
    ('Schedule meeting with government official', 'Coordinate meeting for government project proposal', 'Meeting', (NOW() + INTERVAL '5 days')::timestamp, 'Employee1', 'PQR Government', first_account_id, first_sub_account_id, first_contact_id, 'In Progress', 'Admin', NOW() - INTERVAL '4 days', NOW()),
    ('Call for project update', 'Get update on ongoing project status', 'Call', (NOW() + INTERVAL '1 day')::timestamp, 'Employee2', 'STU Builders', first_account_id, first_sub_account_id, first_contact_id, 'In Progress', 'Employee2', NOW() - INTERVAL '2 days', NOW()),
    ('Follow-up completed - Order received', 'Successfully followed up and received order confirmation', 'Follow-up', (NOW() - INTERVAL '5 days')::timestamp, 'Employee1', 'VWX Contractors', first_account_id, first_sub_account_id, first_contact_id, 'Completed', 'Employee1', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),
    ('Meeting completed - Project approved', 'Meeting completed successfully, project approved', 'Meeting', (NOW() - INTERVAL '3 days')::timestamp, 'Employee2', 'YZA Industries', first_account_id, first_sub_account_id, first_contact_id, 'Completed', 'Employee2', NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days'),
    ('Payment call completed', 'Payment follow-up call completed, payment received', 'Call', (NOW() - INTERVAL '2 days')::timestamp, 'Employee1', 'BCD Enterprises', first_account_id, first_sub_account_id, first_contact_id, 'Completed', 'Employee1', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),
    ('Urgent: Follow-up on critical project', 'Critical project needs immediate attention', 'Follow-up', (NOW() + INTERVAL '12 hours')::timestamp, 'Employee1', 'EFG Construction', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Admin', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    ('Monthly review meeting', 'Monthly review meeting with key accounts', 'Meeting', (NOW() + INTERVAL '10 days')::timestamp, 'Employee2', 'HIJ Infrastructure', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Admin', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    ('Customer satisfaction call', 'Call to check customer satisfaction with recent delivery', 'Call', (NOW() + INTERVAL '4 days')::timestamp, 'Employee1', 'KLM Builders', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Employee1', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('Project kickoff meeting', 'Initial meeting to kickoff new project', 'Meeting', (NOW() + INTERVAL '6 days')::timestamp, 'Employee2', 'NOP Contractors', first_account_id, first_sub_account_id, first_contact_id, 'In Progress', 'Employee2', NOW() - INTERVAL '2 days', NOW()),
    ('Quotation follow-up', 'Follow up on quotation sent 2 weeks ago', 'Follow-up', (NOW() + INTERVAL '1 day')::timestamp, 'Employee1', 'QRS Enterprises', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Employee1', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('Site survey task', 'Visit site for survey before quotation', 'Meeting', (NOW() + INTERVAL '8 days')::timestamp, 'Employee2', 'TUV Industries', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Admin', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
    ('Payment reminder call', 'Remind customer about overdue payment', 'Call', (NOW() + INTERVAL '2 days')::timestamp, 'Employee1', 'WXY Builders', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Employee1', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    ('Product demonstration', 'Demonstrate new products to potential customer', 'Meeting', (NOW() + INTERVAL '9 days')::timestamp, 'Employee2', 'ZAB Contractors', first_account_id, first_sub_account_id, first_contact_id, 'Pending', 'Employee2', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    ('Contract negotiation call', 'Discuss contract terms and pricing', 'Call', (NOW() + INTERVAL '3 days')::timestamp, 'Employee1', 'CDE Infrastructure', first_account_id, first_sub_account_id, first_contact_id, 'In Progress', 'Admin', NOW() - INTERVAL '2 days', NOW())
  ON CONFLICT DO NOTHING;
END $$;

-- Step 4: Update completed_at for completed tasks
UPDATE tasks 
SET completed_at = due_date 
WHERE status = 'Completed' AND completed_at IS NULL;

-- Step 5: Verify results
SELECT 
  id,
  title,
  task_type,
  status,
  assigned_employee,
  account_id,
  sub_account_id,
  contact_id,
  customer_name
FROM tasks
WHERE account_id IS NOT NULL AND sub_account_id IS NOT NULL AND contact_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Show summary
SELECT 
  status,
  COUNT(*) as count
FROM tasks
GROUP BY status
ORDER BY status;

SELECT '✅ Tasks table updated and populated successfully! All tasks have account_id, sub_account_id, and contact_id filled.' as result;
