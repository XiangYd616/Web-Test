/**
 * 告警管理控制器
 * 职责: 处理告警相关的业务逻辑
 * 从 system/routes/alerts.ts 中提取
 */

import type { NextFunction } from 'express';
import { StandardErrorCode } from '../../../../shared/types/standardApiResponse';
import { query } from '../../config/database';
import { dataManagementService } from '../../data/services/DataManagementService';
import type { ApiResponse, AuthenticatedRequest } from '../../types';
import { hasWorkspacePermission, resolveWorkspaceRole } from '../../utils/workspacePermissions';

// ==================== 类型定义 ====================

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  source: string;
  timestamp: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  metadata: Record<string, unknown>;
  tags: string[];
}

interface AlertQuery {
  page?: number;
  limit?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'active' | 'acknowledged' | 'resolved';
  timeRange?: '1h' | '24h' | '7d' | '30d';
  source?: string;
  search?: string;
  workspaceId?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ==================== 内部工具函数 ====================

const ALERTS_TYPE = 'system_alerts';
const ALERT_RULES_TYPE = 'system_alert_rules';

dataManagementService.initialize().catch(error => {
  console.error('告警数据服务初始化失败:', error);
});

const getUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) throw new Error('用户未认证');
  return userId;
};

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

const mapAlertRecord = (record: { id: string; data: Record<string, unknown> }) =>
  ({ ...(record.data as unknown as Alert), id: record.id }) as Alert;

const mapRuleRecord = (record: { id: string; data: Record<string, unknown> }) =>
  ({ ...(record.data as unknown as AlertRule), id: record.id }) as AlertRule;

const filterAlertsByTimeRange = (alerts: Alert[], timeRange?: AlertQuery['timeRange']) => {
  if (!timeRange) return alerts;
  const now = new Date();
  let cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  switch (timeRange) {
    case '1h': cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); break;
    case '24h': cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case '7d': cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    default: break;
  }
  return alerts.filter(alert => new Date(alert.timestamp) >= cutoffTime);
};

// ==================== 控制器方法 ====================

