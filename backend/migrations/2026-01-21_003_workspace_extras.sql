-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

-- Migration: Workspace extras (invitations, activities, resources)
-- Created: 2026-01-21

/* 已合并到 data/schema.sql，迁移保留作为历史记录。

-- 1. Workspace Invitations
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '[]',
  token TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_inviter_id ON workspace_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status ON workspace_invitations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(invitee_email);

-- 2. Workspace Activities
CREATE TABLE IF NOT EXISTS workspace_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL,
  resource JSONB DEFAULT '{}',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_activities_workspace_id ON workspace_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_user_id ON workspace_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_type ON workspace_activities(type);
CREATE INDEX IF NOT EXISTS idx_workspace_activities_created_at ON workspace_activities(created_at);

-- 3. Workspace Resources
CREATE TABLE IF NOT EXISTS workspace_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  size BIGINT DEFAULT 0,
  mime_type VARCHAR(255),
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_resources_workspace_id ON workspace_resources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_resources_owner_id ON workspace_resources(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_resources_type ON workspace_resources(type);

DROP TRIGGER IF EXISTS update_workspace_resources_updated_at ON workspace_resources;
CREATE TRIGGER update_workspace_resources_updated_at
BEFORE UPDATE ON workspace_resources
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
*/
