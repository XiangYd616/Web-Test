/**
 * 监控控制器
 * 职责: 处理监控相关的业务逻辑
 * 从 system/routes/monitoring.ts 中提取
 */

import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import type { ApiResponse, AuthenticatedRequest } from '../../types';
import { hasWorkspacePermission, resolveWorkspaceRole } from '../../utils/workspacePermissions';

// ==================== 类型定义 ====================

type MonitoringServiceApi = {
  getMonitoringTargets: (
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string | null;
      monitoringType?: string | null;
      search?: string | null;
      workspaceId?: string | null;
    }
  ) => Promise<{ data: Array<Record<string, unknown>>; pagination: Record<string, unknown> }>;
  getMonitoringSummary: (userId: string, workspaceId?: string) => Promise<Record<string, unknown>>;
  addMonitoringTarget: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  getMonitoringTarget: (
    siteId: string,
    userId: string,
    workspaceId?: string
  ) => Promise<Record<string, unknown> | null>;
  updateMonitoringTarget: (
    siteId: string,
    userId: string,
    updateData: Record<string, unknown>,
    workspaceId?: string
  ) => Promise<Record<string, unknown> | null>;
  removeMonitoringTarget: (
    siteId: string,
    userId: string,
    workspaceId?: string
  ) => Promise<boolean>;
  executeImmediateCheck: (
    siteId: string,
    userId: string,
    workspaceId?: string
  ) => Promise<Record<string, unknown>>;
  pauseMonitoringTarget: (
    siteId: string,
    userId: string,
    workspaceId?: string
  ) => Promise<Record<string, unknown> | null>;
  resumeMonitoringTarget: (
    siteId: string,
    userId: string,
    workspaceId?: string
  ) => Promise<Record<string, unknown> | null>;
  getAlerts: (
    userId: string,
    options?: Record<string, unknown>
  ) => Promise<{ data: Array<Record<string, unknown>>; pagination: Record<string, unknown> }>;
  getMonitoringStats: (
    userId?: string | null,
    workspaceId?: string
  ) => Promise<Record<string, unknown>>;
  healthCheck: () => Promise<Record<string, unknown>>;
};

interface AddSiteRequest {
  name: string;
  url: string;
  workspaceId?: string;
  monitoringType?: 'uptime' | 'performance' | 'security' | 'seo';
  checkInterval?: number;
  timeout?: number;
  config?: Record<string, unknown>;
  notificationSettings?: {
    email?: boolean;
    webhook?: boolean;
    threshold?: { responseTime?: number; uptime?: number; errorRate?: number };
  };
}

interface MonitoringQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'paused';
  monitoringType?: 'uptime' | 'performance' | 'security' | 'seo';
  search?: string;
  workspaceId?: string;
}

// ==================== 内部工具函数 ====================

let monitoringService: MonitoringServiceApi | null = null;

const setMonitoringService = (service: unknown): void => {
  monitoringService = service as MonitoringServiceApi;
};

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) throw new Error('用户未认证');
  return userId;
};

const ensureMonitoringService = (): MonitoringServiceApi | null => {
  return monitoringService;
};

/** 监控服务未注入时的空数据 fallback */
const EMPTY_LIST = {
  data: [] as Array<Record<string, unknown>>,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};
const EMPTY_STATS: Record<string, unknown> = {
  totalSites: 0,
  activeSites: 0,
  totalAlerts: 0,
  uptime: 100,
};
const EMPTY_SUMMARY: Record<string, unknown> = { totalSites: 0, activeSites: 0, downSites: 0 };

const ensureWorkspacePermission = async (
  workspaceId: string,
  userId: string,
  action: 'read' | 'write' | 'delete' | 'invite' | 'manage' | 'execute'
) => {
  const role = await resolveWorkspaceRole(workspaceId, userId, query);
  if (!role) throw new Error('没有权限访问该工作空间');
  if (!hasWorkspacePermission(role, action)) throw new Error('当前工作空间角色无此操作权限');
  return role;
};

// ==================== 控制器方法 ====================

