-- ============================================
-- ENSURE RELATED_PRODUCTS IS TEXT[] ARRAY
-- This script ensures related_products column is TEXT[] type
-- ============================================

-- Check and update related_products column type
DO $$
BEGIN
  -- Check if column exists and its current type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounts' AND column_name = 'related_products'
  ) THEN
    -- Check current type
    DECLARE
      current_type TEXT;
    BEGIN
      SELECT data_type INTO current_type
      FROM information_schema.columns
      WHERE table_name = 'accounts' AND column_name = 'related_products';
      
      -- If it's JSONB, convert to TEXT[]
      IF current_type = 'jsonb' THEN
        -- Convert JSONB to TEXT[]
        ALTER TABLE accounts 
        ALTER COLUMN related_products TYPE TEXT[] 
        USING CASE 
          WHEN related_products IS NULL THEN '{}'::TEXT[]
          WHEN jsonb_typeof(related_products) = 'array' THEN 
            ARRAY(SELECT jsonb_array_elements_text(related_products))
          ELSE '{}'::TEXT[]
        END;
        
        RAISE NOTICE 'Converted related_products from JSONB to TEXT[]';
      ELSIF current_type != 'ARRAY' THEN
        -- If it's not an array type, convert it
        ALTER TABLE accounts 
        ALTER COLUMN related_products TYPE TEXT[] 
        USING CASE 
          WHEN related_products IS NULL THEN '{}'::TEXT[]
          ELSE ARRAY[related_products::TEXT]
        END;
        
        RAISE NOTICE 'Converted related_products to TEXT[]';
      ELSE
        RAISE NOTICE 'related_products is already TEXT[]';
      END IF;
    END;
  ELSE
    -- Column doesn't exist, create it
    ALTER TABLE accounts 
    ADD COLUMN related_products TEXT[] DEFAULT '{}';
    
    RAISE NOTICE 'Added related_products column as TEXT[]';
  END IF;
  
  -- Ensure default is empty array
  ALTER TABLE accounts 
  ALTER COLUMN related_products SET DEFAULT '{}';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  'Accounts Table - Related Products Column' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND column_name = 'related_products'
      AND data_type = 'ARRAY'
    ) THEN '✅ related_products column exists as TEXT[]'
    ELSE '❌ related_products column missing or wrong type'
  END as status;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Related products column is ready as TEXT[] array!' as result;
