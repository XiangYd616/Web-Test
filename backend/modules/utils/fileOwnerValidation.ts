import { query } from '../config/database';
import { getAllowedMimeTypes } from './fileUploadConfig';

export type FileOwnerType =
  | 'workspace'
  | 'collection'
  | 'environment'
  | 'run'
  | 'test_execution'
  | 'test_report'
  | 'user';

const allowedOwnerTypes = new Set<FileOwnerType>([
  'workspace',
  'collection',
  'environment',
  'run',
  'test_execution',
  'test_report',
  'user',
]);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ensureWorkspaceMember = async (workspaceId: string, userId: string) => {
  const result = await query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND status = $3',
    [workspaceId, userId, 'active']
  );
  return result.rows.length > 0;
};

type OwnerValidationResult = { ok: true } | { ok: false; error: string };

export const validateOwnerBinding = async (
  ownerType: string | undefined,
  ownerId: string | undefined,
  userId: string
): Promise<OwnerValidationResult> => {
  if (!ownerType && !ownerId) {
    return { ok: true };
  }

  if (!ownerType || !ownerId) {
    return { ok: false, error: 'ownerType 与 ownerId 需同时提供' };
  }

  if (!allowedOwnerTypes.has(ownerType as FileOwnerType)) {
    return { ok: false, error: 'ownerType 不在允许范围' };
  }

  if (!uuidRegex.test(ownerId)) {
    return { ok: false, error: 'ownerId 不是合法 UUID' };
  }

  switch (ownerType) {
    case 'workspace': {
      const hasAccess = await ensureWorkspaceMember(ownerId, userId);
      return hasAccess ? { ok: true } : { ok: false, error: '无权限关联该工作空间' };
    }
    case 'collection': {
      const result = await query('SELECT workspace_id FROM collections WHERE id = $1', [ownerId]);
      const workspaceId = result.rows?.[0]?.workspace_id as string | undefined;
      if (!workspaceId) {
        return { ok: false, error: '集合不存在' };
      }
      const hasAccess = await ensureWorkspaceMember(workspaceId, userId);
      return hasAccess ? { ok: true } : { ok: false, error: '无权限关联该集合' };
    }
    case 'environment': {
      const result = await query('SELECT workspace_id FROM environments WHERE id = $1', [ownerId]);
      const workspaceId = result.rows?.[0]?.workspace_id as string | undefined;
      if (!workspaceId) {
        return { ok: false, error: '环境不存在' };
      }
      const hasAccess = await ensureWorkspaceMember(workspaceId, userId);
      return hasAccess ? { ok: true } : { ok: false, error: '无权限关联该环境' };
    }
    case 'run': {
      const result = await query('SELECT workspace_id, user_id FROM runs WHERE id = $1', [ownerId]);
      const row = result.rows?.[0] as { workspace_id?: string; user_id?: string } | undefined;
      if (!row) {
        return { ok: false, error: '运行记录不存在' };
      }
      if (row.workspace_id) {
        const hasAccess = await ensureWorkspaceMember(String(row.workspace_id), userId);
        return hasAccess ? { ok: true } : { ok: false, error: '无权限关联该运行记录' };
      }
      return row.user_id === userId ? { ok: true } : { ok: false, error: '无权限关联该运行记录' };
    }
    case 'test_execution': {
      const result = await query(
        'SELECT workspace_id, user_id FROM test_executions WHERE id = $1',
        [ownerId]
      );
      const row = result.rows?.[0] as { workspace_id?: string; user_id?: string } | undefined;
      if (!row) {
        return { ok: false, error: '测试执行不存在' };
      }
      if (row.workspace_id) {
        const hasAccess = await ensureWorkspaceMember(String(row.workspace_id), userId);
        return hasAccess ? { ok: true } : { ok: false, error: '无权限关联该测试执行' };
      }
      return row.user_id === userId ? { ok: true } : { ok: false, error: '无权限关联该测试执行' };
    }
    case 'test_report': {
      const result = await query('SELECT workspace_id, user_id FROM test_reports WHERE id = $1', [
        ownerId,
      ]);
      const row = result.rows?.[0] as { workspace_id?: string; user_id?: string } | undefined;
      if (!row) {
        return { ok: false, error: '测试报告不存在' };
      }
      if (row.workspace_id) {
        const hasAccess = await ensureWorkspaceMember(String(row.workspace_id), userId);
        return hasAccess ? { ok: true } : { ok: false, error: '无权限关联该测试报告' };
      }
      return row.user_id === userId ? { ok: true } : { ok: false, error: '无权限关联该测试报告' };
    }
    case 'user': {
      return ownerId === userId ? { ok: true } : { ok: false, error: '无权限关联该用户' };
    }
    default:
      return { ok: false, error: 'ownerType 不支持' };
  }
};

export const validateMimeType = (mimeType: string) => {
  const allowed = getAllowedMimeTypes();
  return allowed.has(mimeType.toLowerCase());
};