const getAlerts = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const alertQuery = req.query as AlertQuery;
  const userId = getUserId(req);
  const workspaceIdInput = alertQuery.workspaceId;
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) await ensureWorkspacePermission(workspaceId, userId, 'read');
    const { results } = await dataManagementService.queryData(
      ALERTS_TYPE,
      {
        filters: {
          ...(alertQuery.severity ? { severity: alertQuery.severity } : {}),
          ...(alertQuery.status ? { status: alertQuery.status } : {}),
          ...(alertQuery.source ? { source: alertQuery.source } : {}),
        },
        search: alertQuery.search,
        sort: { field: 'timestamp', direction: 'desc' },
        workspaceId,
      },
      {}
    );

    const rawAlerts = results.map(record => mapAlertRecord(record));
    const filteredAlerts = filterAlertsByTimeRange(rawAlerts, alertQuery.timeRange);
    filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const page = alertQuery.page || 1;
    const limit = alertQuery.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + limit);

    return res.success({
      alerts: paginatedAlerts,
      pagination: { page, limit, total: filteredAlerts.length, totalPages: Math.ceil(filteredAlerts.length / limit) },
      summary: {
        total: filteredAlerts.length,
        active: filteredAlerts.filter(a => a.status === 'active').length,
        acknowledged: filteredAlerts.filter(a => a.status === 'acknowledged').length,
        resolved: filteredAlerts.filter(a => a.status === 'resolved').length,
        critical: filteredAlerts.filter(a => a.severity === 'critical').length,
        high: filteredAlerts.filter(a => a.severity === 'high').length,
        medium: filteredAlerts.filter(a => a.severity === 'medium').length,
        low: filteredAlerts.filter(a => a.severity === 'low').length,
      },
    });
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取告警列表失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getAlertById = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const { workspaceId: workspaceIdInput } = req.query as { workspaceId?: string };
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) {
      const userId = getUserId(req);
      await ensureWorkspacePermission(workspaceId, userId, 'read');
    }
    const alertRecord = await dataManagementService.readData(ALERTS_TYPE, id, { workspaceId });
    const alert = mapAlertRecord(alertRecord as { id: string; data: Record<string, unknown> });
    return res.success(alert);
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) {
      return res.error(StandardErrorCode.NOT_FOUND, '告警不存在', undefined, 404);
    }
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取告警详情失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const acknowledgeAlert = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const workspaceIdInput = req.body?.workspaceId || (req.query.workspaceId as string | undefined);
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) await ensureWorkspacePermission(workspaceId, userId, 'write');
    const alertRecord = await dataManagementService.readData(ALERTS_TYPE, id, { workspaceId });
    const alert = mapAlertRecord(alertRecord as { id: string; data: Record<string, unknown> });
    if (alert.status !== 'active') return res.error(StandardErrorCode.INVALID_INPUT, '只能确认活跃的告警', undefined, 400);

    const updatedAlert = await dataManagementService.updateData(ALERTS_TYPE, id, { status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy: userId }, { userId, workspaceId });
    return res.success(mapAlertRecord(updatedAlert as { id: string; data: Record<string, unknown> }), '告警已确认');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '告警不存在', undefined, 404);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '确认告警失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const resolveAlert = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const workspaceIdInput = req.body?.workspaceId || (req.query.workspaceId as string | undefined);
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) await ensureWorkspacePermission(workspaceId, userId, 'write');
    await dataManagementService.readData(ALERTS_TYPE, id, { workspaceId });
    const updatedAlert = await dataManagementService.updateData(ALERTS_TYPE, id, { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId }, { userId, workspaceId });
    return res.success(mapAlertRecord(updatedAlert as { id: string; data: Record<string, unknown> }), '告警已解决');
  } catch (error) {
    if (error instanceof Error && error.message.includes('数据记录不存在')) return res.error(StandardErrorCode.NOT_FOUND, '告警不存在', undefined, 404);
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '解决告警失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const batchAction = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { action, alertIds, workspaceId: bodyWorkspaceId } = req.body;
  const userId = getUserId(req);
  const workspaceIdInput = bodyWorkspaceId || (req.query.workspaceId as string | undefined);
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) {
      const permissionAction = action === 'delete' ? 'delete' : 'write';
      await ensureWorkspacePermission(workspaceId, userId, permissionAction);
    }
    const results = [];
    for (const alertId of alertIds) {
      try {
        const alertRecord = await dataManagementService.readData(ALERTS_TYPE, alertId, { workspaceId });
        const alert = mapAlertRecord(alertRecord as { id: string; data: Record<string, unknown> });
        switch (action) {
          case 'acknowledge':
            if (alert.status === 'active') {
              await dataManagementService.updateData(ALERTS_TYPE, alertId, { status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy: userId }, { userId, workspaceId });
              results.push({ alertId, success: true });
            } else {
              results.push({ alertId, success: false, error: '告警状态不正确' });
            }
            break;
          case 'resolve':
            await dataManagementService.updateData(ALERTS_TYPE, alertId, { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId }, { userId, workspaceId });
            results.push({ alertId, success: true });
            break;
          case 'delete':
            await dataManagementService.deleteData(ALERTS_TYPE, alertId, { userId, workspaceId });
            results.push({ alertId, success: true });
            break;
          default:
            results.push({ alertId, success: false, error: '不支持的操作' });
        }
      } catch (error) {
        results.push({ alertId, success: false, error: error instanceof Error && error.message.includes('数据记录不存在') ? '告警不存在' : error instanceof Error ? error.message : String(error) });
      }
    }
    return res.success({ action, results, summary: { total: alertIds.length, successful: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length } }, `批量${action}操作完成`);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '批量操作失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getRules = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { workspaceId: workspaceIdInput } = req.query as { workspaceId?: string };
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';
  try {
    if (workspaceIdInput) {
      const userId = getUserId(req);
      await ensureWorkspacePermission(workspaceId, userId, 'read');
    }
    const { results } = await dataManagementService.queryData(ALERT_RULES_TYPE, { workspaceId }, {});
    const rules = results.map(record => mapRuleRecord(record));
    return res.success(rules);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取告警规则失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const createRule = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const userId = getUserId(req);
  const ruleData = req.body;
  const workspaceIdInput = req.body?.workspaceId || (req.query.workspaceId as string | undefined);
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) await ensureWorkspacePermission(workspaceId, userId, 'write');
    const newRuleData: AlertRule = { ...(ruleData as AlertRule), createdAt: new Date(), updatedAt: new Date(), createdBy: userId };
    const { id } = await dataManagementService.createData(ALERT_RULES_TYPE, newRuleData as unknown as Record<string, unknown>, { userId, source: 'alerts', workspaceId });
    return res.success({ ...newRuleData, id }, '告警规则创建成功', 201);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '创建告警规则失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const updateRule = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const updateData = req.body;
  const workspaceIdInput = req.body?.workspaceId || (req.query.workspaceId as string | undefined);
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) {
      const userId = getUserId(req);
      await ensureWorkspacePermission(workspaceId, userId, 'write');
    }
    await dataManagementService.readData(ALERT_RULES_TYPE, id, { workspaceId });
    const updatedRule = await dataManagementService.updateData(ALERT_RULES_TYPE, id, { ...updateData, updatedAt: new Date() }, { userId: getUserId(req), workspaceId });
    return res.success(mapRuleRecord(updatedRule as { id: string; data: Record<string, unknown> }), '告警规则更新成功');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '更新告警规则失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const deleteRule = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { id } = req.params;
  const workspaceIdInput = (req.query.workspaceId as string | undefined) || req.body?.workspaceId;
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';

  try {
    if (workspaceIdInput) {
      const userId = getUserId(req);
      await ensureWorkspacePermission(workspaceId, userId, 'delete');
    }
    await dataManagementService.deleteData(ALERT_RULES_TYPE, id, { userId: getUserId(req), workspaceId });
    return res.success(null, '告警规则删除成功');
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '删除告警规则失败', error instanceof Error ? error.message : String(error), 500);
  }
};

