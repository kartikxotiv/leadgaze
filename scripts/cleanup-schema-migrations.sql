-- Cleanup script for duplicate schema_migrations entries
-- Run this on your remote Supabase database if you get duplicate key errors

-- First, check what migrations are recorded
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;

-- Remove any duplicate entries (keep only the first occurrence)
-- Note: Adjust the version numbers based on what you see from the SELECT above
-- This example removes common problematic versions:

DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN (
  '20251029093956',
  '20251029093958', 
  '20251029093959',
  '20251029094007'
)
AND version NOT IN (
  SELECT MIN(version) 
  FROM supabase_migrations.schema_migrations 
  GROUP BY version
);

-- Alternative: If you want to completely reset (use with caution!)
-- This will remove ALL migration records, forcing re-application
-- DELETE FROM supabase_migrations.schema_migrations;

