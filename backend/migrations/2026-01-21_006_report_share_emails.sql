-- Migration: Report share email log table
-- Created: 2026-01-21

/*
  已合并到 data/schema.sql，迁移中保留作为历史记录。

CREATE TABLE IF NOT EXISTS report_share_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES test_reports(id) ON DELETE CASCADE,
  share_id UUID NOT NULL REFERENCES report_shares(id) ON DELETE CASCADE,
  recipients JSONB NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','sent','failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_share_emails_report_id ON report_share_emails(report_id);
CREATE INDEX IF NOT EXISTS idx_report_share_emails_share_id ON report_share_emails(share_id);
CREATE INDEX IF NOT EXISTS idx_report_share_emails_status ON report_share_emails(status);
CREATE INDEX IF NOT EXISTS idx_report_share_emails_next_retry_at ON report_share_emails(next_retry_at);

DROP TRIGGER IF EXISTS update_report_share_emails_updated_at ON report_share_emails;
CREATE TRIGGER update_report_share_emails_updated_at
BEFORE UPDATE ON report_share_emails
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
*/