const getStatistics = async (req: AuthenticatedRequest, res: ApiResponse, _next: NextFunction) => {
  const { timeRange = '24h', workspaceId: workspaceIdInput } = req.query;
  const workspaceId = workspaceIdInput ? String(workspaceIdInput) : 'system';
  const userId = getUserId(req);

  try {
    if (workspaceIdInput) await ensureWorkspacePermission(workspaceId, userId, 'read');
    const now = new Date();
    let cutoffTime: Date;
    switch (timeRange) {
      case '1h': cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); break;
      case '24h': cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d': cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const { results } = await dataManagementService.queryData(ALERTS_TYPE, { workspaceId }, {});
    const allAlerts = results.map(record => mapAlertRecord(record));
    const recentAlerts = allAlerts.filter(alert => new Date(alert.timestamp) >= cutoffTime);

    const statistics = {
      total: recentAlerts.length,
      byStatus: {
        active: recentAlerts.filter(a => a.status === 'active').length,
        acknowledged: recentAlerts.filter(a => a.status === 'acknowledged').length,
        resolved: recentAlerts.filter(a => a.status === 'resolved').length,
      },
      bySeverity: {
        critical: recentAlerts.filter(a => a.severity === 'critical').length,
        high: recentAlerts.filter(a => a.severity === 'high').length,
        medium: recentAlerts.filter(a => a.severity === 'medium').length,
        low: recentAlerts.filter(a => a.severity === 'low').length,
      },
      bySource: recentAlerts.reduce((acc, alert) => { acc[alert.source] = (acc[alert.source] || 0) + 1; return acc; }, {} as Record<string, number>),
      averageResolutionTime:
        recentAlerts.filter(a => a.status === 'resolved' && a.resolvedAt).reduce((sum, alert) => {
          const resolvedAt = alert.resolvedAt ? new Date(alert.resolvedAt).getTime() : 0;
          return sum + (resolvedAt - new Date(alert.timestamp).getTime());
        }, 0) / (recentAlerts.filter(a => a.status === 'resolved').length || 1),
      rules: {
        total: (await dataManagementService.queryData(ALERT_RULES_TYPE, { workspaceId }, {})).total,
        enabled: (await dataManagementService.queryData(ALERT_RULES_TYPE, { filters: { enabled: true }, workspaceId }, {})).total,
        disabled: (await dataManagementService.queryData(ALERT_RULES_TYPE, { filters: { enabled: false }, workspaceId }, {})).total,
      },
    };

    return res.success(statistics);
  } catch (error) {
    return res.error(StandardErrorCode.INTERNAL_SERVER_ERROR, '获取告警统计失败', error instanceof Error ? error.message : String(error), 500);
  }
};

export default {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  batchAction,
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getStatistics,
};
