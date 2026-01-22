-- Deprecated / Merged into data/schema.sql as baseline
-- Do NOT execute in production after 2026-01
-- Last reviewed: 2026-01

-- Migration: Postman Core Tables
-- Created: 2026-01-18
-- Description: Collections/Environments/Workspaces/Runs/Variables

/* 已合并到 data/schema.sql，迁移保留作为历史记录。

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspaces_created_by ON workspaces(created_by);
CREATE INDEX IF NOT EXISTS idx_workspaces_visibility ON workspaces(visibility);
CREATE INDEX IF NOT EXISTS idx_workspaces_metadata_gin ON workspaces USING GIN (metadata);

-- 2. Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  permissions JSONB DEFAULT '[]',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON workspace_members(status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_permissions_gin ON workspace_members USING GIN (permissions);

-- 3. Collections
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50),
  auth JSONB DEFAULT '{}',
  events JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collections_workspace_id ON collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON collections(created_by);
CREATE INDEX IF NOT EXISTS idx_collections_auth_gin ON collections USING GIN (auth);
CREATE INDEX IF NOT EXISTS idx_collections_events_gin ON collections USING GIN (events);
CREATE INDEX IF NOT EXISTS idx_collections_variables_gin ON collections USING GIN (variables);
CREATE INDEX IF NOT EXISTS idx_collections_metadata_gin ON collections USING GIN (metadata);

-- 4. Collection Items (Folder/Request) - 已废弃（legacy）
-- CREATE TABLE IF NOT EXISTS collection_items (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
--   parent_id UUID REFERENCES collection_items(id) ON DELETE CASCADE,
--   type VARCHAR(20) NOT NULL CHECK (type IN ('folder', 'request')),
--   name VARCHAR(255) NOT NULL,
--   description TEXT,
--   request_data JSONB DEFAULT '{}',
--   order_index INTEGER DEFAULT 0,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
-- CREATE INDEX IF NOT EXISTS idx_collection_items_parent_id ON collection_items(parent_id);
-- CREATE INDEX IF NOT EXISTS idx_collection_items_type ON collection_items(type);
-- CREATE INDEX IF NOT EXISTS idx_collection_items_request_data_gin ON collection_items USING GIN (request_data);

-- 5. Environments
CREATE TABLE IF NOT EXISTS environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_environments_workspace_id ON environments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_environments_created_by ON environments(created_by);
CREATE INDEX IF NOT EXISTS idx_environments_config_gin ON environments USING GIN (config);
CREATE INDEX IF NOT EXISTS idx_environments_metadata_gin ON environments USING GIN (metadata);

-- 6. Environment Variables
CREATE TABLE IF NOT EXISTS environment_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  type VARCHAR(50) DEFAULT 'string',
  enabled BOOLEAN DEFAULT true,
  secret BOOLEAN DEFAULT false,
  encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(environment_id, key)
);

CREATE INDEX IF NOT EXISTS idx_environment_variables_environment_id ON environment_variables(environment_id);
CREATE INDEX IF NOT EXISTS idx_environment_variables_key ON environment_variables(key);
CREATE INDEX IF NOT EXISTS idx_environment_variables_enabled ON environment_variables(enabled);

-- 7. Global Variables
CREATE TABLE IF NOT EXISTS global_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value TEXT,
  type VARCHAR(50) DEFAULT 'string',
  enabled BOOLEAN DEFAULT true,
  secret BOOLEAN DEFAULT false,
  encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, workspace_id, key)
);

CREATE INDEX IF NOT EXISTS idx_global_variables_user_id ON global_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_global_variables_workspace_id ON global_variables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_global_variables_key ON global_variables(key);
CREATE INDEX IF NOT EXISTS idx_global_variables_enabled ON global_variables(enabled);

-- 8. Runs
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  environment_id UUID REFERENCES environments(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  summary JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runs_workspace_id ON runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_runs_collection_id ON runs(collection_id);
CREATE INDEX IF NOT EXISTS idx_runs_environment_id ON runs(environment_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_summary_gin ON runs USING GIN (summary);

-- 9. Run Results
CREATE TABLE IF NOT EXISTS run_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  request_snapshot JSONB DEFAULT '{}',
  response JSONB DEFAULT '{}',
  assertions JSONB DEFAULT '[]',
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_run_results_run_id ON run_results(run_id);
CREATE INDEX IF NOT EXISTS idx_run_results_success ON run_results(success);
CREATE INDEX IF NOT EXISTS idx_run_results_request_gin ON run_results USING GIN (request_snapshot);
CREATE INDEX IF NOT EXISTS idx_run_results_response_gin ON run_results USING GIN (response);
CREATE INDEX IF NOT EXISTS idx_run_results_assertions_gin ON run_results USING GIN (assertions);

-- 10. update_updated_at trigger
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER update_workspace_members_updated_at
BEFORE UPDATE ON workspace_members
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- DROP TRIGGER IF EXISTS update_collection_items_updated_at ON collection_items;
-- CREATE TRIGGER update_collection_items_updated_at
-- BEFORE UPDATE ON collection_items
-- FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_environments_updated_at ON environments;
CREATE TRIGGER update_environments_updated_at
BEFORE UPDATE ON environments
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_environment_variables_updated_at ON environment_variables;
CREATE TRIGGER update_environment_variables_updated_at
BEFORE UPDATE ON environment_variables
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_variables_updated_at ON global_variables;
CREATE TRIGGER update_global_variables_updated_at
BEFORE UPDATE ON global_variables
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_runs_updated_at ON runs;
CREATE TRIGGER update_runs_updated_at
BEFORE UPDATE ON runs
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_run_results_updated_at ON run_results;
CREATE TRIGGER update_run_results_updated_at
BEFORE UPDATE ON run_results
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
*/
