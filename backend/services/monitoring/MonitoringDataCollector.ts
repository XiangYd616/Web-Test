/**
 * 监控数据收集器
 * 负责收集、处理和存储监控数据
 */

import { EventEmitter } from 'events';

const logger = require('../../utils/logger');

type DbRow = Record<string, unknown>;

type DbQueryResult<T extends DbRow = DbRow> = {
  rows: T[];
};

type DbPool = {
  query: <T extends DbRow = DbRow>(text: string, params?: unknown[]) => Promise<DbQueryResult<T>>;
};

type MonitoringDataPoint = {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  id: string;
};

type MonitoringStats = {
  totalCollected: number;
  totalStored: number;
  totalErrors: number;
  bufferSize: number;
  lastFlush: string | null;
};

type CheckResult = {
  status: string;
  response_time?: number | null;
  status_code?: number | null;
  results?: Record<string, unknown>;
  error_message?: string | null;
};

type AlertData = {
  targetId: string;
  type?: string;
  severity?: string;
  message: string;
  details?: Record<string, unknown>;
};

class MonitoringDataCollector extends EventEmitter {
  private dbPool: DbPool;
  private dataBuffer = new Map<string, MonitoringDataPoint>();
  private batchSize = 100;
  private flushInterval = 30000;
  private flushTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private stats: MonitoringStats = {
    totalCollected: 0,
    totalStored: 0,
    totalErrors: 0,
    bufferSize: 0,
    lastFlush: null,
  };

  constructor(dbPool: DbPool) {
    super();
    this.dbPool = dbPool;
    this.setupEventHandlers();
  }

  /**
   * 启动数据收集器
   */
  start() {
    if (this.isRunning) {
      logger.warn('监控数据收集器已在运行中');
      return;
    }

    logger.info('启动监控数据收集器...');

    this.isRunning = true;
    this.startFlushTimer();

    this.emit('collector:started');
    logger.info('监控数据收集器启动成功');
  }

  /**
   * 停止数据收集器
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('停止监控数据收集器...');

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushBuffer();

    this.isRunning = false;
    this.emit('collector:stopped');
    logger.info('监控数据收集器已停止');
  }

  /**
   * 收集监控数据
   */
  async collectData(dataType: string, data: Record<string, unknown>) {
    try {
      if (!this.isRunning) {
        logger.warn('数据收集器未运行，忽略数据收集');
        return;
      }

      const timestamp = new Date().toISOString();
      const dataPoint: MonitoringDataPoint = {
        type: dataType,
        timestamp,
        data,
        id: this.generateDataId(),
      };

      this.dataBuffer.set(dataPoint.id, dataPoint);
      this.stats.totalCollected += 1;
      this.stats.bufferSize = this.dataBuffer.size;

      logger.debug(`收集监控数据: ${dataType}, 缓冲区大小: ${this.dataBuffer.size}`);

      if (this.dataBuffer.size >= this.batchSize) {
        await this.flushBuffer();
      }

      this.emit('data:collected', {
        type: dataType,
        timestamp,
        bufferSize: this.dataBuffer.size,
      });

      return dataPoint.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('收集监控数据失败:', error);
      this.stats.totalErrors += 1;
      this.emit('data:error', { type: dataType, error: errorMessage });
      throw error;
    }
  }

  /**
   * 收集检查结果数据
   */
  async collectCheckResult(siteId: string, result: CheckResult) {
    const data = {
      site_id: siteId,
      status: result.status,
      response_time: result.response_time,
      status_code: result.status_code,
      results: result.results,
      error_message: result.error_message,
      checked_at: new Date().toISOString(),
    };

    return await this.collectData('check_result', data);
  }

  /**
   * 收集性能指标数据
   */
  async collectPerformanceMetrics(siteId: string, metrics: Record<string, unknown>) {
    const data = {
      site_id: siteId,
      metrics: {
        response_time: metrics.response_time,
        ttfb: metrics.ttfb,
        dns_lookup: metrics.dns_lookup,
        tcp_connect: metrics.tcp_connect,
        ssl_handshake: metrics.ssl_handshake,
        content_download: metrics.content_download,
      },
      timestamp: new Date().toISOString(),
    };

    return await this.collectData('performance_metrics', data);
  }

  /**
   * 收集可用性数据
   */
  async collectUptimeData(siteId: string, uptimeData: Record<string, unknown>) {
    const data = {
      site_id: siteId,
      is_up: uptimeData.is_up,
      response_time: uptimeData.response_time,
      status_code: uptimeData.status_code,
      error_message: uptimeData.error_message,
      timestamp: new Date().toISOString(),
    };

    return await this.collectData('uptime_data', data);
  }

  /**
   * 收集告警数据
   */
  async collectAlertData(alertData: AlertData) {
    const data = {
      site_id: alertData.targetId,
      alert_type: alertData.type || 'site_down',
      severity: alertData.severity || 'high',
      message: alertData.message,
      details: alertData.details || {},
      triggered_at: new Date().toISOString(),
    };

    return await this.collectData('alert_data', data);
  }

