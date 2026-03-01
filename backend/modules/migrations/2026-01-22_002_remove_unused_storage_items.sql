-- 2026-01-22: Remove unused storage_items table (confirmed no references)
BEGIN;

DROP TABLE IF EXISTS storage_items CASCADE;

COMMIT;
