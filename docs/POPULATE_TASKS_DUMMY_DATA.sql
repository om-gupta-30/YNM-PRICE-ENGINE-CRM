-- ============================================
-- POPULATE TASKS TABLE WITH DUMMY DATA
-- This script checks actual table structure and inserts data accordingly
-- ============================================

-- First, check what columns actually exist and add missing ones
DO $$ 
BEGIN
  -- Add customer_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN customer_id INTEGER;
    CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
    RAISE NOTICE 'customer_id column added to tasks table';
  END IF;

  -- Add customer_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE tasks ADD COLUMN customer_name TEXT;
    RAISE NOTICE 'customer_name column added to tasks table';
  END IF;

  -- Check if assigned_employee exists (the actual column name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'assigned_employee'
  ) THEN
    -- If assigned_to exists, rename it to assigned_employee
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'assigned_to'
    ) THEN
      ALTER TABLE tasks RENAME COLUMN assigned_to TO assigned_employee;
      RAISE NOTICE 'assigned_to renamed to assigned_employee';
    ELSE
      ALTER TABLE tasks ADD COLUMN assigned_employee TEXT NOT NULL DEFAULT 'Admin';
      RAISE NOTICE 'assigned_employee column added to tasks table';
    END IF;
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee ON tasks(assigned_employee);
  END IF;

  -- Add account_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN account_id INTEGER;
    CREATE INDEX IF NOT EXISTS idx_tasks_account_id ON tasks(account_id);
    RAISE NOTICE 'account_id column added to tasks table';
  END IF;

  -- Add sub_account_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'sub_account_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN sub_account_id INTEGER;
    CREATE INDEX IF NOT EXISTS idx_tasks_sub_account_id ON tasks(sub_account_id);
    RAISE NOTICE 'sub_account_id column added to tasks table';
  END IF;

  -- Ensure due_date supports timestamp
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
    AND column_name = 'due_date' 
    AND data_type = 'date'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN due_date TYPE TIMESTAMP WITH TIME ZONE USING due_date::timestamp with time zone;
    RAISE NOTICE 'due_date column changed to TIMESTAMP WITH TIME ZONE';
  END IF;

  -- Add completed_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'completed_at column added to tasks table';
  END IF;
END $$;

