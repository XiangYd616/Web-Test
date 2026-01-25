/**
 * 高级分析控制器
 * 职责: 处理趋势分析、对比分析、性能分析、洞察生成的HTTP请求
 */

import type { NextFunction, Request, Response } from 'express';
import os from 'os';
import { query } from '../config/database';
import { errorMonitoringSystem } from '../utils/ErrorMonitoringSystem';

const advancedAnalyticsService = require('../services/analytics/advancedAnalyticsService');
const { getQueueStats } = require('../services/testing/TestQueueService');

type AuthRequest = Request & { user?: { id: string } };

type ApiResponse = Response & {
  success: (data?: unknown) => Response;
  validationError: (errors: unknown[], message?: string) => Response;
};

type DashboardAlert = {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  value?: number;
  threshold?: number;
};

type DashboardData = {
  system: {
    timestamp: string;
    system: {
      uptime: number;
      memory: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
      };
      cpu: { user: number; system: number };
      cpuPercent: number;
      memoryPercent: number;
      loadAverage: number[];
      freeMemory: number;
      totalMemory: number;
    };
  };
  business: {
    timestamp: string;
    business: {
      activeTests: number;
      completedTests: number;
      failedTests: number;
      averageResponseTime: number;
      testTypes: Record<string, number>;
      errorRate: number;
      throughput: number;
      userSatisfaction: number;
    };
  };
  user: {
    timestamp: string;
    users: {
      activeUsers: number;
      newUsers: number;
      userRetention: number;
      topUserActions: Array<{ action: string; count: number }>;
      userSessions: {
        averageSessionDuration: number;
        totalSessions: number;
        bounceRate: number;
      };
    };
  };
  alerts: DashboardAlert[];
  summary: {
    totalTests: number;
    successRate: number;
    averageResponseTime: number;
    activeUsers: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    lastUpdated: string;
    totalUsers: number;
    errorRate: number;
  };
  widgets: Array<Record<string, unknown>>;
};

type TrendOptions = Record<string, unknown>;

type ComparisonOptions = Record<string, unknown>;

type PerformanceFilter = Record<string, unknown>;

type ForecastOptions = {
  horizon?: number;
  smoothing?: boolean;
  seasonality?: boolean;
};

type AnomalyOptions = {
  severity?: 'high' | 'medium' | 'low';
};

class AdvancedAnalyticsController {
  async analyzeTrend(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: TrendOptions;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
        return res.validationError([], '需要至少2个数据点进行趋势分析');
      }

