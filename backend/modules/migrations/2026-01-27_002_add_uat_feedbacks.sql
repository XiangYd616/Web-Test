CREATE TABLE IF NOT EXISTS uat_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(120) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  test_type VARCHAR(50) NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]',
  ratings JSONB NOT NULL DEFAULT '{}',
  issues JSONB NOT NULL DEFAULT '[]',
  comments TEXT,
  completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_uat_feedbacks_user_id ON uat_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_uat_feedbacks_workspace_id ON uat_feedbacks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_uat_feedbacks_test_type ON uat_feedbacks(test_type);

DROP TRIGGER IF EXISTS update_uat_feedbacks_updated_at ON uat_feedbacks;
CREATE TRIGGER update_uat_feedbacks_updated_at
  BEFORE UPDATE ON uat_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
