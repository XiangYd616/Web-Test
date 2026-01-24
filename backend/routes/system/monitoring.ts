/**
 * 监控路由
 */

import express from 'express';
import Joi from 'joi';
import { StandardErrorCode } from '../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import asyncHandler from '../../middleware/asyncHandler';
const { authMiddleware } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { hasWorkspacePermission } = require('../../utils/workspacePermissions');

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
    sms?: boolean;
    webhook?: boolean;
    threshold?: {
      responseTime?: number;
      uptime?: number;
      errorRate?: number;
    };
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

const router = express.Router();

type AuthenticatedRequest = express.Request & {
  user?: {
    id: string;
  } | null;
};

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('用户未认证');
  }
  return userId;
};

// 监控服务实例 (将在app.js中初始化)
let monitoringService: MonitoringServiceApi | null = null;

// 设置监控服务实例
(router as unknown as { setMonitoringService?: (service: unknown) => void }).setMonitoringService =
  (service: unknown): void => {
    monitoringService = service as MonitoringServiceApi;
  };

// 验证规则
const addSiteSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  url: Joi.string().uri().required(),
  monitoringType: Joi.string().valid('uptime', 'performance', 'security', 'seo').default('uptime'),
  workspaceId: Joi.string(),
  checkInterval: Joi.number().integer().min(60).max(3600).default(300),
  timeout: Joi.number().integer().min(5).max(120).default(30),
  config: Joi.object().default({}),
  notificationSettings: Joi.object({
    email: Joi.boolean().default(true),
    sms: Joi.boolean().default(false),
    webhook: Joi.boolean().default(false),
    threshold: Joi.object({
      responseTime: Joi.number().default(5000),
      uptime: Joi.number().default(99.9),
      errorRate: Joi.number().default(5),
    }).default(),
  }).default(),
});

const ensureMonitoringService = (): MonitoringServiceApi => {
  if (!monitoringService) {
    throw new Error('监控服务未初始化');
  }
  return monitoringService;
};

const resolveWorkspaceRole = async (workspaceId: string, userId: string) => {
  const result = await query(
    `SELECT role
     FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
     LIMIT 1`,
    [workspaceId, userId]
  );
  return result.rows[0]?.role as 'owner' | 'admin' | 'member' | 'viewer' | undefined;
};

const ensureWorkspacePermission = async (
  workspaceId: string,
  userId: string,
  action: 'read' | 'write' | 'delete' | 'invite' | 'manage' | 'execute'
) => {
  const role = await resolveWorkspaceRole(workspaceId, userId);
  if (!role) {
    throw new Error('没有权限访问该工作空间');
  }
  if (!hasWorkspacePermission(role, action)) {
    throw new Error('当前工作空间角色无此操作权限');
  }
  return role;
};

/**
 * GET /api/system/monitoring/sites
 * 获取监控站点列表
 */
router.get(
  '/sites',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const query: MonitoringQuery = req.query;
    const userId = getUserId(req);
    const workspaceId = query.workspaceId;

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'read');
      }
      const service = ensureMonitoringService();
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 20;
      const result = await service.getMonitoringTargets(userId, {
        page,
        limit,
        status: query.status || null,
        monitoringType: query.monitoringType || null,
        search: query.search || null,
        workspaceId: workspaceId ? String(workspaceId) : null,
      });
      const summary = await service.getMonitoringSummary(
        userId,
        workspaceId ? String(workspaceId) : undefined
      );

      return res.success({
        sites: result.data,
        pagination: result.pagination,
        summary,
      });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取监控站点列表失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * POST /api/system/monitoring/sites
 * 添加监控站点
 */
router.post(
  '/sites',
  authMiddleware,
  validateRequest(addSiteSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = getUserId(req);
    const siteData: AddSiteRequest = req.body;
    const workspaceId = siteData.workspaceId;

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'write');
      }
      const service = ensureMonitoringService();
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
          sms: false,
          webhook: false,
          threshold: {
            responseTime: 5000,
            uptime: 99.9,
            errorRate: 5,
          },
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
  })
);

/**
 * GET /api/system/monitoring/sites/:id
 * 获取单个监控站点详情
 */
