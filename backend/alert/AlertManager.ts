/**
 * 告警管理器
 *
 * 文件路径: backend/alert/AlertManager.ts
 * 创建时间: 2025-11-14
 *
 * 功能:
 * - 测试失败告警
 * - 性能降级检测
 * - 告警通知发送
 * - 告警历史记录
 */

import { EventEmitter } from 'events';

const Logger = require('../utils/logger');

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

type AlertData = Record<string, unknown> & {
  message?: string;
};

type AlertItem = {
  alertId: string;
  type: string;
  severity: AlertSeverity;
  timestamp: Date;
  data: AlertData;
  acknowledged: boolean;
  acknowledgedAt?: Date;
};

type AlertHandler = (alert: AlertItem) => void;

type AlertOptions = {
  performanceDegradationThreshold?: number;
  failureRateThreshold?: number;
  responseTimeIncreaseThreshold?: number;
};

type TestResultPayload = {
  success?: boolean;
  testId?: string;
  type?: string;
  error?: string;
  result?: Record<string, unknown>;
  performanceScore?: number;
  score?: number;
  checks?: Array<Record<string, unknown>>;
} & Record<string, unknown>;

class AlertManager extends EventEmitter {
  private options: Required<AlertOptions>;
  private alerts: AlertItem[] = [];
  private maxAlertHistory = 1000;
  private alertHandlers = new Map<string, AlertHandler>();

  constructor(options: AlertOptions = {}) {
    super();

    this.options = {
      performanceDegradationThreshold: options.performanceDegradationThreshold || 10,
      failureRateThreshold: options.failureRateThreshold || 5,
      responseTimeIncreaseThreshold: options.responseTimeIncreaseThreshold || 20,
    };
  }

  /**
   * 检查测试结果并触发告警
   */
  checkTestResult(testResult: TestResultPayload, previousResult: TestResultPayload | null = null) {
    const alerts: AlertItem[] = [];

    // 1. 检查测试失败
    if (!testResult.success) {
      alerts.push(
        this._createAlert('test_failed', 'high', {
          testId: testResult.testId,
          testType: testResult.type,
          error: testResult.error,
          message: `测试失败: ${testResult.error || '未知错误'}`,
        })
      );
    }

    // 2. 如果有历史数据，检查性能降级
    if (previousResult && testResult.success) {
      const degradationAlerts = this._checkPerformanceDegradation(testResult, previousResult);
      alerts.push(...degradationAlerts);
    }

    // 3. 特定类型的告警
    if (testResult.type === 'stress') {
      const stressAlerts = this._checkStressTestAlerts(testResult);
      alerts.push(...stressAlerts);
    } else if (testResult.type === 'security') {
      const securityAlerts = this._checkSecurityAlerts(testResult);
      alerts.push(...securityAlerts);
    }

    // 触发告警
    alerts.forEach(alert => {
      this._triggerAlert(alert);
    });

    return alerts;
  }

  /**
   * 检查性能降级
   * @private
   */
  private _checkPerformanceDegradation(current: TestResultPayload, previous: TestResultPayload) {
    const alerts: AlertItem[] = [];
    const threshold = this.options.performanceDegradationThreshold;

    if (current.type === 'stress') {
      const curr = (current.result || {}) as Record<string, unknown>;
      const prev = (previous.result || {}) as Record<string, unknown>;

      // 检查成功率下降
      if (curr.successRate && prev.successRate) {
        const decrease = Number(prev.successRate) - Number(curr.successRate);
        if (decrease > threshold) {
          alerts.push(
            this._createAlert('performance_degradation', 'medium', {
              metric: 'successRate',
              current: curr.successRate,
              previous: prev.successRate,
              decrease,
              message: `成功率下降 ${decrease.toFixed(2)}%`,
            })
          );
        }
      }

      // 检查响应时间增加
      if (curr.avgResponseTime && prev.avgResponseTime) {
        const increasePercent =
          ((Number(curr.avgResponseTime) - Number(prev.avgResponseTime)) /
            Number(prev.avgResponseTime)) *
          100;
        if (increasePercent > this.options.responseTimeIncreaseThreshold) {
          alerts.push(
            this._createAlert('performance_degradation', 'medium', {
              metric: 'avgResponseTime',
              current: curr.avgResponseTime,
              previous: prev.avgResponseTime,
              increasePercent: increasePercent.toFixed(2),
              message: `平均响应时间增加 ${increasePercent.toFixed(2)}%`,
            })
          );
        }
      }

      // 检查吞吐量下降
      if (curr.throughput && prev.throughput) {
        const decrease =
          ((Number(prev.throughput) - Number(curr.throughput)) / Number(prev.throughput)) * 100;
        if (decrease > threshold) {
          alerts.push(
            this._createAlert('performance_degradation', 'medium', {
              metric: 'throughput',
              current: curr.throughput,
              previous: prev.throughput,
              decreasePercent: decrease.toFixed(2),
              message: `吞吐量下降 ${decrease.toFixed(2)}%`,
            })
          );
        }
      }
    } else if (current.type === 'performance') {
      // 检查性能得分下降
      if (current.performanceScore && previous.performanceScore) {
        const decrease = Number(previous.performanceScore) - Number(current.performanceScore);
        if (decrease > threshold) {
          alerts.push(
            this._createAlert('performance_degradation', 'high', {
              metric: 'performanceScore',
              current: current.performanceScore,
              previous: previous.performanceScore,
              decrease,
              message: `性能得分下降 ${decrease.toFixed(2)}分`,
            })
          );
        }
      }
    }

    return alerts;
  }