-- Now insert sample tasks using the CORRECT column name: assigned_employee
-- Using NULL for account_id and sub_account_id to avoid foreign key errors
INSERT INTO tasks (title, description, task_type, due_date, assigned_employee, customer_id, customer_name, account_id, sub_account_id, status, created_by, created_at, updated_at)
VALUES
  -- Pending tasks (some overdue, some upcoming)
  ('Follow-up with ABC Construction', 'Discuss quotation for MBCB project', 'Follow-up', (NOW() - INTERVAL '2 days')::timestamp, 'Employee1', NULL, 'ABC Construction', NULL, NULL, 'Pending', 'Admin', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
  ('Meeting with XYZ Infrastructure', 'Review project requirements and timeline', 'Meeting', (NOW() + INTERVAL '3 days')::timestamp, 'Employee2', NULL, 'XYZ Infrastructure', NULL, NULL, 'Pending', 'Admin', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('Call customer for payment follow-up', 'Follow up on pending payment for last quotation', 'Call', (NOW() + INTERVAL '1 day')::timestamp, 'Employee1', NULL, 'DEF Builders', NULL, NULL, 'Pending', 'Employee1', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('Site visit for new project', 'Visit site to assess requirements for signage installation', 'Meeting', (NOW() + INTERVAL '7 days')::timestamp, 'Employee2', NULL, 'GHI Contractors', NULL, NULL, 'Pending', 'Employee2', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('Follow-up on quotation sent', 'Check status of quotation sent last week', 'Follow-up', (NOW() - INTERVAL '1 day')::timestamp, 'Employee1', NULL, 'JKL Enterprises', NULL, NULL, 'Pending', 'Employee1', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
  
  -- In Progress tasks
  ('Prepare quotation for new customer', 'Create detailed quotation for road safety products', 'Follow-up', (NOW() + INTERVAL '2 days')::timestamp, 'Employee2', NULL, 'MNO Industries', NULL, NULL, 'In Progress', 'Admin', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
  ('Schedule meeting with government official', 'Coordinate meeting for government project proposal', 'Meeting', (NOW() + INTERVAL '5 days')::timestamp, 'Employee1', NULL, 'PQR Government', NULL, NULL, 'In Progress', 'Admin', NOW() - INTERVAL '4 days', NOW()),
  ('Call for project update', 'Get update on ongoing project status', 'Call', (NOW() + INTERVAL '1 day')::timestamp, 'Employee2', NULL, 'STU Builders', NULL, NULL, 'In Progress', 'Employee2', NOW() - INTERVAL '2 days', NOW()),
  
  -- Completed tasks
  ('Follow-up completed - Order received', 'Successfully followed up and received order confirmation', 'Follow-up', (NOW() - INTERVAL '5 days')::timestamp, 'Employee1', NULL, 'VWX Contractors', NULL, NULL, 'Completed', 'Employee1', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),
  ('Meeting completed - Project approved', 'Meeting completed successfully, project approved', 'Meeting', (NOW() - INTERVAL '3 days')::timestamp, 'Employee2', NULL, 'YZA Industries', NULL, NULL, 'Completed', 'Employee2', NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days'),
  ('Payment call completed', 'Payment follow-up call completed, payment received', 'Call', (NOW() - INTERVAL '2 days')::timestamp, 'Employee1', NULL, 'BCD Enterprises', NULL, NULL, 'Completed', 'Employee1', NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days'),
  
  -- More varied tasks
  ('Urgent: Follow-up on critical project', 'Critical project needs immediate attention', 'Follow-up', (NOW() + INTERVAL '12 hours')::timestamp, 'Employee1', NULL, 'EFG Construction', NULL, NULL, 'Pending', 'Admin', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('Monthly review meeting', 'Monthly review meeting with key accounts', 'Meeting', (NOW() + INTERVAL '10 days')::timestamp, 'Employee2', NULL, 'HIJ Infrastructure', NULL, NULL, 'Pending', 'Admin', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('Customer satisfaction call', 'Call to check customer satisfaction with recent delivery', 'Call', (NOW() + INTERVAL '4 days')::timestamp, 'Employee1', NULL, 'KLM Builders', NULL, NULL, 'Pending', 'Employee1', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('Project kickoff meeting', 'Initial meeting to kickoff new project', 'Meeting', (NOW() + INTERVAL '6 days')::timestamp, 'Employee2', NULL, 'NOP Contractors', NULL, NULL, 'In Progress', 'Employee2', NOW() - INTERVAL '2 days', NOW()),
  ('Quotation follow-up', 'Follow up on quotation sent 2 weeks ago', 'Follow-up', (NOW() + INTERVAL '1 day')::timestamp, 'Employee1', NULL, 'QRS Enterprises', NULL, NULL, 'Pending', 'Employee1', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('Site survey task', 'Visit site for survey before quotation', 'Meeting', (NOW() + INTERVAL '8 days')::timestamp, 'Employee2', NULL, 'TUV Industries', NULL, NULL, 'Pending', 'Admin', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  ('Payment reminder call', 'Remind customer about overdue payment', 'Call', (NOW() + INTERVAL '2 days')::timestamp, 'Employee1', NULL, 'WXY Builders', NULL, NULL, 'Pending', 'Employee1', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('Product demonstration', 'Demonstrate new products to potential customer', 'Meeting', (NOW() + INTERVAL '9 days')::timestamp, 'Employee2', NULL, 'ZAB Contractors', NULL, NULL, 'Pending', 'Employee2', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('Contract negotiation call', 'Discuss contract terms and pricing', 'Call', (NOW() + INTERVAL '3 days')::timestamp, 'Employee1', NULL, 'CDE Infrastructure', NULL, NULL, 'In Progress', 'Admin', NOW() - INTERVAL '2 days', NOW())
ON CONFLICT DO NOTHING;

-- Update completed_at for completed tasks
UPDATE tasks 
SET completed_at = due_date 
WHERE status = 'Completed' AND completed_at IS NULL;

-- Verify inserted tasks
SELECT 
  id,
  title,
  task_type,
  due_date,
  status,
  assigned_employee,
  CASE 
    WHEN due_date < NOW() AND status NOT IN ('Completed', 'Cancelled') THEN 'Overdue'
    WHEN due_date >= NOW() AND status NOT IN ('Completed', 'Cancelled') THEN 'Upcoming'
    ELSE status
  END as task_status_display
FROM tasks
ORDER BY due_date ASC
LIMIT 10;

-- Show summary
SELECT 
  status,
  COUNT(*) as count
FROM tasks
GROUP BY status
ORDER BY status;

SELECT '✅ Dummy tasks data inserted successfully!' as result;
