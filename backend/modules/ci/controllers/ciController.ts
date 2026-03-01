/**
 * CI/CD 集成控制器
 * 提供 API Key 管理、Webhook 配置、触发测试、查询结果等端点
 */

import crypto from 'crypto';
import type { NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import type { ApiResponse, AuthenticatedRequest } from '../../types';

// ==================== 工具函数 ====================

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) throw new Error('用户未认证');
  return userId;
};

const hashApiKey = (key: string): string => crypto.createHash('sha256').update(key).digest('hex');

const generateApiKey = (): { fullKey: string; prefix: string } => {
  const raw = `twci_${uuidv4().replace(/-/g, '')}`;
  return { fullKey: raw, prefix: raw.slice(0, 12) };
};

// ==================== API Key 管理 ====================

const listApiKeys = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { workspaceId } = req.query;
  const result = await query(
    `SELECT id, name, key_prefix, scopes, last_used_at, expires_at, revoked, created_at
     FROM ci_api_keys WHERE user_id = $1 ${workspaceId ? 'AND workspace_id = $2' : ''}
     ORDER BY created_at DESC`,
    workspaceId ? [userId, workspaceId] : [userId]
  );
  const keys = (result.rows || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: typeof row.scopes === 'string' ? JSON.parse(row.scopes as string) : row.scopes,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revoked: Boolean(row.revoked),
    createdAt: row.created_at,
  }));
  return res.success(keys);
};

const createApiKey = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const {
    name,
    scopes = ['trigger', 'query'],
    workspaceId,
    expiresAt,
  } = req.body as {
    name?: string;
    scopes?: string[];
    workspaceId?: string;
    expiresAt?: string;
  };
  if (!name)
    return res.error(StandardErrorCode.INVALID_INPUT, 'API Key 名称是必需的', undefined, 400);

  const { fullKey, prefix } = generateApiKey();
  const keyHash = hashApiKey(fullKey);
  const id = uuidv4();

  await query(
    `INSERT INTO ci_api_keys (id, user_id, workspace_id, name, key_hash, key_prefix, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      userId,
      workspaceId || null,
      name,
      keyHash,
      prefix,
      JSON.stringify(scopes),
      expiresAt || null,
    ]
  );

  return res.success({
    id,
    name,
    key: fullKey,
    keyPrefix: prefix,
    scopes,
    expiresAt: expiresAt || null,
    message: '请妥善保存此 API Key，它不会再次显示',
  });
};

const revokeApiKey = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { keyId } = req.params;
  await query(
    `UPDATE ci_api_keys SET revoked = true, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
    [keyId, userId]
  );
  return res.success(null, 'API Key 已撤销');
};

// ==================== Webhook 管理 ====================

const listWebhooks = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { workspaceId } = req.query;
  const result = await query(
    `SELECT id, name, url, events, active, last_triggered_at, failure_count, created_at
     FROM ci_webhooks WHERE user_id = $1 ${workspaceId ? 'AND workspace_id = $2' : ''}
     ORDER BY created_at DESC`,
    workspaceId ? [userId, workspaceId] : [userId]
  );
  const hooks = (result.rows || []).map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    events: typeof row.events === 'string' ? JSON.parse(row.events as string) : row.events,
    active: Boolean(row.active),
    lastTriggeredAt: row.last_triggered_at,
    failureCount: Number(row.failure_count || 0),
    createdAt: row.created_at,
  }));
  return res.success(hooks);
};