  /**
   * 检查压力测试告警
   * @private
   */
  private _checkStressTestAlerts(testResult: TestResultPayload) {
    const alerts: AlertItem[] = [];
    const result = (testResult.result || {}) as Record<string, unknown>;

    // 检查失败率
    if (result.failedRequests && result.totalRequests) {
      const failureRate = (Number(result.failedRequests) / Number(result.totalRequests)) * 100;
      if (failureRate > this.options.failureRateThreshold) {
        alerts.push(
          this._createAlert('high_failure_rate', 'high', {
            failureRate: failureRate.toFixed(2),
            failedRequests: result.failedRequests,
            totalRequests: result.totalRequests,
            message: `失败率过高: ${failureRate.toFixed(2)}%`,
          })
        );
      }
    }

    // 检查响应时间异常
    if (Number(result.avgResponseTime) > 5000) {
      alerts.push(
        this._createAlert('high_response_time', 'medium', {
          avgResponseTime: result.avgResponseTime,
          message: `平均响应时间过高: ${result.avgResponseTime}ms`,
        })
      );
    }

    return alerts;
  }

  /**
   * 检查安全测试告警
   * @private
   */
  private _checkSecurityAlerts(testResult: TestResultPayload) {
    const alerts: AlertItem[] = [];

    // 检查安全得分
    if (typeof testResult.score === 'number' && testResult.score < 60) {
      alerts.push(
        this._createAlert('low_security_score', 'high', {
          score: testResult.score,
          message: `安全得分过低: ${testResult.score}/100`,
        })
      );
    }

    // 检查失败的安全检查
    if (testResult.checks) {
      const failedChecks = testResult.checks.filter(
        c => !(c as { passed?: boolean }).passed && (c as { severity?: string }).severity === 'high'
      );
      if (failedChecks.length > 0) {
        alerts.push(
          this._createAlert('security_check_failed', 'high', {
            failedChecks: failedChecks.length,
            checks: failedChecks.map(c => (c as { name?: string }).name),
            message: `${failedChecks.length}项高危安全检查失败`,
          })
        );
      }
    }

    return alerts;
  }

  /**
   * 创建告警
   * @private
   */
  private _createAlert(type: string, severity: AlertSeverity, data: AlertData): AlertItem {
    return {
      alertId: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      timestamp: new Date(),
      data,
      acknowledged: false,
    };
  }

  /**
   * 触发告警
   * @private
   */
  private _triggerAlert(alert: AlertItem) {
    // 添加到历史
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlertHistory) {
      this.alerts.shift();
    }

    // 记录日志
    Logger.warn(`[ALERT] ${alert.type} - ${alert.data.message}`);

    // 触发事件
    this.emit('alert', alert);

    // 调用注册的处理器
    const handler = this.alertHandlers.get(alert.type);
    if (handler) {
      try {
        handler(alert);
      } catch (error) {
        Logger.error(`告警处理器执行失败: ${alert.type}`, error);
      }
    }

    // 根据严重程度调用通用处理器
    const severityHandler = this.alertHandlers.get(`severity:${alert.severity}`);
    if (severityHandler) {
      try {
        severityHandler(alert);
      } catch (error) {
        Logger.error(`严重程度处理器执行失败: ${alert.severity}`, error);
      }
    }
  }

  /**
   * 注册告警处理器
   */
  registerHandler(type: string, handler: AlertHandler) {
    if (typeof handler !== 'function') {
      throw new Error('处理器必须是函数');
    }

    this.alertHandlers.set(type, handler);
    Logger.info(`注册告警处理器: ${type}`);
  }

  /**
   * 获取告警历史
   */
  getAlerts(
    options: {
      type?: string;
      severity?: AlertSeverity;
      acknowledged?: boolean;
      limit?: number;
    } = {}
  ) {
    let alerts = [...this.alerts];

    // 过滤
    if (options.type) {
      alerts = alerts.filter(a => a.type === options.type);
    }
    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === options.acknowledged);
    }

    // 排序（最新的在前）
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 限制数量
    if (options.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string) {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
      Logger.info(`告警已确认: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取统计
   */
  getStatistics() {
    const total = this.alerts.length;
    const bySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const byType: Record<string, number> = {};
    let acknowledged = 0;

    this.alerts.forEach(alert => {
      bySeverity[alert.severity] += 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      if (alert.acknowledged) acknowledged += 1;
    });

    return {
      total,
      acknowledged,
      unacknowledged: total - acknowledged,
      bySeverity,
      byType,
      recent: this.alerts.slice(-10).reverse(),
    };
  }

  /**
   * 清除旧告警
   */
  clearOldAlerts(maxAge = 86400000) {
    const cutoffTime = Date.now() - maxAge;
    const before = this.alerts.length;

    this.alerts = this.alerts.filter(alert => {
      return alert.timestamp.getTime() > cutoffTime;
    });

    const removed = before - this.alerts.length;
    if (removed > 0) {
      Logger.info(`清除了${removed}条旧告警`);
    }

    return removed;
  }
}

const alertManager = new AlertManager();

const getAlertManager = () => alertManager;

export { AlertManager, alertManager, getAlertManager };

module.exports = {
  AlertManager,
  alertManager,
  getAlertManager,
};
