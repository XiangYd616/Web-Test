-- 归档/清理任务外键与索引补齐
-- 创建时间: 2026-01-22

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'archive_jobs' AND column_name = 'policy_id'
    ) THEN
        ALTER TABLE archive_jobs
        ADD COLUMN policy_id VARCHAR(80);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_archive_jobs_policy'
    ) THEN
        ALTER TABLE archive_jobs
        ADD CONSTRAINT fk_archive_jobs_policy
        FOREIGN KEY (policy_id) REFERENCES archive_policies(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_archive_jobs_policy ON archive_jobs(policy_id);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_status_created ON archive_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_status_created ON cleanup_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_policies_enabled ON cleanup_policies(enabled);

COMMIT;