router.get(
  '/sites/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req as AuthenticatedRequest);
    const { workspaceId } = req.query as { workspaceId?: string };

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'read');
      }
      const service = ensureMonitoringService();
      const site = await service.getMonitoringTarget(
        id,
        userId,
        workspaceId ? String(workspaceId) : undefined
      );

      if (!site) {
        return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
      }

      return res.success(site);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取监控站点详情失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * PUT /api/system/monitoring/sites/:id
 * 更新监控站点
 */
router.put(
  '/sites/:id',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req);
    const updateData = req.body;
    const workspaceId = updateData?.workspaceId || (req.query.workspaceId as string | undefined);

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'write');
      }
      const service = ensureMonitoringService();
      const updated = await service.updateMonitoringTarget(
        id,
        userId,
        updateData,
        workspaceId ? String(workspaceId) : undefined
      );

      if (!updated) {
        return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
      }

      return res.success(updated, '监控站点更新成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '更新监控站点失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * DELETE /api/system/monitoring/sites/:id
 * 删除监控站点
 */
router.delete(
  '/sites/:id',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { workspaceId } = req.query as { workspaceId?: string };
    try {
      const userId = getUserId(req as AuthenticatedRequest);
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'delete');
      }
      const service = ensureMonitoringService();
      const removed = await service.removeMonitoringTarget(
        id,
        userId,
        workspaceId ? String(workspaceId) : undefined
      );

      if (!removed) {
        return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
      }

      return res.success({ id }, '监控站点删除成功');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '删除监控站点失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * POST /api/system/monitoring/sites/:id/check
 * 手动触发站点检查
 */
router.post(
  '/sites/:id/check',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req as AuthenticatedRequest);
    const { workspaceId } = req.query as { workspaceId?: string };

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'execute');
      }
      const service = ensureMonitoringService();
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
  })
);

/**
 * POST /api/system/monitoring/sites/:id/pause
 * 暂停监控
 */
router.post(
  '/sites/:id/pause',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req as AuthenticatedRequest);
    const { workspaceId } = req.query as { workspaceId?: string };

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'write');
      }
      const service = ensureMonitoringService();
      const updated = await service.pauseMonitoringTarget(
        id,
        userId,
        workspaceId ? String(workspaceId) : undefined
      );

      if (!updated) {
        return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
      }

      return res.success(updated, '监控已暂停');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '暂停监控失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * POST /api/system/monitoring/sites/:id/resume
 * 恢复监控
 */
router.post(
  '/sites/:id/resume',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const userId = getUserId(req as AuthenticatedRequest);
    const { workspaceId } = req.query as { workspaceId?: string };

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'write');
      }
      const service = ensureMonitoringService();
      const updated = await service.resumeMonitoringTarget(
        id,
        userId,
        workspaceId ? String(workspaceId) : undefined
      );

      if (!updated) {
        return res.error(StandardErrorCode.NOT_FOUND, '监控站点不存在', undefined, 404);
      }

      return res.success(updated, '监控已恢复');
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '恢复监控失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * GET /api/system/monitoring/alerts
 * 获取监控告警列表
 */
router.get(
  '/alerts',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { page = 1, limit = 20, severity, status, timeRange, source, workspaceId } = req.query;
    const userId = getUserId(req as AuthenticatedRequest);

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'read');
      }
      const service = ensureMonitoringService();
      const alerts = await service.getAlerts(userId, {
        page: Number(page),
        limit: Number(limit),
        severity,
        source,
        status,
        timeRange,
        workspaceId: workspaceId ? String(workspaceId) : null,
      });

      return res.success({
        alerts: alerts.data,
        pagination: alerts.pagination,
      });
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '获取监控告警失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

/**
 * GET /api/system/monitoring/statistics
 * 获取监控统计
 */
router.get(
  '/statistics',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = getUserId(req as AuthenticatedRequest);
    const { workspaceId } = req.query as { workspaceId?: string };

    try {
      if (workspaceId) {
        await ensureWorkspacePermission(String(workspaceId), userId, 'read');
      }
      const service = ensureMonitoringService();
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
  })
);

/**
 * GET /api/system/monitoring/health
 * 监控服务健康检查
 */
router.get(
  '/health',
  authMiddleware,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const health = await ensureMonitoringService().healthCheck();

      return res.success(health);
    } catch (error) {
      return res.error(
        StandardErrorCode.INTERNAL_SERVER_ERROR,
        '监控服务健康检查失败',
        error instanceof Error ? error.message : String(error),
        500
      );
    }
  })
);

export default router;