const getSites = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const queryParams: MonitoringQuery = req.query;
  const userId = getUserId(req);
  const workspaceId = queryParams.workspaceId;
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'read');
    const service = ensureMonitoringService();
    if (!service)
      return res.success({
        sites: EMPTY_LIST.data,
        pagination: EMPTY_LIST.pagination,
        summary: EMPTY_SUMMARY,
      });
    const page = queryParams.page ? Number(queryParams.page) : 1;
    const limit = queryParams.limit ? Number(queryParams.limit) : 20;
    const result = await service.getMonitoringTargets(userId, {
      page,
      limit,
      status: queryParams.status || null,
      monitoringType: queryParams.monitoringType || null,
      search: queryParams.search || null,
      workspaceId: workspaceId ? String(workspaceId) : null,
    });
    const summary = await service.getMonitoringSummary(
      userId,
      workspaceId ? String(workspaceId) : undefined
    );
    return res.success({ sites: result.data, pagination: result.pagination, summary });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取监控站点列表失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getLoginGeo = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { workspaceId, days = 30 } = req.query as { workspaceId?: string; days?: string };
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'read');
    const rangeDays = Number(days) || 30;

    // user_sessions 表可能不存在或为空，安全返回
    try {
      const scopeClause = workspaceId
        ? "JOIN workspace_members wm ON wm.user_id = us.user_id AND wm.status = 'active' WHERE wm.workspace_id = $1"
        : 'WHERE us.user_id = $1';
      const geoResult = await query(
        `SELECT
          COALESCE(us.location->>'country', 'Unknown') as country,
          COALESCE(us.location->>'region', 'Unknown') as region,
          COUNT(*) as logins
        FROM user_sessions us
        ${scopeClause}
          AND us.created_at >= NOW() - ($2 || ' days')::interval
          AND us.location IS NOT NULL
        GROUP BY country, region
        ORDER BY logins DESC`,
        [workspaceId ? String(workspaceId) : userId, rangeDays]
      );
      return res.success({ items: geoResult.rows, rangeDays });
    } catch {
      // 表不存在或查询失败时返回空数据
      return res.success({ items: [], rangeDays });
    }
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取登录地区分布失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getRegionSla = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { workspaceId, days = 30 } = req.query as { workspaceId?: string; days?: string };
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'read');
    const rangeDays = Number(days) || 30;

    // user_sessions / test_executions 表可能不存在，安全返回
    try {
      const scopeClause = workspaceId
        ? "JOIN workspace_members wm ON wm.user_id = te.user_id AND wm.status = 'active' WHERE wm.workspace_id = $1"
        : 'WHERE te.user_id = $1';
      const slaResult = await query(
        `WITH latest_location AS (
          SELECT user_id, location
          FROM user_sessions
          WHERE location IS NOT NULL
          GROUP BY user_id
          HAVING created_at = MAX(created_at)
        )
        SELECT
          COALESCE(ll.location->>'country', 'Unknown') as country,
          COALESCE(ll.location->>'region', 'Unknown') as region,
          COUNT(*) as total_tests,
          SUM(CASE WHEN te.status = 'failed' THEN 1 ELSE 0 END) as failed_tests,
          AVG(te.execution_time) as avg_execution_time,
          AVG(CASE WHEN te.status = 'failed' THEN 1.0 ELSE 0.0 END) * 100 as failure_rate
        FROM test_executions te
        LEFT JOIN latest_location ll ON ll.user_id = te.user_id
        ${scopeClause}
          AND te.created_at >= NOW() - ($2 || ' days')::interval
        GROUP BY country, region
        ORDER BY total_tests DESC`,
        [workspaceId ? String(workspaceId) : userId, rangeDays]
      );
      return res.success({ items: slaResult.rows, rangeDays });
    } catch {
      // 表不存在或查询失败时返回空数据
      return res.success({ items: [], rangeDays });
    }
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取区域SLA统计失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const addSite = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const siteData: AddSiteRequest = req.body;
  const workspaceId = siteData.workspaceId;
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'write');
    const service = ensureMonitoringService();
    if (!service)
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '监控服务未启用', undefined, 500);
    const newSite = await service.addMonitoringTarget({
      user_id: userId,
      workspace_id: workspaceId || null,
      name: siteData.name,
      url: siteData.url,
      monitoring_type: siteData.monitoringType || 'uptime',
      check_interval: siteData.checkInterval || 300,
      timeout: siteData.timeout || 30,
      config: siteData.config || {},
      notification_settings: {
        email: true,
        webhook: false,
        threshold: { responseTime: 5000, uptime: 99.9, errorRate: 5 },
        ...siteData.notificationSettings,
      },
    });
    return res.success(newSite, '监控站点添加成功', 201);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '添加监控站点失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getSiteById = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const { workspaceId } = req.query as { workspaceId?: string };
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'read');
    const service = ensureMonitoringService();
    if (!service)
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '监控服务未启用', undefined, 500);
    const site = await service.getMonitoringTarget(
      id,
      userId,
      workspaceId ? String(workspaceId) : undefined
    );
    if (!site) return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
    return res.success(site);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取监控站点详情失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const updateSite = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const updateData = req.body;
  const workspaceId = updateData?.workspaceId || (req.query.workspaceId as string | undefined);
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'write');
    const service = ensureMonitoringService();
    if (!service)
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '监控服务未启用', undefined, 500);
    const updated = await service.updateMonitoringTarget(
      id,
      userId,
      updateData,
      workspaceId ? String(workspaceId) : undefined
    );
    if (!updated) return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
    return res.success(updated, '监控站点更新成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '更新监控站点失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const deleteSite = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const { workspaceId } = req.query as { workspaceId?: string };
  try {
    const userId = getUserId(req);
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'delete');
    const service = ensureMonitoringService();
    if (!service)
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '监控服务未启用', undefined, 500);
    const removed = await service.removeMonitoringTarget(
      id,
      userId,
      workspaceId ? String(workspaceId) : undefined
    );
    if (!removed) return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
    return res.success({ id }, '监控站点删除成功');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '删除监控站点失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const checkSite = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const { workspaceId } = req.query as { workspaceId?: string };
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'execute');
    const service = ensureMonitoringService();
    if (!service)
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '监控服务未启用', undefined, 500);
    const checkResult = await service.executeImmediateCheck(
      id,
      userId,
      workspaceId ? String(workspaceId) : undefined
    );
    return res.success(checkResult, '站点检查完成');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '站点检查失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const pauseSite = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const { workspaceId } = req.query as { workspaceId?: string };
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'write');
    const service = ensureMonitoringService();
    if (!service)
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '监控服务未启用', undefined, 500);
    const updated = await service.pauseMonitoringTarget(
      id,
      userId,
      workspaceId ? String(workspaceId) : undefined
    );
    if (!updated) return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
    return res.success(updated, '监控已暂停');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '暂停监控失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const resumeSite = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const { workspaceId } = req.query as { workspaceId?: string };
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'write');
    const service = ensureMonitoringService();
    if (!service)
      return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '监控服务未启用', undefined, 500);
    const updated = await service.resumeMonitoringTarget(
      id,
      userId,
      workspaceId ? String(workspaceId) : undefined
    );
    if (!updated) return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
    return res.success(updated, '监控已恢复');
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '恢复监控失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getAlerts = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { page = 1, limit = 20, severity, status, timeRange, source, workspaceId } = req.query;
  const userId = getUserId(req);
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'read');
    const service = ensureMonitoringService();
    if (!service)
      return res.success({ alerts: EMPTY_LIST.data, pagination: EMPTY_LIST.pagination });
    const alerts = await service.getAlerts(userId, {
      page: Number(page),
      limit: Number(limit),
      severity,
      source,
      status,
      timeRange,
      workspaceId: workspaceId ? String(workspaceId) : null,
    });
    return res.success({ alerts: alerts.data, pagination: alerts.pagination });
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取监控告警失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const getStatistics = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const { workspaceId } = req.query as { workspaceId?: string };
  try {
    if (workspaceId) await ensureWorkspacePermission(String(workspaceId), userId, 'read');
    const service = ensureMonitoringService();
    if (!service) return res.success(EMPTY_STATS);
    const stats = await service.getMonitoringStats(
      userId,
      workspaceId ? String(workspaceId) : undefined
    );
    return res.success(stats);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '获取监控统计失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

const healthCheck = async (_req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  try {
    const service = ensureMonitoringService();
    if (!service)
      return res.success({ status: 'unavailable', message: '监控服务未启用（本地模式）' });
    const health = await service.healthCheck();
    return res.success(health);
  } catch (error) {
    return res.error(
      StandardErrorCode.INTERNAL_SERVER_ERROR,
      '监控服务健康检查失败',
      error instanceof Error ? error.message : String(error),
      500
    );
  }
};

export default {
  setMonitoringService,
  getSites,
  getLoginGeo,
  getRegionSla,
  addSite,
  getSiteById,
  updateSite,
  deleteSite,
  checkSite,
  pauseSite,
  resumeSite,
  getAlerts,
  getStatistics,
  healthCheck,
};