const createWebhook = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const {
    name,
    url,
    secret,
    events = ['test.completed', 'test.failed'],
    workspaceId,
  } = req.body as {
    name?: string;
    url?: string;
    secret?: string;
    events?: string[];
    workspaceId?: string;
  };
  if (!name || !url)
    return res.error(
      StandardErrorCode.INVALID_INPUT,
      'Webhook 名称和 URL 是必需的',
      undefined,
      400
    );

  const id = uuidv4();
  await query(
    `INSERT INTO ci_webhooks (id, user_id, workspace_id, name, url, secret, events)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, userId, workspaceId || null, name, url, secret || null, JSON.stringify(events)]
  );
  return res.success({ id, name, url, events, active: true });
};

const updateWebhook = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { webhookId } = req.params;
  const { name, url, secret, events, active } = req.body as {
    name?: string;
    url?: string;
    secret?: string;
    events?: string[];
    active?: boolean;
  };

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (name !== undefined) {
    sets.push(`name = $${idx++}`);
    params.push(name);
  }
  if (url !== undefined) {
    sets.push(`url = $${idx++}`);
    params.push(url);
  }
  if (secret !== undefined) {
    sets.push(`secret = $${idx++}`);
    params.push(secret);
  }
  if (events !== undefined) {
    sets.push(`events = $${idx++}`);
    params.push(JSON.stringify(events));
  }
  if (active !== undefined) {
    sets.push(`active = $${idx++}`);
    params.push(active);
  }
  if (sets.length === 0)
    return res.error(StandardErrorCode.INVALID_INPUT, '没有需要更新的字段', undefined, 400);

  sets.push(`updated_at = NOW()`);
  params.push(webhookId, userId);
  await query(
    `UPDATE ci_webhooks SET ${sets.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`,
    params
  );
  return res.success(null, 'Webhook 已更新');
};

const deleteWebhook = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { webhookId } = req.params;
  await query(`DELETE FROM ci_webhooks WHERE id = $1 AND user_id = $2`, [webhookId, userId]);
  return res.success(null, 'Webhook 已删除');
};

// ==================== CI 触发测试 ====================

const triggerTest = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const {
    url,
    testType = 'performance',
    options = {},
    workspaceId,
    callbackUrl,
  } = req.body as {
    url?: string;
    testType?: string;
    options?: Record<string, unknown>;
    workspaceId?: string;
    callbackUrl?: string;
  };
  if (!url) return res.error(StandardErrorCode.INVALID_INPUT, 'URL 是必需的', undefined, 400);

  const testId = uuidv4();
  const config = JSON.stringify({ testType, url, options, ci: true, callbackUrl });

  await query(
    `INSERT INTO test_executions (test_id, user_id, workspace_id, engine_type, engine_name, test_name, test_url, test_config, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
    [
      testId,
      userId,
      workspaceId || null,
      testType,
      testType,
      `CI: ${testType} - ${url}`,
      url,
      config,
    ]
  );

  return res.success({
    testId,
    status: 'pending',
    message: '测试已加入队列',
    pollUrl: `/api/ci/status/${testId}`,
    resultUrl: `/api/ci/result/${testId}`,
  });
};

const getTestStatus = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { testId } = req.params;
  const result = await query(
    `SELECT test_id, status, progress, engine_type, test_url, created_at, started_at, completed_at, execution_time, error_message
     FROM test_executions WHERE test_id = $1 AND user_id = $2 LIMIT 1`,
    [testId, userId]
  );
  const row = result.rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return res.error(StandardErrorCode.NOT_FOUND, '测试不存在', undefined, 404);

  return res.success({
    testId: row.test_id,
    status: row.status,
    progress: Number(row.progress || 0),
    engineType: row.engine_type,
    url: row.test_url,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    executionTime: row.execution_time,
    error: row.error_message || null,
  });
};

const getTestResult = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { testId } = req.params;
  const execResult = await query(
    `SELECT id, status, engine_type FROM test_executions WHERE test_id = $1 AND user_id = $2 LIMIT 1`,
    [testId, userId]
  );
  const exec = execResult.rows?.[0] as Record<string, unknown> | undefined;
  if (!exec) return res.error(StandardErrorCode.NOT_FOUND, '测试不存在', undefined, 404);
  if (exec.status !== 'completed') {
    return res.success({ testId, status: exec.status, result: null, message: '测试尚未完成' });
  }

  const resultQuery = await query(
    `SELECT summary, score, grade, passed FROM test_results WHERE execution_id = $1 LIMIT 1`,
    [exec.id]
  );
  const resultRow = resultQuery.rows?.[0] as Record<string, unknown> | undefined;
  const parseSummary = (val: unknown) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return {};
      }
    }
    return val && typeof val === 'object' ? val : {};
  };

  return res.success({
    testId,
    status: 'completed',
    engineType: exec.engine_type,
    score: resultRow?.score ?? null,
    grade: resultRow?.grade ?? null,
    passed: resultRow?.passed != null ? Boolean(resultRow.passed) : null,
    summary: parseSummary(resultRow?.summary),
  });
};

// ==================== 导出 ====================

export default {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  triggerTest,
  getTestStatus,
  getTestResult,
};