  /**
   * 收集系统指标数据
   */
  async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const data = {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    return await this.collectData('system_metrics', data);
  }

  /**
   * 刷新缓冲区数据到数据库
   */
  async flushBuffer() {
    if (this.dataBuffer.size === 0) {
      return;
    }

    const startTime = Date.now();
    const dataPoints = Array.from(this.dataBuffer.values());

    logger.debug(`开始刷新缓冲区: ${dataPoints.length} 条数据`);

    try {
      const groupedData = this.groupDataByType(dataPoints);

      for (const [dataType, items] of Object.entries(groupedData)) {
        await this.storeDataByType(dataType, items);
      }

      this.dataBuffer.clear();

      const duration = Date.now() - startTime;
      this.stats.totalStored += dataPoints.length;
      this.stats.bufferSize = 0;
      this.stats.lastFlush = new Date().toISOString();

      logger.debug(`缓冲区刷新完成: ${dataPoints.length} 条数据, 耗时: ${duration}ms`);

      this.emit('buffer:flushed', {
        count: dataPoints.length,
        duration,
        timestamp: this.stats.lastFlush,
      });
    } catch (error) {
      logger.error('刷新缓冲区失败:', error);
      this.stats.totalErrors += 1;
      this.emit('buffer:error', error);
    }
  }

  /**
   * 按数据类型分组
   */
  groupDataByType(dataPoints: MonitoringDataPoint[]) {
    const grouped: Record<string, MonitoringDataPoint[]> = {};

    for (const point of dataPoints) {
      if (!grouped[point.type]) {
        grouped[point.type] = [];
      }
      grouped[point.type].push(point);
    }

    return grouped;
  }

  /**
   * 根据数据类型存储数据
   */
  async storeDataByType(dataType: string, items: MonitoringDataPoint[]) {
    switch (dataType) {
      case 'check_result':
        await this.storeCheckResults(items);
        break;
      case 'performance_metrics':
        await this.storePerformanceMetrics(items);
        break;
      case 'uptime_data':
        await this.storeUptimeData(items);
        break;
      case 'alert_data':
        await this.storeAlertData(items);
        break;
      case 'system_metrics':
        await this.storeSystemMetrics(items);
        break;
      default:
        logger.warn(`未知的数据类型: ${dataType}`);
    }
  }

  /**
   * 存储检查结果
   */
  async storeCheckResults(items: MonitoringDataPoint[]) {
    if (items.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const data = item.data as Record<string, unknown>;
      const baseIndex = i * 7;

      values.push(
        data.site_id,
        data.status,
        data.response_time,
        data.status_code,
        JSON.stringify(data.results || {}),
        data.error_message,
        data.checked_at
      );

      placeholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`
      );
    }

    const query = `
      INSERT INTO monitoring_results (
        site_id, status, response_time, status_code,
        results, error_message, checked_at
      ) VALUES ${placeholders.join(', ')}
    `;

    await this.dbPool.query(query, values);
    logger.debug(`存储检查结果: ${items.length} 条`);
  }

  /**
   * 存储性能指标
   */
  async storePerformanceMetrics(items: MonitoringDataPoint[]) {
    if (items.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const data = item.data as Record<string, unknown>;
      const metrics = (data.metrics as Record<string, unknown>) || {};
      const baseIndex = i * 6;

      values.push(
        data.site_id,
        'ok',
        metrics.response_time ?? null,
        null,
        JSON.stringify(metrics),
        null
      );

      placeholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, NOW())`
      );
    }

    const query = `
      INSERT INTO monitoring_results (
        site_id, status, response_time, status_code,
        results, error_message, checked_at
      ) VALUES ${placeholders.join(', ')}
    `;

