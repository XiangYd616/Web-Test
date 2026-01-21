/**
 * 监控服务核心类
 * 实现24/7网站监控功能，支持多种监控指标
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import { performance } from 'perf_hooks';

const logger = require('../../utils/logger');

type DbRow = Record<string, unknown>;

type DbQueryResult<T extends DbRow = DbRow> = {
  rows: T[];
};

type DbPool = {
  query: <T extends DbRow = DbRow>(text: string, params?: unknown[]) => Promise<DbQueryResult<T>>;
};

type MonitoringTarget = {
  id: string;
  user_id?: string;
  name?: string;
  url: string;
  monitoring_type?: string;
  check_interval?: number;
  timeout?: number;
  config?: Record<string, unknown> | string | null;
  status?: string;
  notification_settings?: Record<string, unknown> | string | null;
  last_check?: string | null;
  consecutive_failures?: number;
  last_status?: string | null;
  last_checked_at?: string | null;
  last_response_time?: number | null;
  is_active?: boolean;
};

type MonitoringTask = {
  target: MonitoringTarget;
  intervalId: NodeJS.Timeout | null;
  lastCheck: Date | null;
  isRunning: boolean;
  startTime?: number;
};

type MonitoringCheckResult = {
  status: string;
  response_time: number | null;
  status_code: number | null;
  error_message: string | null;
  results: Record<string, unknown>;
};

type MonitoringConfig = {
  maxConcurrentChecks: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  maxConsecutiveFailures: number;
};

type ReportFile = {
  filename: string;
  data: string | Buffer;
  contentType: string;
  path?: string;
};

type ReportSummary = {
  totalSites: number;
  activeSites: number;
  onlineSites: number;
  totalAlerts: number;
  activeAlerts: number;
};

type ReportSiteRow = {
  name?: string;
  url?: string;
  status?: string;
  monitoring_type?: string;
  check_interval?: number;
  last_checked?: string | null;
};

type ReportAlertRow = {
  site_name?: string;
  alert_type?: string;
  severity?: string;
  status?: string;
  message?: string;
  created_at?: string;
};

type CsvReportData = {
  generatedAt: string;
  reportType: string;
  timeRange: string;
  summary: ReportSummary;
  sites: ReportSiteRow[];
  alerts: ReportAlertRow[];
};

class MonitoringService extends EventEmitter {
  private dbPool: DbPool;
  private activeMonitors = new Map<string, MonitoringTask>();
  private scheduler: NodeJS.Timeout | null = null;
  private isRunning = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private config: MonitoringConfig = {
    maxConcurrentChecks: 10,
    defaultTimeout: 30000,
    retryAttempts: 3,
    retryDelay: 5000,
    healthCheckInterval: 60000,
    maxConsecutiveFailures: 3,
  };
  private alertHistory?: Map<string, unknown>;

  constructor(dbPool: DbPool) {
    super();
    this.dbPool = dbPool;
    this.setupEventHandlers();
  }

  /**
   * 暂停监控目标
   */
  async pauseMonitoringTarget(siteId: string, userId: string) {
    const target = await this.getMonitoringTarget(siteId, userId);
    if (!target) {
      throw new Error('监控站点不存在或无权限访问');
    }

    if (this.activeMonitors.has(siteId)) {
      const task = this.activeMonitors.get(siteId);
      if (task?.intervalId) {
        clearInterval(task.intervalId);
      }
      this.activeMonitors.delete(siteId);
    }

    const result = await this.dbPool.query<MonitoringTarget>(
      `UPDATE monitoring_sites
       SET status = 'paused', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [siteId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * 恢复监控目标
   */
  async resumeMonitoringTarget(siteId: string, userId: string) {
    const result = await this.dbPool.query<MonitoringTarget>(
      `UPDATE monitoring_sites
       SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [siteId, userId]
    );

    const target = result.rows[0];
    if (target) {
      this.createMonitoringTask(target);
    }

    return target || null;
  }

  /**
   * 获取监控摘要（按状态/类型统计）
   */
  async getMonitoringSummary(userId: string) {
    const statusResult = await this.dbPool.query<Record<string, string>>(
      `SELECT status, COUNT(*)::int AS count
       FROM monitoring_sites
       WHERE deleted_at IS NULL AND user_id = $1
       GROUP BY status`,
      [userId]
    );

    const typeResult = await this.dbPool.query<Record<string, string>>(
      `SELECT monitoring_type, COUNT(*)::int AS count
       FROM monitoring_sites
       WHERE deleted_at IS NULL AND user_id = $1
       GROUP BY monitoring_type`,
      [userId]
    );

    const statusMap = statusResult.rows.reduce(
      (acc, row) => {
        acc[row.status] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>
    );

    const typeMap = typeResult.rows.reduce(
      (acc, row) => {
        acc[row.monitoring_type] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
      active: statusMap.active || 0,
      inactive: statusMap.inactive || 0,
      paused: statusMap.paused || 0,
      byType: typeMap,
    };
  }

  /**
   * 启动监控服务
   */
  async start() {
    try {
      if (this.isRunning) {
        logger.warn('监控服务已在运行中');
        return;
      }

      logger.info('启动监控服务...');

      await this.loadMonitoringTargets();

      this.startScheduler();

      this.startHealthCheck();

      this.isRunning = true;
      this.emit('service:started');

      logger.info('监控服务启动成功');
    } catch (error) {
      logger.error('监控服务启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止监控服务
   */
  async stop() {
    try {
      if (!this.isRunning) {
        return;
      }

      logger.info('停止监控服务...');

      if (this.scheduler) {
        clearInterval(this.scheduler);
        this.scheduler = null;
      }

      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      this.activeMonitors.clear();

      this.isRunning = false;
      this.emit('service:stopped');

      logger.info('监控服务已停止');
    } catch (error) {
      logger.error('停止监控服务时出错:', error);
      throw error;
    }
  }

  /**
   * 加载监控目标
   */
  async loadMonitoringTargets() {
    try {
      let query: string;
      try {
        query = `
          SELECT
            id, user_id, name, url, monitoring_type,
            check_interval, timeout, config, status,
            notification_settings, last_check, consecutive_failures
          FROM monitoring_sites
          WHERE status = 'active' AND deleted_at IS NULL
          ORDER BY check_interval ASC
        `;
        const result = await this.dbPool.query<MonitoringTarget>(query);
        const targets = result.rows;

        logger.info(`加载了 ${targets.length} 个监控目标`);

        for (const target of targets) {
          this.createMonitoringTask(target);
        }

        return targets;
      } catch (fieldError) {
        const errorMessage = fieldError instanceof Error ? fieldError.message : String(fieldError);
        logger.warn('监控表字段不完整，使用基础查询:', errorMessage);

        query = `
          SELECT
            id, user_id, name, url,
            'uptime' as monitoring_type,
            check_interval, timeout,
            '{}' as config,
            'active' as status,
            '{}' as notification_settings,
            NULL as last_check,
            0 as consecutive_failures
          FROM monitoring_sites
          WHERE is_active = true
          ORDER BY check_interval ASC
        `;

        const result = await this.dbPool.query<MonitoringTarget>(query);
        const targets = result.rows;

        logger.info(`使用基础查询加载了 ${targets.length} 个监控目标`);

        for (const target of targets) {
          this.createMonitoringTask(target);
        }

        return targets;
      }
    } catch (error) {
      logger.error('加载监控目标失败:', error);
      logger.warn('监控系统将在无目标模式下运行');
      return [] as MonitoringTarget[];
    }
  }

  /**
   * 创建监控任务
   */
  createMonitoringTask(target: MonitoringTarget) {
    const taskId = target.id;
    const interval = (target.check_interval || 300) * 1000;

    if (this.activeMonitors.has(taskId)) {
      const existingTask = this.activeMonitors.get(taskId);
      if (existingTask?.intervalId) {
        clearInterval(existingTask.intervalId);
      }
    }

    const task: MonitoringTask = {
      target,
      intervalId: null,
      lastCheck: target.last_check ? new Date(target.last_check) : null,
      isRunning: false,
    };

    task.intervalId = setInterval(async () => {
      if (!task.isRunning) {
        await this.performCheck(target);
      }
    }, interval);

    this.activeMonitors.set(taskId, task);

    logger.debug(`创建监控任务: ${target.name} (${target.url}), 间隔: ${target.check_interval}秒`);
  }

  /**
   * 执行监控检查
   */
  async performCheck(target: MonitoringTarget) {
    const startTime = performance.now();
    const task = this.activeMonitors.get(target.id);

    if (!task) {
      logger.warn(`监控任务不存在: ${target.id}`);
      return;
    }

    task.isRunning = true;
    task.startTime = Date.now();

    try {
      logger.debug(`开始检查: ${target.name} (${target.url})`);

      const checkResult = await this.executeCheck(target);

      await this.saveCheckResult(target.id, checkResult);

      await this.updateTargetStatus(target.id, checkResult);

      await this.checkAlertConditions(target, checkResult);

      this.emit('check:completed', {
        targetId: target.id,
        target: target.name,
        result: checkResult,
        duration: performance.now() - startTime,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`监控检查失败 ${target.name}:`, error);

      const errorResult: MonitoringCheckResult = {
        status: 'error',
        error_message: errorMessage,
        response_time: null,
        status_code: null,
        results: { error: errorMessage },
      };

      await this.saveCheckResult(target.id, errorResult);
      await this.updateTargetStatus(target.id, errorResult);

      this.emit('check:error', {
        targetId: target.id,
        target: target.name,
        error: errorMessage,
      });
    } finally {
      task.isRunning = false;
      task.lastCheck = new Date();
      delete task.startTime;
    }
  }

  /**
   * 执行具体的检查逻辑
   */
  async executeCheck(target: MonitoringTarget): Promise<MonitoringCheckResult> {
    const startTime = performance.now();
    const timeout = (target.timeout || this.config.defaultTimeout) * 1000;

    try {
      switch (target.monitoring_type) {
        case 'uptime':
          return await this.performUptimeCheck(target, timeout);
        case 'performance':
          return await this.performPerformanceCheck(target, timeout);
        case 'security':
          return await this.performSecurityCheck(target, timeout);
        case 'seo':
          return await this.performSEOCheck(target, timeout);
        default:
          return await this.performUptimeCheck(target, timeout);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorCode = (error as { code?: string }).code;

      if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT') {
        return {
          status: 'timeout',
          response_time: Math.round(duration),
          status_code: null,
          error_message: '请求超时',
          results: {
            timeout: true,
            duration,
          },
        };
      }

      if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED') {
        return {
          status: 'down',
          response_time: Math.round(duration),
          status_code: null,
          error_message: '无法连接到服务器',
          results: {
            connection_error: true,
            code: errorCode,
          },
        };
      }

      throw error;
    }
  }

  /**
   * 执行可用性检查
   */
  async performUptimeCheck(
    target: MonitoringTarget,
    timeout: number
  ): Promise<MonitoringCheckResult> {
    const startTime = performance.now();

    const response = await axios.get(target.url, {
      timeout,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'TestWebApp-Monitor/1.0',
      },
    });

    const responseTime = Math.round(performance.now() - startTime);
    const isUp = response.status >= 200 && response.status < 400;

    return {
      status: isUp ? 'up' : 'down',
      response_time: responseTime,
      status_code: response.status,
      error_message: isUp ? null : `HTTP ${response.status}`,
      results: {
        headers: response.headers,
        response_size: response.data ? response.data.length : 0,
        ssl_info: this.extractSSLInfo(response),
      },
    };
  }

  /**
   * 执行性能检查
   */
  async performPerformanceCheck(target: MonitoringTarget, timeout: number) {
    const uptimeResult = await this.performUptimeCheck(target, timeout);

    if (uptimeResult.status !== 'up') {
      return uptimeResult;
    }

    const timing = await this.measureNetworkTimings(target.url, timeout).catch(() => null);

    const performanceMetrics = {
      response_time: uptimeResult.response_time,
      ttfb: timing?.ttfb ?? uptimeResult.response_time,
      dns_lookup: timing?.dns ?? null,
      tcp_connect: timing?.tcp ?? null,
      ssl_handshake: timing?.tls ?? null,
      content_download: timing?.download ?? null,
    };

    let performanceGrade = 'A';
    if ((uptimeResult.response_time || 0) > 3000) performanceGrade = 'F';
    else if ((uptimeResult.response_time || 0) > 2000) performanceGrade = 'D';
    else if ((uptimeResult.response_time || 0) > 1000) performanceGrade = 'C';
    else if ((uptimeResult.response_time || 0) > 500) performanceGrade = 'B';

    return {
      ...uptimeResult,
      results: {
        ...uptimeResult.results,
        performance: performanceMetrics,
        grade: performanceGrade,
      },
    };
  }

  /**
   * 执行安全检查
   */
  async performSecurityCheck(target: MonitoringTarget, timeout: number) {
    const uptimeResult = await this.performUptimeCheck(target, timeout);

    if (uptimeResult.status !== 'up') {
      return uptimeResult;
    }

    const securityChecks: Record<string, boolean> = {
      https: target.url.startsWith('https://'),
      hsts: false,
      csp: false,
      xframe: false,
      xss_protection: false,
    };

    const headers = (uptimeResult.results.headers || {}) as Record<string, string | string[]>;
    securityChecks.hsts = !!headers['strict-transport-security'];
    securityChecks.csp = !!headers['content-security-policy'];
    securityChecks.xframe = !!headers['x-frame-options'];
    securityChecks.xss_protection = !!headers['x-xss-protection'];

    const securityScore = Object.values(securityChecks).filter(Boolean).length;
    const maxScore = Object.keys(securityChecks).length;

    return {
      ...uptimeResult,
      results: {
        ...uptimeResult.results,
        security: securityChecks,
        security_score: `${securityScore}/${maxScore}`,
      },
    };
  }

  /**
   * 执行SEO检查
   */
  async performSEOCheck(target: MonitoringTarget, timeout: number) {
    const uptimeResult = await this.performUptimeCheck(target, timeout);

    if (uptimeResult.status !== 'up') {
      return uptimeResult;
    }

    let html = '';
    try {
      const response = await axios.get(target.url, {
        timeout,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'TestWebApp-Monitor/1.0',
        },
      });
      if (typeof response.data === 'string') {
        html = response.data;
      }
    } catch {
      html = '';
    }

    const $ = html ? cheerio.load(html) : null;
    const titleText = $ ? $('title').text().trim() : '';
    const descriptionText = $ ? $('meta[name="description"]').attr('content')?.trim() || '' : '';
    const h1Count = $ ? $('h1').length : 0;
    const robotsText = $ ? $('meta[name="robots"]').attr('content')?.trim() || '' : '';

    const seoChecks = {
      has_title: Boolean(titleText),
      has_description: Boolean(descriptionText),
      has_h1: h1Count > 0,
      has_robots: Boolean(robotsText),
    };

    return {
      ...uptimeResult,
      results: {
        ...uptimeResult.results,
        seo: seoChecks,
        title: titleText,
        description: descriptionText,
        h1_count: h1Count,
        robots: robotsText,
      },
    };
  }

  private async measureNetworkTimings(
    targetUrl: string,
    timeout: number
  ): Promise<{
    dns: number | null;
    tcp: number | null;
    tls: number | null;
    ttfb: number | null;
    download: number | null;
  }> {
    const url = new URL(targetUrl);
    const isHttps = url.protocol === 'https:';

    return new Promise((resolve, reject) => {
      const start = process.hrtime.bigint();
      let dnsStart: bigint | null = null;
      let dnsEnd: bigint | null = null;
      let tcpStart: bigint | null = null;
      let tcpEnd: bigint | null = null;
      let tlsEnd: bigint | null = null;
      let ttfbEnd: bigint | null = null;

      const request = (isHttps ? https : http).request(
        targetUrl,
        { method: 'GET', timeout },
        response => {
          ttfbEnd = process.hrtime.bigint();
          response.on('data', () => {
            if (!ttfbEnd) {
              ttfbEnd = process.hrtime.bigint();
            }
          });
          response.on('end', () => {
            const end = process.hrtime.bigint();
            const toMs = (value: bigint | null) => (value ? Number(value) / 1_000_000 : null);
            resolve({
              dns: dnsStart && dnsEnd ? toMs(dnsEnd - dnsStart) : null,
              tcp: tcpStart && tcpEnd ? toMs(tcpEnd - tcpStart) : null,
              tls: tcpEnd && tlsEnd ? toMs(tlsEnd - tcpEnd) : null,
              ttfb: ttfbEnd ? toMs(ttfbEnd - start) : null,
              download: toMs(end - (ttfbEnd || start)),
            });
          });
        }
      );

      request.on('socket', socket => {
        socket.on('lookup', () => {
          dnsEnd = process.hrtime.bigint();
        });
        socket.on('connect', () => {
          tcpEnd = process.hrtime.bigint();
        });
        socket.on('secureConnect', () => {
          tlsEnd = process.hrtime.bigint();
        });

        dnsStart = process.hrtime.bigint();
        tcpStart = process.hrtime.bigint();
      });

      request.on('timeout', () => {
        request.destroy(new Error('Request timeout'));
      });
      request.on('error', reject);
      request.end();
    });
  }

  /**
   * 提取SSL信息
   */
  extractSSLInfo(response: {
    config: { url?: string };
    request?: { socket?: { getProtocol?: () => string } };
  }) {
    return {
      secure: Boolean(response.config.url?.startsWith('https://')),
      protocol: response.request?.socket?.getProtocol?.() || null,
    };
  }

  /**
   * 保存检查结果
   */
  async saveCheckResult(siteId: string, result: MonitoringCheckResult) {
    try {
      const query = `
        INSERT INTO monitoring_results (
          site_id, status, response_time, status_code,
          results, error_message, checked_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
      `;

      const values = [
        siteId,
        result.status,
        result.response_time,
        result.status_code,
        JSON.stringify(result.results || {}),
        result.error_message,
      ];

      const insertResult = await this.dbPool.query<{ id: string }>(query, values);

      logger.debug(`保存监控结果: ${insertResult.rows[0].id}`);

      return insertResult.rows[0].id;
    } catch (error) {
      logger.error('保存监控结果失败:', error);
      throw error;
    }
  }

  /**
   * 更新监控目标状态
   */
  async updateTargetStatus(siteId: string, result: MonitoringCheckResult) {
    try {
      const isFailure = ['down', 'timeout', 'error'].includes(result.status);

      const query = `
        UPDATE monitoring_sites
        SET
          last_check = NOW(),
          last_status = $2,
          consecutive_failures = CASE
            WHEN $3 THEN consecutive_failures + 1
            ELSE 0
          END,
          updated_at = NOW()
        WHERE id = $1
        RETURNING consecutive_failures
      `;

      const updateResult = await this.dbPool.query<{ consecutive_failures: number }>(query, [
        siteId,
        result.status,
        isFailure,
      ]);

      if (updateResult.rows.length > 0) {
        const consecutiveFailures = updateResult.rows[0].consecutive_failures;

        this.emit('status:changed', {
          siteId,
          status: result.status,
          consecutiveFailures,
          isFailure,
        });
      }
    } catch (error) {
      logger.error('更新监控目标状态失败:', error);
      throw error;
    }
  }

  /**
   * 检查告警条件
   */
  async checkAlertConditions(target: MonitoringTarget, result: MonitoringCheckResult) {
    try {
      const isFailure = ['down', 'timeout', 'error'].includes(result.status);

      if (!isFailure) {
        return;
      }

      const query = `
        SELECT consecutive_failures, notification_settings
        FROM monitoring_sites
        WHERE id = $1
      `;

      const queryResult = await this.dbPool.query<{
        consecutive_failures: number;
        notification_settings?: string;
      }>(query, [target.id]);

      if (queryResult.rows.length === 0) {
        return;
      }

      const { consecutive_failures, notification_settings } = queryResult.rows[0];
      const alertThreshold = this.config.maxConsecutiveFailures;

      if (consecutive_failures >= alertThreshold) {
        this.emit('alert:triggered', {
          targetId: target.id,
          target: target.name,
          url: target.url,
          status: result.status,
          consecutiveFailures: consecutive_failures,
          errorMessage: result.error_message,
          notificationSettings: notification_settings || {},
        });

        logger.warn(`触发告警: ${target.name} 连续失败 ${consecutive_failures} 次`);
      }
    } catch (error) {
      logger.error('检查告警条件失败:', error);
    }
  }

  /**
   * 启动调度器
   */
  startScheduler() {
    this.scheduler = setInterval(() => {
      void this.checkScheduledTasks();
    }, 60000);

    logger.debug('监控调度器已启动');
  }

  /**
   * 检查计划任务
   */
  async checkScheduledTasks() {
    try {
      const targets = await this.loadMonitoringTargets();

      for (const [taskId, task] of this.activeMonitors) {
        const targetExists = targets.some(target => target.id === taskId);
        if (!targetExists) {
          if (task.intervalId) {
            clearInterval(task.intervalId);
          }
          this.activeMonitors.delete(taskId);
          logger.debug(`清理无效监控任务: ${taskId}`);
        }
      }
    } catch (error) {
      logger.error('检查计划任务失败:', error);
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      void this.performHealthCheck();
    }, this.config.healthCheckInterval);

    logger.debug('监控服务健康检查已启动');
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    try {
      const stats: Record<string, unknown> = {
        isRunning: this.isRunning,
        activeMonitors: this.activeMonitors.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      };

      try {
        await this.dbPool.query('SELECT 1');
        stats.databaseStatus = 'healthy';
      } catch (dbError) {
        stats.databaseStatus = 'unhealthy';
        stats.databaseError = dbError instanceof Error ? dbError.message : String(dbError);
        logger.error('数据库健康检查失败:', dbError);
      }

      const taskStats = this.getTaskHealthStats();
      stats.taskStats = taskStats;

      const resourceStats = this.getResourceStats();
      stats.resources = resourceStats;

      stats.overallHealth = this.determineOverallHealth(stats);

      this.emit('health:check', stats);

      logger.debug(
        `监控服务健康检查: ${stats.activeMonitors} 个活跃监控, 状态: ${stats.overallHealth}`
      );

      if (stats.overallHealth !== 'healthy') {
        await this.attemptAutoRecovery(stats);
      }
      return stats;
    } catch (error) {
      logger.error('健康检查失败:', error);
      this.emit('health:error', error);
      return {
        isRunning: this.isRunning,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 对外健康检查
   */
  async healthCheck() {
    return this.performHealthCheck();
  }

  /**
   * 获取任务健康统计
   */
  getTaskHealthStats() {
    const now = Date.now();
    let healthyTasks = 0;
    let stuckTasks = 0;
    let errorTasks = 0;

    for (const [_taskId, task] of this.activeMonitors) {
      if (task.isRunning) {
        const runningTime = now - (task.startTime || now);
        if (runningTime > 300000) {
          stuckTasks += 1;
        } else {
          healthyTasks += 1;
        }
      } else {
        const timeSinceLastCheck = now - (task.lastCheck?.getTime() || 0);
        if (timeSinceLastCheck > (task.target.check_interval || 0) * 2000) {
          errorTasks += 1;
        } else {
          healthyTasks += 1;
        }
      }
    }

    return {
      total: this.activeMonitors.size,
      healthy: healthyTasks,
      stuck: stuckTasks,
      error: errorTasks,
    };
  }

  /**
   * 获取资源统计
   */
  getResourceStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
    };
  }

  /**
   * 确定整体健康状态
   */
  determineOverallHealth(stats: Record<string, unknown>) {
    if (stats.databaseStatus !== 'healthy') {
      return 'critical';
    }

    const resources = stats.resources as { memory?: { usage?: number } } | undefined;
    if (resources?.memory?.usage && resources.memory.usage > 90) {
      return 'degraded';
    }

    const taskStats = stats.taskStats as
      | { stuck?: number; error?: number; total?: number }
      | undefined;
    if ((taskStats?.stuck || 0) > 0) {
      return 'degraded';
    }

    if ((taskStats?.error || 0) > (taskStats?.total || 0) * 0.5) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * 尝试自动恢复
   */
  async attemptAutoRecovery(healthStats: Record<string, unknown>) {
    try {
      logger.info('检测到健康问题，尝试自动恢复...');

      const taskStats = healthStats.taskStats as { stuck?: number; error?: number } | undefined;
      const resources = healthStats.resources as { memory?: { usage?: number } } | undefined;

      if ((taskStats?.stuck || 0) > 0) {
        await this.restartStuckTasks();
      }

      if ((resources?.memory?.usage || 0) > 85) {
        this.performMemoryCleanup();
      }

      if ((taskStats?.error || 0) > 0) {
        await this.reloadMonitoringTargets();
      }

      logger.info('自动恢复尝试完成');
    } catch (error) {
      logger.error('自动恢复失败:', error);
      this.emit('recovery:failed', error);
    }
  }

  /**
   * 重启卡住的任务
   */
  async restartStuckTasks() {
    const now = Date.now();
    const stuckTasks: Array<{ taskId: string; task: MonitoringTask }> = [];

    for (const [taskId, task] of this.activeMonitors) {
      if (task.isRunning) {
        const runningTime = now - (task.startTime || now);
        if (runningTime > 300000) {
          stuckTasks.push({ taskId, task });
        }
      }
    }

    for (const { taskId, task } of stuckTasks) {
      try {
        logger.warn(`重启卡住的监控任务: ${task.target?.name || taskId}`);

        task.isRunning = false;
        if (task.intervalId) {
          clearInterval(task.intervalId);
        }

        this.createMonitoringTask(task.target);
      } catch (error) {
        logger.error(`重启任务失败 ${taskId}:`, error);
      }
    }

    if (stuckTasks.length > 0) {
      logger.info(`重启了 ${stuckTasks.length} 个卡住的任务`);
    }
  }

  /**
   * 执行内存清理
   */
  performMemoryCleanup() {
    try {
      if (this.alertHistory && this.alertHistory.size > 1000) {
        const entries = Array.from(this.alertHistory.entries());
        const toKeep = entries.slice(-500);
        this.alertHistory.clear();
        toKeep.forEach(([key, value]) => {
          this.alertHistory?.set(key, value);
        });
      }

      if (global.gc) {
        global.gc();
      }

      logger.info('内存清理完成');
    } catch (error) {
      logger.error('内存清理失败:', error);
    }
  }

  /**
   * 重新加载监控目标
   */
  async reloadMonitoringTargets() {
    try {
      logger.info('重新加载监控目标...');

      for (const [_taskId, task] of this.activeMonitors) {
        if (task.intervalId) {
          clearInterval(task.intervalId);
        }
      }
      this.activeMonitors.clear();

      await this.loadMonitoringTargets();

      logger.info('监控目标重新加载完成');
    } catch (error) {
      logger.error('重新加载监控目标失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.on('error', error => {
      logger.error('监控服务错误:', error);
    });

    this.on('alert:triggered', alertData => {
      logger.warn('监控告警:', alertData);
    });
  }

  /**
   * 添加监控目标
   */
  async addMonitoringTarget(targetData: Record<string, unknown>) {
    try {
      const query = `
        INSERT INTO monitoring_sites (
          user_id, name, url, monitoring_type, check_interval,
          timeout, config, notification_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        targetData.user_id,
        targetData.name,
        targetData.url,
        targetData.monitoring_type || 'uptime',
        targetData.check_interval || 300,
        targetData.timeout || 30,
        JSON.stringify(targetData.config || {}),
        JSON.stringify(targetData.notification_settings || {}),
      ];

      const result = await this.dbPool.query<MonitoringTarget>(query, values);
      const newTarget = result.rows[0];

      this.createMonitoringTask(newTarget);

      logger.info(`添加监控目标: ${newTarget.name} (${newTarget.url})`);

      return newTarget;
    } catch (error) {
      logger.error('添加监控目标失败:', error);
      throw error;
    }
  }

  /**
   * 移除监控目标
   */
  async removeMonitoringTarget(targetId: string) {
    try {
      if (this.activeMonitors.has(targetId)) {
        const task = this.activeMonitors.get(targetId);
        if (task?.intervalId) {
          clearInterval(task.intervalId);
        }
        this.activeMonitors.delete(targetId);
      }

      const query = `
        UPDATE monitoring_sites
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING name
      `;

      const result = await this.dbPool.query<{ name: string }>(query, [targetId]);

      if (result.rows.length > 0) {
        logger.info(`移除监控目标: ${result.rows[0].name}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('移除监控目标失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控统计
   */
  async getMonitoringStats(userId: string | null = null) {
    try {
      const userFilter = userId ? 'AND ms.user_id = $1' : '';
      const params = userId ? [userId] : [];

      const query = `
        SELECT
          COUNT(*) as total_sites,
          COUNT(CASE WHEN ms.status = 'active' THEN 1 END) as active_sites,
          COUNT(CASE WHEN ms.last_status = 'down' THEN 1 END) as down_sites,
          AVG(CASE WHEN mr.response_time IS NOT NULL THEN mr.response_time END) as avg_response_time,
          COUNT(CASE WHEN ms.consecutive_failures >= 3 THEN 1 END) as critical_alerts
        FROM monitoring_sites ms
        LEFT JOIN LATERAL (
          SELECT response_time
          FROM monitoring_results
          WHERE site_id = ms.id
          ORDER BY checked_at DESC
          LIMIT 1
        ) mr ON true
        WHERE ms.deleted_at IS NULL ${userFilter}
      `;

      const result = await this.dbPool.query<Record<string, string>>(query, params);
      const stats = result.rows[0];

      const uptime =
        Number(stats.total_sites) > 0
          ? (
              ((Number(stats.total_sites) - Number(stats.down_sites)) / Number(stats.total_sites)) *
              100
            ).toFixed(2)
          : '100';

      return {
        totalSites: Number.parseInt(stats.total_sites, 10),
        activeSites: Number.parseInt(stats.active_sites, 10),
        downSites: Number.parseInt(stats.down_sites, 10),
        avgResponseTime: stats.avg_response_time ? Math.round(Number(stats.avg_response_time)) : 0,
        uptime: Number.parseFloat(uptime),
        criticalAlerts: Number.parseInt(stats.critical_alerts, 10),
      };
    } catch (error) {
      logger.error('获取监控统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控目标列表
   */
  async getMonitoringTargets(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string | null;
      monitoringType?: string | null;
      search?: string | null;
    } = {}
  ) {
    try {
      const { page = 1, limit = 20, status = null, monitoringType = null, search = null } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          ms.*,
          mr.status as last_result_status,
          mr.response_time as last_response_time,
          mr.checked_at as last_checked_at
        FROM monitoring_sites ms
        LEFT JOIN LATERAL (
          SELECT status, response_time, checked_at
          FROM monitoring_results
          WHERE site_id = ms.id
          ORDER BY checked_at DESC
          LIMIT 1
        ) mr ON true
        WHERE ms.deleted_at IS NULL AND ms.user_id = $1
      `;

      const params: Array<string | number> = [userId];
      let paramIndex = 2;

      if (status) {
        query += ` AND ms.status = $${paramIndex}`;
        params.push(status);
        paramIndex += 1;
      }

      if (monitoringType) {
        query += ` AND ms.monitoring_type = $${paramIndex}`;
        params.push(monitoringType);
        paramIndex += 1;
      }

      if (search) {
        query += ` AND (ms.name ILIKE $${paramIndex} OR ms.url ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex += 1;
      }

      query += ` ORDER BY ms.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.dbPool.query(query, params);

      const countParams = params.slice(0, paramIndex - 1);
      const countQuery = `
        SELECT COUNT(*) as total
        FROM monitoring_sites ms
        WHERE ms.deleted_at IS NULL AND ms.user_id = $1
        ${status ? `AND ms.status = $2` : ''}
        ${status && monitoringType ? `AND ms.monitoring_type = $3` : ''}
        ${!status && monitoringType ? `AND ms.monitoring_type = $2` : ''}
        ${search ? `AND (ms.name ILIKE $${countParams.length + 1} OR ms.url ILIKE $${countParams.length + 1})` : ''}
      `;

      const countResult = await this.dbPool.query<Record<string, string>>(countQuery, countParams);
      const total = Number.parseInt(countResult.rows[0].total, 10);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('获取监控目标列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个监控目标
   */
  async getMonitoringTarget(siteId: string, userId: string) {
    try {
      const query = `
        SELECT
          ms.*,
          mr.status as last_result_status,
          mr.response_time as last_response_time,
          mr.checked_at as last_checked_at,
          mr.results as last_results
        FROM monitoring_sites ms
        LEFT JOIN LATERAL (
          SELECT status, response_time, checked_at, results
          FROM monitoring_results
          WHERE site_id = ms.id
          ORDER BY checked_at DESC
          LIMIT 1
        ) mr ON true
        WHERE ms.id = $1 AND ms.user_id = $2 AND ms.deleted_at IS NULL
      `;

      const result = await this.dbPool.query(query, [siteId, userId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('获取监控目标失败:', error);
      throw error;
    }
  }

  /**
   * 更新监控目标
   */
  async updateMonitoringTarget(
    siteId: string,
    userId: string,
    updateData: Record<string, unknown>
  ) {
    try {
      const allowedFields = [
        'name',
        'url',
        'monitoring_type',
        'check_interval',
        'timeout',
        'config',
        'notification_settings',
      ];
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex += 1;
        }
      }

      if (updates.length === 0) {
        throw new Error('没有有效的更新字段');
      }

      values.push(siteId, userId);
      const siteIdParam = paramIndex;
      const userIdParam = paramIndex + 1;

      const query = `
        UPDATE monitoring_sites
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${siteIdParam} AND user_id = $${userIdParam} AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.dbPool.query<MonitoringTarget>(query, values);

      if (result.rows.length > 0) {
        const updatedTarget = result.rows[0];

        if (this.activeMonitors.has(siteId)) {
          this.createMonitoringTask(updatedTarget);
        }

        logger.info(`更新监控目标: ${updatedTarget.name}`);
        return updatedTarget;
      }

      return null;
    } catch (error) {
      logger.error('更新监控目标失败:', error);
      throw error;
    }
  }

  /**
   * 立即执行监控检查
   */
  async executeImmediateCheck(siteId: string, userId: string) {
    try {
      const target = await this.getMonitoringTarget(siteId, userId);
      if (!target) {
        throw new Error('监控站点不存在或无权限访问');
      }

      const result = await this.executeCheck(target as MonitoringTarget);

      await this.saveCheckResult(target.id as string, result);
      await this.updateTargetStatus(target.id as string, result);

      logger.info(`立即执行监控检查: ${target.name}`);

      return {
        siteId: target.id,
        siteName: target.name,
        result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('立即执行监控检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取监控历史记录
   */
  async getMonitoringHistory(
    siteId: string,
    userId: string,
    options: { page?: number; limit?: number; timeRange?: string; status?: string } = {}
  ) {
    try {
      const target = await this.getMonitoringTarget(siteId, userId);
      if (!target) {
        throw new Error('监控站点不存在或无权限访问');
      }

      const { page = 1, limit = 50, timeRange = '24h', status } = options;
      const offset = (page - 1) * limit;

      let timeCondition = '';
      switch (timeRange) {
        case '1h':
          timeCondition = "AND checked_at >= NOW() - INTERVAL '1 hour'";
          break;
        case '24h':
          timeCondition = "AND checked_at >= NOW() - INTERVAL '24 hours'";
          break;
        case '7d':
          timeCondition = "AND checked_at >= NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          timeCondition = "AND checked_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          break;
      }

      const statusCondition = status ? 'AND status = $4' : '';
      const query = `
        SELECT
          id, status, response_time, status_code,
          results, error_message, checked_at
        FROM monitoring_results
        WHERE site_id = $1 ${timeCondition} ${statusCondition}
        ORDER BY checked_at DESC
        LIMIT $2 OFFSET $3
      `;

      const params = status ? [siteId, limit, offset, status] : [siteId, limit, offset];
      const result = await this.dbPool.query(query, params);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM monitoring_results
        WHERE site_id = $1 ${timeCondition} ${statusCondition}
      `;

      const countResult = await this.dbPool.query<Record<string, string>>(
        countQuery,
        status ? [siteId, status] : [siteId]
      );
      const total = Number.parseInt(countResult.rows[0].total, 10);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('获取监控历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取告警列表
   */
  async getAlerts(
    userId: string,
    options: Record<string, unknown> = {}
  ): Promise<{
    data: Array<Record<string, unknown>>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        severity,
        status: statusValue = 'active',
        timeRange = null,
      } = options as {
        page?: number;
        limit?: number;
        severity?: string;
        status?: string;
        timeRange?: string | null;
      };
      const offset = (page - 1) * limit;

      let timeCondition = '';
      switch (timeRange) {
        case '1h':
          timeCondition = "AND ma.created_at >= NOW() - INTERVAL '1 hour'";
          break;
        case '24h':
          timeCondition = "AND ma.created_at >= NOW() - INTERVAL '24 hours'";
          break;
        case '7d':
          timeCondition = "AND ma.created_at >= NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          timeCondition = "AND ma.created_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          break;
      }

      const params: Array<string | number> = [userId];
      let paramIndex = 2;
      const conditions = ['ms.user_id = $1', 'ms.deleted_at IS NULL'];

      if (statusValue) {
        conditions.push(`ma.status = $${paramIndex}`);
        params.push(statusValue);
        paramIndex += 1;
      }
      if (severity) {
        conditions.push(`ma.severity = $${paramIndex}`);
        params.push(severity);
        paramIndex += 1;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')} ${timeCondition}`;
      const query = `
        SELECT
          ma.id,
          ma.site_id,
          ms.name as site_name,
          ms.url,
          ma.alert_type,
          ma.severity,
          ma.status,
          ma.message,
          ma.details,
          ma.created_at,
          ma.acknowledged_at,
          ma.resolved_at
        FROM monitoring_alerts ma
        JOIN monitoring_sites ms ON ma.site_id = ms.id
        ${whereClause}
        ORDER BY ma.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) as total
        FROM monitoring_alerts ma
        JOIN monitoring_sites ms ON ma.site_id = ms.id
        ${whereClause}
      `;

      const [result, countResult] = await Promise.all([
        this.dbPool.query(query, params),
        this.dbPool.query<Record<string, string>>(countQuery, params.slice(0, params.length - 2)),
      ]);
      const total = Number.parseInt(countResult.rows[0].total, 10);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if ((error as { code?: string }).code === '42P01') {
        await this.createAlertsTable();
        return this.getAlerts(userId, options);
      }
      logger.error('获取告警列表失败:', error);
      throw error;
    }
  }

  /**
   * 标记告警为已读
   */
  async markAlertAsRead(alertId: string, userId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE monitoring_alerts ma
        SET status = 'acknowledged', acknowledged_at = NOW(), updated_at = NOW()
        FROM monitoring_sites ms
        WHERE ma.id = $1 AND ma.site_id = ms.id AND ms.user_id = $2
        RETURNING ma.id
      `;
      const result = await this.dbPool.query(query, [alertId, userId]);
      if (result.rows.length === 0) {
        return false;
      }
      logger.info(`标记告警为已读: ${alertId} by user ${userId}`);
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === '42P01') {
        await this.createAlertsTable();
        return this.markAlertAsRead(alertId, userId);
      }
      logger.error('标记告警为已读失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新告警
   */
  async batchUpdateAlerts(
    alertIds: string[],
    userId: string,
    action: string
  ): Promise<{ updated: number }> {
    try {
      const actionMap: Record<string, { status: string; field: string }> = {
        read: { status: 'acknowledged', field: 'acknowledged_at' },
        resolve: { status: 'resolved', field: 'resolved_at' },
      };
      const config = actionMap[action];
      if (!config) {
        return { updated: 0 };
      }

      const query = `
        UPDATE monitoring_alerts ma
        SET status = $3, ${config.field} = NOW(), updated_at = NOW()
        FROM monitoring_sites ms
        WHERE ma.id = ANY($1) AND ma.site_id = ms.id AND ms.user_id = $2
        RETURNING ma.id
      `;
      const result = await this.dbPool.query(query, [alertIds, userId, config.status]);
      logger.info(`批量${action}告警: ${result.rows.length}个告警 by user ${userId}`);
      return { updated: result.rows.length };
    } catch (error) {
      if ((error as { code?: string }).code === '42P01') {
        await this.createAlertsTable();
        return this.batchUpdateAlerts(alertIds, userId, action);
      }
      logger.error('批量更新告警失败:', error);
      throw error;
    }
  }

  /**
   * 创建告警表
   */
  async createAlertsTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
          id VARCHAR(255) PRIMARY KEY,
          site_id UUID NOT NULL,
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
          message TEXT,
          details JSONB DEFAULT '{}',
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          acknowledged_by UUID,
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_site ON monitoring_alerts(site_id);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
        CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created ON monitoring_alerts(created_at DESC);
      `;

    await this.dbPool.query(createTableQuery);
    logger.info('创建告警表成功');
  }

  /**
   * 获取系统统计
   */
  async getSystemStats() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      return {
        uptime: process.uptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        activeMonitors: this.activeMonitors.size,
        isRunning: this.isRunning,
      };
    } catch (error) {
      logger.error('获取系统统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取最近事件
   */
  async getRecentEvents(userId: string, limit = 10) {
    try {
      const query = `
        SELECT
          mr.id,
          ms.name as site_name,
          ms.url,
          mr.status,
          mr.error_message,
          mr.checked_at,
          CASE
            WHEN mr.status = 'up' THEN 'recovery'
            WHEN mr.status IN ('down', 'timeout', 'error') THEN 'site_down'
            ELSE 'status_change'
          END as event_type
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 AND ms.deleted_at IS NULL
        ORDER BY mr.checked_at DESC
        LIMIT $2
      `;

      const result = await this.dbPool.query(query, [userId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        type: row.event_type,
        site: row.site_name,
        url: row.url,
        timestamp: row.checked_at,
        message: row.error_message || `站点状态: ${row.status}`,
      }));
    } catch (error) {
      logger.error('获取最近事件失败:', error);
      throw error;
    }
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus() {
    try {
      return {
        service: this.isRunning ? 'healthy' : 'down',
        activeMonitors: this.activeMonitors.size,
        uptime: process.uptime(),
        lastCheck: new Date().toISOString(),
        version: '1.0.0',
      };
    } catch (error) {
      logger.error('获取健康状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取分析数据
   */
  async getAnalytics(userId: string, options: { timeRange?: string; siteId?: string } = {}) {
    try {
      const { timeRange = '24h', siteId } = options;

      let timeCondition = '';
      switch (timeRange) {
        case '1h':
          timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '1 hour'";
          break;
        case '24h':
          timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '24 hours'";
          break;
        case '7d':
          timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          timeCondition = "AND mr.checked_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          break;
      }

      let siteCondition = '';
      const params: Array<string> = [userId];
      if (siteId) {
        siteCondition = 'AND ms.id = $2';
        params.push(siteId);
      }

      const query = `
        SELECT
          COUNT(*) as total_checks,
          COUNT(CASE WHEN mr.status = 'up' THEN 1 END) as successful_checks,
          COUNT(CASE WHEN mr.status IN ('down', 'timeout', 'error') THEN 1 END) as failed_checks,
          AVG(mr.response_time) as avg_response_time,
          MIN(mr.response_time) as min_response_time,
          MAX(mr.response_time) as max_response_time
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 ${siteCondition} ${timeCondition}
          AND ms.deleted_at IS NULL
      `;

      const result = await this.dbPool.query<Record<string, string>>(query, params);
      const stats = result.rows[0];

      const statusQuery = `
        SELECT mr.status, COUNT(*) as count
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 ${siteCondition} ${timeCondition}
          AND ms.deleted_at IS NULL
        GROUP BY mr.status
      `;
      const statusResult = await this.dbPool.query<Record<string, string>>(statusQuery, params);
      const statusCounts = statusResult.rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.status as string] = Number.parseInt(row.count, 10);
        return acc;
      }, {});

      const responseTimeBuckets = {
        fast: 0,
        normal: 0,
        slow: 0,
      };
      const bucketQuery = `
        SELECT mr.response_time
        FROM monitoring_results mr
        JOIN monitoring_sites ms ON mr.site_id = ms.id
        WHERE ms.user_id = $1 ${siteCondition} ${timeCondition}
          AND ms.deleted_at IS NULL
          AND mr.response_time IS NOT NULL
      `;
      const bucketResult = await this.dbPool.query<Record<string, string>>(bucketQuery, params);
      bucketResult.rows.forEach(row => {
        const value = Number(row.response_time);
        if (value <= 500) {
          responseTimeBuckets.fast += 1;
        } else if (value <= 1500) {
          responseTimeBuckets.normal += 1;
        } else {
          responseTimeBuckets.slow += 1;
        }
      });

      const statusChart = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      const responseTimeChart = Object.entries(responseTimeBuckets).map(([name, value]) => ({
        name,
        value,
      }));

      return {
        totalChecks: Number.parseInt(stats.total_checks, 10),
        successfulChecks: Number.parseInt(stats.successful_checks, 10),
        failedChecks: Number.parseInt(stats.failed_checks, 10),
        successRate:
          Number.parseInt(stats.total_checks, 10) > 0
            ? (
                (Number.parseInt(stats.successful_checks, 10) /
                  Number.parseInt(stats.total_checks, 10)) *
                100
              ).toFixed(2)
            : 0,
        avgResponseTime: stats.avg_response_time ? Math.round(Number(stats.avg_response_time)) : 0,
        minResponseTime: stats.min_response_time ? Math.round(Number(stats.min_response_time)) : 0,
        maxResponseTime: stats.max_response_time ? Math.round(Number(stats.max_response_time)) : 0,
        timeRange,
        statusCounts,
        responseTimeBuckets,
        statusChart,
        responseTimeChart,
      };
    } catch (error) {
      logger.error('获取分析数据失败:', error);
      throw error;
    }
  }

  /**
   * 导出数据
   */
  async exportData(
    userId: string,
    options: { format?: string; timeRange?: string; siteId?: string } = {}
  ) {
    try {
      const { format = 'json', timeRange = '24h', siteId } = options;

      const analytics = await this.getAnalytics(userId, { timeRange, siteId });
      const sites = await this.getMonitoringTargets(userId);

      const charts = {
        statusChart: Object.entries(analytics.statusCounts || {})
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        responseTimeChart: Object.entries(analytics.responseTimeBuckets || {}).map(
          ([name, value]) => ({ name, value })
        ),
      };

      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          timeRange,
          format,
          userId,
        },
        analytics,
        charts,
        sites: sites.data,
      };

      if (format === 'csv') {
        const csvLines = [
          'Site Name,URL,Status,Last Check,Response Time',
          ...sites.data.map(
            (site: Record<string, unknown>) =>
              `"${site.name}","${site.url}","${site.last_status || 'unknown'}","${site.last_checked_at || ''}","${site.last_response_time || ''}"`
          ),
        ];
        return csvLines.join('\n');
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('导出数据失败:', error);
      throw error;
    }
  }

  /**
   * 生成监控报告
   */
  async generateReport(userId: string, options: Record<string, unknown> = {}) {
    try {
      const {
        reportType = 'summary',
        timeRange = '24h',
        siteIds = [],
        format = 'pdf',
        includeCharts = true,
        includeDetails = true,
      } = options as {
        reportType?: string;
        timeRange?: string;
        siteIds?: string[];
        format?: string;
        includeCharts?: boolean;
        includeDetails?: boolean;
      };

      const reportData = await this.getReportData(userId, {
        reportType,
        timeRange,
        siteIds,
        includeDetails,
      });

      const reportFile = await this.createReportFile(reportData, {
        format,
        includeCharts,
        reportType,
      });

      const reportRecord = await this.saveReportRecord(userId, {
        reportType,
        timeRange,
        format,
        filename: reportFile.filename,
        filePath: reportFile.path,
        siteIds,
      });

      logger.info(`监控报告生成成功: ${reportRecord.id} for user ${userId}`);

      return {
        id: reportRecord.id,
        filename: reportFile.filename,
        downloadUrl: `/api/monitoring/reports/${reportRecord.id}/download`,
        createdAt: reportRecord.created_at,
      };
    } catch (error) {
      logger.error('生成监控报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取报告数据
   */
  async getReportData(userId: string, options: Record<string, unknown>) {
    const { reportType, timeRange, siteIds, includeDetails } = options as {
      reportType: string;
      timeRange: string;
      siteIds: string[];
      includeDetails: boolean;
    };

    const stats = await this.getMonitoringStats(userId);

    let sites: MonitoringTarget[] = [];
    if (siteIds.length > 0) {
      for (const siteId of siteIds) {
        const site = await this.getMonitoringTarget(siteId, userId);
        if (site) sites.push(site as MonitoringTarget);
      }
    } else {
      const result = await this.getMonitoringTargets(userId, { limit: 1000 });
      sites = result.data as MonitoringTarget[];
    }

    const historyData: Array<Record<string, unknown>> = [];
    if (includeDetails) {
      for (const site of sites) {
        const history = await this.getMonitoringHistory(site.id, userId, {
          timeRange,
          limit: 100,
        });
        historyData.push({
          siteId: site.id,
          siteName: site.name,
          history: history.data,
        });
      }
    }

    const alerts = await this.getAlerts(userId, {
      timeRange,
      limit: 100,
    });

    return {
      reportType,
      timeRange,
      generatedAt: new Date().toISOString(),
      stats,
      sites,
      historyData,
      alerts: alerts.data,
      summary: {
        totalSites: sites.length,
        activeSites: sites.filter(site => site.is_active).length,
        onlineSites: sites.filter(site => site.status === 'online').length,
        totalAlerts: alerts.data.length,
        activeAlerts: alerts.data.filter(
          (alert: Record<string, unknown>) => alert.status === 'active'
        ).length,
      },
    };
  }

  /**
   * 创建报告文件
   */
  async createReportFile(
    reportData: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<ReportFile> {
    const { format, reportType } = options as { format: string; reportType: string };
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `monitoring-report-${reportType}-${timestamp}.${format}`;

    if (format === 'json') {
      return {
        filename,
        data: JSON.stringify(reportData, null, 2),
        contentType: 'application/json',
      };
    }

    if (format === 'csv') {
      const csvData = this.convertToCSV(reportData as CsvReportData);
      return {
        filename: filename.replace('.csv', '.csv'),
        data: csvData,
        contentType: 'text/csv',
      };
    }

    if (format === 'pdf') {
      return {
        filename: filename.replace('.pdf', '.json'),
        data: JSON.stringify(reportData, null, 2),
        contentType: 'application/json',
      };
    }

    throw new Error(`不支持的报告格式: ${format}`);
  }

  /**
   * 转换为CSV格式
   */
  convertToCSV(reportData: CsvReportData) {
    const lines: string[] = [];

    lines.push('监控报告');
    lines.push(`生成时间,${reportData.generatedAt}`);
    lines.push(`报告类型,${reportData.reportType}`);
    lines.push(`时间范围,${reportData.timeRange}`);
    lines.push('');

    lines.push('摘要信息');
    lines.push('指标,数值');
    lines.push(`总站点数,${reportData.summary.totalSites}`);
    lines.push(`活跃站点数,${reportData.summary.activeSites}`);
    lines.push(`在线站点数,${reportData.summary.onlineSites}`);
    lines.push(`总告警数,${reportData.summary.totalAlerts}`);
    lines.push(`活跃告警数,${reportData.summary.activeAlerts}`);
    lines.push('');

    if (reportData.sites.length > 0) {
      lines.push('站点信息');
      lines.push('站点名称,URL,状态,类型,检查间隔,最后检查时间');
      reportData.sites.forEach((site: Record<string, unknown>) => {
        lines.push(
          `${site.name},${site.url},${site.status},${site.monitoring_type},${site.check_interval},${site.last_checked || '从未'}`
        );
      });
      lines.push('');
    }

    if (reportData.alerts.length > 0) {
      lines.push('告警信息');
      lines.push('站点名称,告警类型,严重程度,状态,消息,创建时间');
      reportData.alerts.forEach((alert: Record<string, unknown>) => {
        lines.push(
          `${alert.site_name},${alert.alert_type},${alert.severity},${alert.status},${alert.message},${alert.created_at}`
        );
      });
    }

    return lines.join('\n');
  }

  /**
   * 保存报告记录
   */
  async saveReportRecord(
    userId: string,
    reportInfo: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const query = `
                INSERT INTO monitoring_reports (
                    id, user_id, report_type, time_range, format,
                    filename, file_path, site_ids, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const values = [
        reportId,
        userId,
        reportInfo.reportType,
        reportInfo.timeRange,
        reportInfo.format,
        reportInfo.filename,
        reportInfo.filePath || null,
        JSON.stringify(reportInfo.siteIds),
        new Date().toISOString(),
      ];

      const result = await this.dbPool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === '42P01') {
        await this.createReportsTable();
        return this.saveReportRecord(userId, reportInfo);
      }
      throw error;
    }
  }

  /**
   * 创建报告表
   */
  async createReportsTable() {
    const createTableQuery = `
            CREATE TABLE IF NOT EXISTS monitoring_reports (
                id VARCHAR(255) PRIMARY KEY,
                user_id UUID NOT NULL,
                report_type VARCHAR(50) NOT NULL,
                time_range VARCHAR(20) NOT NULL,
                format VARCHAR(10) NOT NULL,
                filename VARCHAR(255) NOT NULL,
                file_path TEXT,
                site_ids JSONB DEFAULT '[]',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

                INDEX idx_monitoring_reports_user (user_id),
                INDEX idx_monitoring_reports_created (created_at DESC)
            );
        `;

    await this.dbPool.query(createTableQuery);
    logger.info('创建监控报告表成功');
  }

  /**
   * 获取报告列表
   */
  async getReports(userId: string, options: Record<string, unknown> = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        reportType,
        timeRange,
      } = options as {
        page?: number;
        limit?: number;
        reportType?: string;
        timeRange?: string;
      };
      const offset = (page - 1) * limit;

      const conditions = ['user_id = $1'];
      const params: Array<string | number> = [userId];
      let paramIndex = 2;

      if (reportType) {
        conditions.push(`report_type = $${paramIndex}`);
        params.push(reportType);
        paramIndex += 1;
      }

      if (timeRange) {
        conditions.push(`time_range = $${paramIndex}`);
        params.push(timeRange);
        paramIndex += 1;
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const query = `
                SELECT * FROM monitoring_reports
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
      const countQuery = `
                SELECT COUNT(*) as total FROM monitoring_reports
                ${whereClause}
            `;
      params.push(limit, offset);

      const [dataResult, countResult] = await Promise.all([
        this.dbPool.query(query, params),
        this.dbPool.query<Record<string, string>>(countQuery, params.slice(0, params.length - 2)),
      ]);

      const total = Number.parseInt(countResult.rows[0].total, 10);

      return {
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('获取报告列表失败:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * 下载报告
   */
  async downloadReport(reportId: string, userId: string) {
    try {
      const query = `
                SELECT * FROM monitoring_reports
                WHERE id = $1 AND user_id = $2
            `;

      const result = await this.dbPool.query<Record<string, string>>(query, [reportId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      const report = result.rows[0];

      if (report.file_path && require('fs').existsSync(report.file_path)) {
        const fs = require('fs');
        const data = fs.readFileSync(report.file_path);
        return {
          filename: report.filename,
          data,
          contentType: this.getContentType(report.format),
        };
      }

      const reportData = await this.getReportData(userId, {
        reportType: report.report_type,
        timeRange: report.time_range,
        siteIds: JSON.parse(report.site_ids || '[]'),
        includeDetails: true,
      });

      const reportFile = await this.createReportFile(reportData, {
        format: report.format,
        includeCharts: true,
        reportType: report.report_type,
      });

      return {
        filename: report.filename,
        data: reportFile.data,
        contentType: reportFile.contentType,
      };
    } catch (error) {
      logger.error('下载报告失败:', error);
      return null;
    }
  }

  /**
   * 获取内容类型
   */
  getContentType(format: string) {
    const contentTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      pdf: 'application/pdf',
      html: 'text/html',
    };
    return contentTypes[format] || 'application/octet-stream';
  }
}

export { MonitoringService };

// 兼容 CommonJS require
module.exports = MonitoringService;