      const result = await advancedAnalyticsService.performTrendAnalysis(dataPoints, options);
      return res.success(result);
    } catch (error) {
      return next(error);
    }
  }

  async analyzeComparison(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const {
        baseline,
        comparison,
        options = {},
      } = req.body as {
        baseline?: unknown[];
        comparison?: unknown[];
        options?: ComparisonOptions;
      };

      if (!baseline || !comparison || !Array.isArray(baseline) || !Array.isArray(comparison)) {
        return res.validationError([], '需要提供基准数据和对比数据');
      }

      const result = await advancedAnalyticsService.performComparisonAnalysis(
        baseline,
        comparison,
        options
      );
      return res.success(result);
    } catch (error) {
      return next(error);
    }
  }

  async analyzePerformance(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: PerformanceFilter;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
        return res.validationError([], '需要至少2个数据点进行性能分析');
      }

      const result = await advancedAnalyticsService.performPerformanceAnalysis(
        dataPoints,
        options as PerformanceFilter
      );
      return res.success(result);
    } catch (error) {
      return next(error);
    }
  }

  async generateInsights(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const {
        dataPoints,
        dataType,
        timeRange = '7d',
      } = req.body as {
        dataPoints?: unknown[];
        dataType?: string;
        timeRange?: string;
      };

      if (!dataType) {
        return res.validationError([], '需要指定数据类型');
      }

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length === 0) {
        return res.validationError([], '需要提供数据点用于洞察生成');
      }

      const result = await advancedAnalyticsService.generateInsights(dataPoints, {
        context: `timeRange:${timeRange}`,
        type: dataType as 'trend' | 'anomaly' | 'opportunity' | 'risk',
      });
      return res.success(result);
    } catch (error) {
      next(error);
      return undefined;
    }
  }

  async generateForecast(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: ForecastOptions;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 2) {
        return res.validationError([], '需要至少2个数据点进行预测分析');
      }

      const forecast = await advancedAnalyticsService.performTrendAnalysis(dataPoints, {
        predictionDays: options.horizon ?? 7,
        smoothing: options.smoothing,
        seasonality: options.seasonality,
      });
      return res.success(forecast);
    } catch (error) {
      next(error);
      return undefined;
    }
  }

  async detectAnomalies(req: AuthRequest, res: ApiResponse, next: NextFunction) {
    try {
      const { dataPoints, options = {} } = req.body as {
        dataPoints?: unknown[];
        options?: AnomalyOptions;
      };

      if (!dataPoints || !Array.isArray(dataPoints) || dataPoints.length < 3) {
        return res.validationError([], '需要至少3个数据点进行异常检测');
      }

      const result = await advancedAnalyticsService.generateInsights(dataPoints, {
        type: 'anomaly',
        severity: options.severity || 'medium',
      });
      return res.success(result);
    } catch (error) {
      return next(error);
    }
  }

  async healthCheck(_req: AuthRequest, res: ApiResponse, _next: NextFunction) {
    return res.success({ status: 'ok', timestamp: new Date().toISOString() });
  }

  async getAvailableMetrics(category: string | undefined, res: ApiResponse) {
    const metrics = {
      performance: ['response_time', 'throughput', 'error_rate'],
      usage: ['requests', 'users', 'sessions'],
      system: ['cpu', 'memory', 'disk'],
    } as Record<string, string[]>;

    if (category && metrics[category]) {
      return res.success(metrics[category]);
    }

    return res.success(metrics);
  }

  async getAnalysisReports(params: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return {
      reports: [],
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  async createAnalysisReport(_req: AuthRequest, res: ApiResponse) {
    return res.created({ id: `report_${Date.now()}` }, '分析报告创建成功');
  }

  async getAnalysisReport(_id: string) {
    return null;
  }

  async exportAnalysisReport(_id: string, _format: string, _options: Record<string, unknown>) {
    return JSON.stringify({ message: '暂未生成报告内容' });
  }

  async getSystemInsights(_params: { category?: string; timeRange?: string }) {
    return [];
  }

  async generateDashboardData(req: AuthRequest, res: ApiResponse) {
    const userId = req.user?.id;
    if (!userId) {
      return res.validationError([], '用户未认证');
    }

    const { timeRange = '1h', workspaceId } = req.query as {
      timeRange?: string;
      workspaceId?: string;
    };
    const now = new Date();
    const rangeMs = this.resolveTimeRangeMs(timeRange);
    const startTime = new Date(now.getTime() - rangeMs);

    const scopeField = workspaceId ? 'workspace_id' : 'user_id';
    const scopeValue = workspaceId || userId;

    const [testStats, testTypeStats, scoreStats, userStats, sessionStats, queueStats] =
      await Promise.all([
        query(
          `SELECT
             COUNT(*)::int AS total_tests,
             COUNT(*) FILTER (WHERE status = 'running')::int AS active_tests,
             COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_tests,
             COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_tests,
             AVG(execution_time) AS avg_execution_time
           FROM test_executions
           WHERE ${scopeField} = $1 AND created_at >= $2`,
          [scopeValue, startTime]
        ),
        query(
          `SELECT engine_type, COUNT(*)::int AS count
           FROM test_executions
           WHERE ${scopeField} = $1 AND created_at >= $2
           GROUP BY engine_type`,
          [scopeValue, startTime]
        ),
        query(
          `SELECT AVG(tr.score)::numeric AS avg_score
           FROM test_results tr
           INNER JOIN test_executions te ON te.id = tr.execution_id
           WHERE te.${scopeField} = $1 AND te.created_at >= $2`,
          [scopeValue, startTime]
        ),
        query(
          `SELECT
             COUNT(*)::int AS total_users,
             COUNT(*) FILTER (WHERE created_at >= $2)::int AS new_users,
             COUNT(*) FILTER (WHERE last_login >= $2)::int AS active_users
           FROM users`,
          [scopeValue, startTime]
        ),
        query(
          `SELECT
             COUNT(*)::int AS total_sessions,
             AVG(EXTRACT(EPOCH FROM (last_activity_at - created_at))) AS avg_session_duration,
             COUNT(*) FILTER (
               WHERE EXTRACT(EPOCH FROM (last_activity_at - created_at)) < 60
             )::int AS bounce_sessions
           FROM user_sessions
           WHERE user_id = $1 AND created_at >= $2`,
          [userId, startTime]
        ),
        getQueueStats({
          userId,
          isAdmin: (req.user as { role?: string })?.role === 'admin',
          workspaceId,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
        }),
      ]);

    const statsRow = testStats.rows[0] || {};
    const totalTests = Number(statsRow.total_tests || 0);
    const completedTests = Number(statsRow.completed_tests || 0);
    const failedTests = Number(statsRow.failed_tests || 0);
    const activeTests = Number(statsRow.active_tests || 0);
    const avgExecutionTime = statsRow.avg_execution_time
      ? Math.round(Number(statsRow.avg_execution_time))
      : 0;

    const testTypes = testTypeStats.rows.reduce<Record<string, number>>((acc, row) => {
      acc[String(row.engine_type || 'unknown')] = Number(row.count || 0);
      return acc;
    }, {});

    const avgScore = scoreStats.rows[0]?.avg_score ? Number(scoreStats.rows[0].avg_score) : 0;

    const userRow = userStats.rows[0] || {};
    const totalUsers = Number(userRow.total_users || 0);
    const activeUsers = Number(userRow.active_users || 0);
    const newUsers = Number(userRow.new_users || 0);
    const userRetention = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

    const sessionRow = sessionStats.rows[0] || {};
    const totalSessions = Number(sessionRow.total_sessions || 0);
    const avgSessionDuration = sessionRow.avg_session_duration
      ? Number(sessionRow.avg_session_duration)
      : 0;
    const bounceSessions = Number(sessionRow.bounce_sessions || 0);
    const bounceRate = totalSessions > 0 ? bounceSessions / totalSessions : 0;

    const errorRate = totalTests > 0 ? (failedTests / totalTests) * 100 : 0;
    const successRate = totalTests > 0 ? (completedTests / totalTests) * 100 : 100;
    const throughput = rangeMs > 0 ? totalTests / (rangeMs / (60 * 60 * 1000)) : totalTests;

    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryPercent = totalMemory > 0 ? ((totalMemory - freeMemory) / totalMemory) * 100 : 0;
    const loadAverage = os.loadavg();
    const cpuPercent = Math.min((loadAverage[0] / os.cpus().length) * 100, 100);

    const systemHealth = this.resolveSystemHealth({
      cpuPercent,
      memoryPercent,
      errorRate,
      alertCount: errorMonitoringSystem.getAlertHistory(20).length,
    });

    const alerts = errorMonitoringSystem.getAlertHistory(20).map(alert => {
      const details = alert.details as Record<string, unknown> | undefined;
      const level: DashboardAlert['level'] =
        alert.level === 'critical' ? 'critical' : alert.level === 'high' ? 'warning' : 'info';
      const value = typeof details?.value === 'number' ? details.value : undefined;
      const threshold = typeof details?.threshold === 'number' ? details.threshold : undefined;
      return {
        id: alert.id,
        type: alert.type,
        level,
        message: alert.message,
        timestamp: new Date(alert.timestamp).getTime(),
        ...(value !== undefined ? { value } : {}),
        ...(threshold !== undefined ? { threshold } : {}),
      };
    });

    const dashboardData: DashboardData = {
      system: {
        timestamp: now.toISOString(),
        system: {
          uptime: process.uptime(),
          memory: {
            rss: memUsage.rss,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
          },
          cpu: {
            user: process.cpuUsage().user,
            system: process.cpuUsage().system,
          },
          cpuPercent,
          memoryPercent,
          loadAverage,
          freeMemory,
          totalMemory,
        },
      },
      business: {
        timestamp: now.toISOString(),
        business: {
          activeTests,
          completedTests,
          failedTests,
          averageResponseTime: avgExecutionTime,
          testTypes,
          errorRate,
          throughput: Number.isFinite(throughput) ? Math.round(throughput) : 0,
          userSatisfaction: avgScore,
        },
      },
      user: {
        timestamp: now.toISOString(),
        users: {
          activeUsers,
          newUsers,
          userRetention,
          topUserActions: [],
          userSessions: {
            averageSessionDuration: avgSessionDuration,
            totalSessions,
            bounceRate,
          },
        },
      },
      alerts,
      summary: {
        totalTests,
        successRate,
        averageResponseTime: avgExecutionTime,
        activeUsers,
        systemHealth,
        lastUpdated: now.toISOString(),
        totalUsers,
        errorRate,
      },
      widgets: this.getDefaultWidgets(queueStats),
    };

    return res.success(dashboardData);
  }

  private resolveTimeRangeMs(timeRange: string) {
    switch (timeRange) {
      case '6h':
        return 6 * 60 * 60 * 1000;
      case '24h':
        return 24 * 60 * 60 * 1000;
      case '7d':
        return 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return 30 * 24 * 60 * 60 * 1000;
      case '1h':
      default:
        return 60 * 60 * 1000;
    }
  }

  private resolveSystemHealth(params: {
    cpuPercent: number;
    memoryPercent: number;
    errorRate: number;
    alertCount: number;
  }): 'healthy' | 'warning' | 'critical' {
    if (params.cpuPercent > 90 || params.memoryPercent > 90 || params.errorRate > 10) {
      return 'critical';
    }
    if (params.cpuPercent > 75 || params.memoryPercent > 75 || params.alertCount > 5) {
      return 'warning';
    }
    return 'healthy';
  }

  private getDefaultWidgets(queueStats: { stats?: Record<string, unknown> }) {
    return [
      {
        id: 'queue-overview',
        type: 'summary',
        title: '队列概览',
        data: queueStats.stats || {},
      },
      {
        id: 'test-trends',
        type: 'line',
        title: '测试趋势',
        series: ['completed', 'failed'],
      },
      {
        id: 'error-distribution',
        type: 'pie',
        title: '错误分布',
      },
    ];
  }
}

module.exports = new AdvancedAnalyticsController();