    await this.dbPool.query(query, values);
    logger.debug(`存储性能指标: ${items.length} 条`);
  }

  /**
   * 存储可用性数据
   */
  async storeUptimeData(items: MonitoringDataPoint[]) {
    if (items.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const data = item.data as Record<string, unknown>;
      const status = data.is_up ? 'up' : 'down';
      const baseIndex = i * 6;

      values.push(
        data.site_id,
        status,
        data.response_time ?? null,
        data.status_code ?? null,
        JSON.stringify({}),
        data.error_message ?? null
      );

      placeholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, NOW())`
      );
    }

    const query = `
      INSERT INTO monitoring_results (
        site_id, status, response_time, status_code,
        results, error_message, checked_at
      ) VALUES ${placeholders.join(', ')}
    `;

    await this.dbPool.query(query, values);
    logger.debug(`存储可用性数据: ${items.length} 条`);
  }

  /**
   * 存储告警数据
   */
  async storeAlertData(items: MonitoringDataPoint[]) {
    if (items.length === 0) return;

    for (const item of items) {
      const data = item.data as Record<string, unknown>;
      logger.info(
        `告警记录: 站点 ${data.site_id}, 类型: ${data.alert_type}, 消息: ${data.message}`
      );
    }
  }

  /**
   * 存储系统指标
   */
  async storeSystemMetrics(items: MonitoringDataPoint[]) {
    if (items.length === 0) return;

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let index = 0;

    for (const item of items) {
      const data = item.data as Record<string, unknown>;
      const memory = (data.memory as Record<string, unknown>) || {};
      const cpu = (data.cpu as Record<string, unknown>) || {};
      const timestamp = data.timestamp ?? new Date().toISOString();

      const metrics: Array<{ name: string; value: unknown; unit: string; type: string }> = [
        { name: 'memory_rss', value: memory.rss, unit: 'bytes', type: 'memory' },
        { name: 'memory_heap_total', value: memory.heapTotal, unit: 'bytes', type: 'memory' },
        { name: 'memory_heap_used', value: memory.heapUsed, unit: 'bytes', type: 'memory' },
        { name: 'memory_external', value: memory.external, unit: 'bytes', type: 'memory' },
        { name: 'cpu_user', value: cpu.user, unit: 'microseconds', type: 'cpu' },
        { name: 'cpu_system', value: cpu.system, unit: 'microseconds', type: 'cpu' },
        { name: 'uptime', value: data.uptime, unit: 'seconds', type: 'system' },
      ];

      for (const metric of metrics) {
        if (metric.value === undefined || metric.value === null) {
          continue;
        }
        index += 1;
        const baseIndex = (index - 1) * 7;
        values.push(
          metric.type,
          metric.name,
          Number(metric.value),
          metric.unit,
          'system',
          JSON.stringify({ source: 'monitoring' }),
          timestamp
        );
        placeholders.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7})`
        );
      }
    }

    if (placeholders.length === 0) {
      return;
    }

    const query = `
      INSERT INTO system_metrics (
        metric_type, metric_name, value, unit,
        source, tags, timestamp
      ) VALUES ${placeholders.join(', ')}
    `;

    await this.dbPool.query(query, values);
    logger.debug(`存储系统指标: ${placeholders.length} 条`);
  }

  /**
   * 启动刷新定时器
   */
  startFlushTimer() {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flushBuffer();
      } catch (error) {
        logger.error('定时刷新缓冲区失败:', error);
      }
    }, this.flushInterval);

    logger.debug(`启动缓冲区刷新定时器: ${this.flushInterval}ms`);
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    this.on('error', error => {
      logger.error('监控数据收集器错误:', error);
    });

    setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.collectSystemMetrics();
        } catch (error) {
          logger.error('收集系统指标失败:', error);
        }
      }
    }, 60000);
  }

  /**
   * 生成数据ID
   */
  generateDataId() {
    return `data_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 获取缓冲区状态
   */
  getBufferStatus() {
    return {
      size: this.dataBuffer.size,
      maxSize: this.batchSize,
      utilizationPercent: ((this.dataBuffer.size / this.batchSize) * 100).toFixed(2),
    };
  }

  /**
   * 清空缓冲区
   */
  clearBuffer() {
    const size = this.dataBuffer.size;
    this.dataBuffer.clear();
    this.stats.bufferSize = 0;

    logger.info(`清空缓冲区: ${size} 条数据`);

    this.emit('buffer:cleared', { size });
  }

  /**
   * 设置批量大小
   */
  setBatchSize(size: number) {
    if (size > 0 && size <= 1000) {
      this.batchSize = size;
      logger.info(`设置批量大小: ${size}`);
    } else {
      throw new Error('批量大小必须在1-1000之间');
    }
  }

  /**
   * 设置刷新间隔
   */
  setFlushInterval(interval: number) {
    if (interval >= 5000 && interval <= 300000) {
      this.flushInterval = interval;

      if (this.flushTimer) {
        clearInterval(this.flushTimer);
        this.startFlushTimer();
      }

      logger.info(`设置刷新间隔: ${interval}ms`);
    } else {
      throw new Error('刷新间隔必须在5000-300000ms之间');
    }
  }

  /**
   * 获取数据统计
   */
  async getDataStatistics(timeRange = '24h') {
    try {
      let timeCondition = '';

      switch (timeRange) {
        case '1h':
          timeCondition = "checked_at >= NOW() - INTERVAL '1 hour'";
          break;
        case '24h':
          timeCondition = "checked_at >= NOW() - INTERVAL '24 hours'";
          break;
        case '7d':
          timeCondition = "checked_at >= NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          timeCondition = "checked_at >= NOW() - INTERVAL '30 days'";
          break;
        default:
          timeCondition = "checked_at >= NOW() - INTERVAL '24 hours'";
      }

      const query = `
        SELECT
          COUNT(*) as total_checks,
          COUNT(CASE WHEN status = 'up' THEN 1 END) as successful_checks,
          COUNT(CASE WHEN status = 'down' THEN 1 END) as failed_checks,
          AVG(response_time) as avg_response_time,
          MIN(response_time) as min_response_time,
          MAX(response_time) as max_response_time
        FROM monitoring_results
        WHERE ${timeCondition}
      `;

      const result = await this.dbPool.query(query);
      const stats = result.rows[0] as Record<string, string>;

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
      };
    } catch (error) {
      logger.error('获取数据统计失败:', error);
      throw error;
    }
  }
}

export { MonitoringDataCollector };

// 兼容 CommonJS require
module.exports = MonitoringDataCollector;
