-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

-- Migration: Shared updated_at trigger function
-- Created: 2026-01-18
-- Description: Extract shared update_updated_at_column function

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';
