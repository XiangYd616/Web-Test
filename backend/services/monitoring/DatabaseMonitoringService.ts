/**
 * 数据库监控服务
 * 提供实时数据库性能监控、连接池监控和告警功能
 */

import { EventEmitter } from 'events';
import winston from 'winston';

const { getConnectionManager } = require('../../config/database');

type DbRow = Record<string, unknown>;

type DbQueryResult<T extends DbRow = DbRow> = {
  rows: T[];
};

type ConnectionManager = {
  query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
  getStatus: () => { isConnected?: boolean; pool?: { totalCount?: number; idleCount?: number } };
};

type AlertItem = {
  id: string;
  type: string;
  severity: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  resolvedAt?: number;
};

class DatabaseMonitoringService extends EventEmitter {
  private connectionManager: ConnectionManager | null = null;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
      new winston.transports.File({ filename: 'backend/runtime/logs/db-monitoring.log' }),
      new winston.transports.Console({ level: 'warn' }),
    ],
  });
  private config = {
    monitoringInterval: 30000,
    alertThresholds: {
      connectionPoolUsage: 80,
      slowQueryTime: 1000,
      deadlockCount: 5,
      lockWaitTime: 5000,
      diskUsage: 85,
      cacheHitRatio: 90,
    },
    retentionPeriod: 24 * 60 * 60 * 1000,
    maxHistoryRecords: 2880,
  };
  private metrics: Record<string, Array<Record<string, unknown> & { timestamp: number }>> = {
    connectionPool: [],
    queryPerformance: [],
    lockStatistics: [],
    cacheStatistics: [],
    diskUsage: [],
    systemLoad: [],
  };
  private alerts: { active: AlertItem[]; history: AlertItem[] } = {
    active: [],
    history: [],
  };

  /**
   * 初始化监控服务
   */
  async initialize() {
    try {
      this.logger.info('初始化数据库监控服务...');

      this.connectionManager = (await getConnectionManager()) as ConnectionManager;

      this.startMonitoring();

      this.logger.info('数据库监控服务初始化完成');
      return true;
    } catch (error) {
      this.logger.error('数据库监控服务初始化失败:', error);
      return false;
    }
  }

  /**
   * 启动监控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      this.logger.warn('数据库监控已在运行');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('启动数据库监控');

    this.monitoringInterval = setInterval(() => {
      void this.collectMetrics().catch(error => {
        this.logger.error('收集监控指标失败:', error);
      });
    }, this.config.monitoringInterval);

    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, this.config.monitoringInterval * 10);

    void this.collectMetrics().catch(error => {
      this.logger.error('初始监控指标收集失败:', error);
    });
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.logger.info('停止数据库监控');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 收集监控指标
   */
  async collectMetrics() {
    if (!this.connectionManager) return;
    const timestamp = Date.now();

    try {
      const [
        connectionPoolMetrics,
        queryPerformanceMetrics,
        lockStatistics,
        cacheStatistics,
        diskUsage,
        systemLoad,
      ] = await Promise.allSettled([
        this.collectConnectionPoolMetrics(),
        this.collectQueryPerformanceMetrics(),
        this.collectLockStatistics(),
        this.collectCacheStatistics(),
        this.collectDiskUsage(),
        this.collectSystemLoad(),
      ]);

      if (connectionPoolMetrics.status === 'fulfilled') {
        this.addMetric('connectionPool', connectionPoolMetrics.value, timestamp);
        this.checkConnectionPoolAlerts(connectionPoolMetrics.value as Record<string, unknown>);
      }

      if (queryPerformanceMetrics.status === 'fulfilled') {
        this.addMetric('queryPerformance', queryPerformanceMetrics.value, timestamp);
        this.checkQueryPerformanceAlerts(queryPerformanceMetrics.value as Record<string, unknown>);
      }

      if (lockStatistics.status === 'fulfilled') {
        this.addMetric('lockStatistics', lockStatistics.value, timestamp);
        this.checkLockAlerts(lockStatistics.value as Record<string, unknown>);
      }

      if (cacheStatistics.status === 'fulfilled') {
        this.addMetric('cacheStatistics', cacheStatistics.value, timestamp);
        this.checkCacheAlerts(cacheStatistics.value as Record<string, unknown>);
      }

      if (diskUsage.status === 'fulfilled') {
        this.addMetric('diskUsage', diskUsage.value, timestamp);
        this.checkDiskUsageAlerts(diskUsage.value as Record<string, unknown>);
      }

      if (systemLoad.status === 'fulfilled') {
        this.addMetric('systemLoad', systemLoad.value, timestamp);
      }

      this.emit('metricsCollected', {
        timestamp,
        connectionPool:
          connectionPoolMetrics.status === 'fulfilled' ? connectionPoolMetrics.value : null,
        queryPerformance:
          queryPerformanceMetrics.status === 'fulfilled' ? queryPerformanceMetrics.value : null,
        lockStatistics: lockStatistics.status === 'fulfilled' ? lockStatistics.value : null,
        cacheStatistics: cacheStatistics.status === 'fulfilled' ? cacheStatistics.value : null,
        diskUsage: diskUsage.status === 'fulfilled' ? diskUsage.value : null,
        systemLoad: systemLoad.status === 'fulfilled' ? systemLoad.value : null,
      });
    } catch (error) {
      this.logger.error('收集监控指标时发生错误:', error);
    }
  }

  /**
   * 收集连接池指标
   */
  async collectConnectionPoolMetrics() {
    if (!this.connectionManager) return {};

    try {
      const status = this.connectionManager.getStatus();
      const poolStats = status.pool || {};
      const totalCount = poolStats.totalCount ?? 0;
      const idleCount = poolStats.idleCount ?? 0;

      const connectionStatsQuery = `
        SELECT
          COUNT(*) as total_connections,
          COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
          COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
          COUNT(CASE WHEN state = 'idle in transaction' THEN 1 END) as idle_in_transaction,
          COUNT(CASE WHEN waiting THEN 1 END) as waiting_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      const result = await this.connectionManager.query(connectionStatsQuery);
      const dbStats = result.rows[0] as Record<string, string>;

      return {
        poolSize: totalCount,
        activeConnections: Number.parseInt(dbStats.active_connections, 10) || 0,
        idleConnections: Number.parseInt(dbStats.idle_connections, 10) || 0,
        idleInTransaction: Number.parseInt(dbStats.idle_in_transaction, 10) || 0,
        waitingConnections: Number.parseInt(dbStats.waiting_connections, 10) || 0,
        totalDbConnections: Number.parseInt(dbStats.total_connections, 10) || 0,
        poolUsagePercent: totalCount > 0 ? ((totalCount - idleCount) / totalCount) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('收集连接池指标失败:', error);
      return {};
    }
  }

  /**
   * 收集查询性能指标
   */
  async collectQueryPerformanceMetrics() {
    if (!this.connectionManager) return {};

    try {
      const queryStatsQuery = `
        SELECT
          COUNT(*) as total_queries,
          AVG(total_time) as avg_query_time,
          MAX(total_time) as max_query_time,
          COUNT(CASE WHEN total_time > ${this.config.alertThresholds.slowQueryTime} THEN 1 END) as slow_queries,
          SUM(calls) as total_calls,
          SUM(rows) as total_rows
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
      `;

      try {
        const result = await this.connectionManager.query(queryStatsQuery);
        const stats = result.rows[0] as Record<string, string>;

        const totalQueries = Number.parseInt(stats.total_queries, 10) || 0;
        const slowQueries = Number.parseInt(stats.slow_queries, 10) || 0;

        return {
          totalQueries,
          avgQueryTime: Number.parseFloat(stats.avg_query_time) || 0,
          maxQueryTime: Number.parseFloat(stats.max_query_time) || 0,
          slowQueries,
          totalCalls: Number.parseInt(stats.total_calls, 10) || 0,
          totalRows: Number.parseInt(stats.total_rows, 10) || 0,
          slowQueryRatio: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
        };
      } catch {
        this.logger.debug('pg_stat_statements 未启用，使用基础查询统计');
        return {
          totalQueries: 0,
          avgQueryTime: 0,
          maxQueryTime: 0,
          slowQueries: 0,
          totalCalls: 0,
          totalRows: 0,
          slowQueryRatio: 0,
        };
      }
    } catch (error) {
      this.logger.error('收集查询性能指标失败:', error);
      return {};
    }
  }

  /**
   * 收集锁统计信息
   */
  async collectLockStatistics() {
    if (!this.connectionManager) return {};

    try {
      const lockStatsQuery = `
        SELECT
          COUNT(*) as total_locks,
          COUNT(CASE WHEN NOT granted THEN 1 END) as waiting_locks,
          COUNT(CASE WHEN mode = 'ExclusiveLock' THEN 1 END) as exclusive_locks,
          COUNT(CASE WHEN mode = 'ShareLock' THEN 1 END) as share_locks
        FROM pg_locks
        WHERE pid != pg_backend_pid()
      `;

      const deadlockQuery = `
        SELECT COUNT(*) as deadlocks
        FROM pg_stat_database
        WHERE datname = current_database()
      `;

      const [lockResult, deadlockResult] = await Promise.all([
        this.connectionManager.query(lockStatsQuery),
        this.connectionManager.query(deadlockQuery),
      ]);

      const lockStats = lockResult.rows[0] as Record<string, string>;
      const deadlockStats = deadlockResult.rows[0] as Record<string, string>;

      return {
        totalLocks: Number.parseInt(lockStats.total_locks, 10) || 0,
        waitingLocks: Number.parseInt(lockStats.waiting_locks, 10) || 0,
        exclusiveLocks: Number.parseInt(lockStats.exclusive_locks, 10) || 0,
        shareLocks: Number.parseInt(lockStats.share_locks, 10) || 0,
        deadlocks: Number.parseInt(deadlockStats.deadlocks, 10) || 0,
      };
    } catch (error) {
      this.logger.error('收集锁统计信息失败:', error);
      return {};
    }
  }

  /**
   * 收集缓存统计信息
   */
  async collectCacheStatistics() {
    if (!this.connectionManager) return {};

    try {
      const cacheStatsQuery = `
        SELECT
          SUM(heap_blks_read) as heap_read,
          SUM(heap_blks_hit) as heap_hit,
          SUM(idx_blks_read) as idx_read,
          SUM(idx_blks_hit) as idx_hit
        FROM pg_statio_user_tables
      `;

      const result = await this.connectionManager.query(cacheStatsQuery);
      const stats = result.rows[0] as Record<string, string>;

      const heapRead = Number.parseInt(stats.heap_read, 10) || 0;
      const heapHit = Number.parseInt(stats.heap_hit, 10) || 0;
      const idxRead = Number.parseInt(stats.idx_read, 10) || 0;
      const idxHit = Number.parseInt(stats.idx_hit, 10) || 0;

      const totalRead = heapRead + idxRead;
      const totalHit = heapHit + idxHit;
      const hitRatio = totalRead + totalHit > 0 ? (totalHit / (totalRead + totalHit)) * 100 : 0;

      return {
        heapBlocksRead: heapRead,
        heapBlocksHit: heapHit,
        indexBlocksRead: idxRead,
        indexBlocksHit: idxHit,
        totalBlocksRead: totalRead,
        totalBlocksHit: totalHit,
        cacheHitRatio: hitRatio,
      };
    } catch (error) {
      this.logger.error('收集缓存统计信息失败:', error);
      return {};
    }
  }

  /**
   * 收集磁盘使用信息
   */
  async collectDiskUsage() {
    if (!this.connectionManager) return {};

    try {
      const diskUsageQuery = `
        SELECT
          pg_database_size(current_database()) as database_size,
          pg_size_pretty(pg_database_size(current_database())) as database_size_pretty
      `;

      const tableSpaceQuery = `
        SELECT
          spcname,
          pg_size_pretty(pg_tablespace_size(spcname)) as size
        FROM pg_tablespace
      `;

      const [dbResult, tsResult] = await Promise.all([
        this.connectionManager.query(diskUsageQuery),
        this.connectionManager.query(tableSpaceQuery),
      ]);

      const dbRow = dbResult.rows[0] as Record<string, string>;

      return {
        databaseSize: Number.parseInt(dbRow.database_size, 10) || 0,
        databaseSizePretty: dbRow.database_size_pretty,
        tablespaces: tsResult.rows,
      };
    } catch (error) {
      this.logger.error('收集磁盘使用信息失败:', error);
      return {};
    }
  }

  /**
   * 收集系统负载信息
   */
  async collectSystemLoad() {
    if (!this.connectionManager) return {};

    try {
      const systemStatsQuery = `
        SELECT
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT setting FROM pg_settings WHERE name = 'shared_buffers') as shared_buffers,
          (SELECT setting FROM pg_settings WHERE name = 'work_mem') as work_mem,
          (SELECT setting FROM pg_settings WHERE name = 'maintenance_work_mem') as maintenance_work_mem
      `;

      const result = await this.connectionManager.query(systemStatsQuery);
      const settings = result.rows[0] as Record<string, string>;

      return {
        maxConnections: Number.parseInt(settings.max_connections, 10) || 0,
        sharedBuffers: settings.shared_buffers,
        workMem: settings.work_mem,
        maintenanceWorkMem: settings.maintenance_work_mem,
      };
    } catch (error) {
      this.logger.error('收集系统负载信息失败:', error);
      return {};
    }
  }

  /**
   * 添加指标数据
   */
  addMetric(type: string, data: Record<string, unknown>, timestamp: number) {
    if (!this.metrics[type]) {
      this.metrics[type] = [];
    }

    this.metrics[type].push({
      ...data,
      timestamp,
    });

    if (this.metrics[type].length > this.config.maxHistoryRecords) {
      this.metrics[type] = this.metrics[type].slice(-this.config.maxHistoryRecords);
    }
  }

  /**
   * 检查连接池告警
   */
  checkConnectionPoolAlerts(metrics: Record<string, unknown>) {
    const poolUsagePercent = Number(metrics.poolUsagePercent || 0);
    const waitingConnections = Number(metrics.waitingConnections || 0);

    if (poolUsagePercent > this.config.alertThresholds.connectionPoolUsage) {
      this.createAlert(
        'CONNECTION_POOL_HIGH_USAGE',
        'HIGH',
        `连接池使用率过高: ${poolUsagePercent.toFixed(2)}%`
      );
    }

    if (waitingConnections > 0) {
      this.createAlert(
        'CONNECTION_POOL_WAITING',
        'MEDIUM',
        `有 ${waitingConnections} 个连接在等待`
      );
    }
  }

  /**
   * 检查查询性能告警
   */
  checkQueryPerformanceAlerts(metrics: Record<string, unknown>) {
    const slowQueryRatio = Number(metrics.slowQueryRatio || 0);
    const avgQueryTime = Number(metrics.avgQueryTime || 0);

    if (slowQueryRatio > 10) {
      this.createAlert(
        'HIGH_SLOW_QUERY_RATIO',
        'HIGH',
        `慢查询比例过高: ${slowQueryRatio.toFixed(2)}%`
      );
    }

    if (avgQueryTime > this.config.alertThresholds.slowQueryTime) {
      this.createAlert(
        'HIGH_AVG_QUERY_TIME',
        'MEDIUM',
        `平均查询时间过长: ${avgQueryTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * 检查锁告警
   */
  checkLockAlerts(metrics: Record<string, unknown>) {
    const waitingLocks = Number(metrics.waitingLocks || 0);
    const deadlocks = Number(metrics.deadlocks || 0);

    if (waitingLocks > 5) {
      this.createAlert('HIGH_LOCK_WAITING', 'MEDIUM', `有 ${waitingLocks} 个锁在等待`);
    }

    if (deadlocks > this.config.alertThresholds.deadlockCount) {
      this.createAlert('HIGH_DEADLOCK_COUNT', 'HIGH', `死锁数量过多: ${deadlocks}`);
    }
  }

  /**
   * 检查缓存告警
   */
  checkCacheAlerts(metrics: Record<string, unknown>) {
    const cacheHitRatio = Number(metrics.cacheHitRatio || 0);

    if (cacheHitRatio < this.config.alertThresholds.cacheHitRatio) {
      this.createAlert(
        'LOW_CACHE_HIT_RATIO',
        'MEDIUM',
        `缓存命中率过低: ${cacheHitRatio.toFixed(2)}%`
      );
    }
  }

  /**
   * 检查磁盘使用告警
   */
  checkDiskUsageAlerts(_metrics: Record<string, unknown>) {}

  /**
   * 创建告警
   */
  createAlert(type: string, severity: string, message: string) {
    const existingAlert = this.alerts.active.find(alert => alert.type === type);

    if (existingAlert) {
      existingAlert.count += 1;
      existingAlert.lastSeen = Date.now();
      existingAlert.message = message;
    } else {
      const alert: AlertItem = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type,
        severity,
        message,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      };

      this.alerts.active.push(alert);

      this.emit('alert', alert);

      this.logger.warn(`数据库告警: ${message}`, {
        type,
        severity,
        alertId: alert.id,
      });
    }
  }

  /**
   * 清理过期数据
   */
  cleanupOldData() {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    Object.keys(this.metrics).forEach(type => {
      const originalLength = this.metrics[type].length;
      this.metrics[type] = this.metrics[type].filter(metric => metric.timestamp > cutoffTime);

      const cleaned = originalLength - this.metrics[type].length;
      if (cleaned > 0) {
        this.logger.debug(`清理过期监控数据: ${type}, 清理 ${cleaned} 条记录`);
      }
    });

    this.cleanupResolvedAlerts();
  }

  /**
   * 清理已解决的告警
   */
  cleanupResolvedAlerts() {
    const now = Date.now();
    const resolveTimeout = 5 * 60 * 1000;

    const resolvedAlerts = this.alerts.active.filter(
      alert => now - alert.lastSeen > resolveTimeout
    );

    if (resolvedAlerts.length > 0) {
      resolvedAlerts.forEach(alert => {
        alert.resolvedAt = now;
        this.alerts.history.push(alert);
        this.logger.info(`告警已解决: ${alert.message}`, { alertId: alert.id });
      });

      this.alerts.active = this.alerts.active.filter(
        alert => now - alert.lastSeen <= resolveTimeout
      );

      if (this.alerts.history.length > 1000) {
        this.alerts.history = this.alerts.history.slice(-500);
      }
    }
  }

  /**
   * 获取监控报告
   */
  getMonitoringReport(period = '1h') {
    const periodMs = this.parsePeriod(period);
    const cutoffTime = Date.now() - periodMs;

    const report: Record<string, unknown> = {
      timestamp: Date.now(),
      period,
      isMonitoring: this.isMonitoring,
      alerts: {
        active: this.alerts.active.length,
        total: this.alerts.history.length + this.alerts.active.length,
      },
      metrics: {},
    };

    Object.keys(this.metrics).forEach(type => {
      const filteredData = this.metrics[type].filter(metric => metric.timestamp >= cutoffTime);

      if (filteredData.length > 0) {
        (report.metrics as Record<string, unknown>)[type] = {
          count: filteredData.length,
          latest: filteredData[filteredData.length - 1],
          summary: this.calculateSummary(filteredData, type),
        };
      }
    });

    return report;
  }

  /**
   * 计算指标摘要
   */
  calculateSummary(data: Array<Record<string, unknown>>, type: string) {
    if (data.length === 0) return null;

    const summary: Record<string, unknown> = {};

    switch (type) {
      case 'connectionPool':
        summary.avgPoolUsage = this.calculateAverage(data, 'poolUsagePercent');
        summary.maxActiveConnections = this.calculateMax(data, 'activeConnections');
        summary.avgWaitingConnections = this.calculateAverage(data, 'waitingConnections');
        break;
      case 'queryPerformance':
        summary.avgQueryTime = this.calculateAverage(data, 'avgQueryTime');
        summary.maxQueryTime = this.calculateMax(data, 'maxQueryTime');
        summary.avgSlowQueryRatio = this.calculateAverage(data, 'slowQueryRatio');
        break;
      case 'lockStatistics':
        summary.avgTotalLocks = this.calculateAverage(data, 'totalLocks');
        summary.maxWaitingLocks = this.calculateMax(data, 'waitingLocks');
        summary.totalDeadlocks = this.calculateSum(data, 'deadlocks');
        break;
      case 'cacheStatistics':
        summary.avgCacheHitRatio = this.calculateAverage(data, 'cacheHitRatio');
        summary.totalBlocksRead = this.calculateSum(data, 'totalBlocksRead');
        summary.totalBlocksHit = this.calculateSum(data, 'totalBlocksHit');
        break;
      default:
        break;
    }

    return summary;
  }

  /**
   * 计算平均值
   */
  calculateAverage(data: Array<Record<string, unknown>>, field: string) {
    const values = data.map(item => Number(item[field] || 0)).filter(value => !Number.isNaN(value));
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  /**
   * 计算最大值
   */
  calculateMax(data: Array<Record<string, unknown>>, field: string) {
    const values = data.map(item => Number(item[field] || 0)).filter(value => !Number.isNaN(value));
    return values.length > 0 ? Math.max(...values) : 0;
  }

  /**
   * 计算总和
   */
  calculateSum(data: Array<Record<string, unknown>>, field: string) {
    const values = data.map(item => Number(item[field] || 0)).filter(value => !Number.isNaN(value));
    return values.reduce((a, b) => a + b, 0);
  }

  /**
   * 解析时间周期
   */
  parsePeriod(period: string) {
    const match = period.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 1000;

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit = 50) {
    const allAlerts = [...this.alerts.active, ...this.alerts.history]
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, limit);

    return {
      alerts: allAlerts,
      summary: {
        active: this.alerts.active.length,
        resolved: this.alerts.history.length,
        total: allAlerts.length,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.connectionManager) {
        return {
          status: 'unhealthy',
          error: 'connection manager not initialized',
          timestamp: Date.now(),
        };
      }

      const connectionStatus = this.connectionManager.getStatus();
      const latestMetrics = this.getLatestMetrics();

      return {
        status: connectionStatus.isConnected && this.isMonitoring ? 'healthy' : 'unhealthy',
        monitoring: {
          isActive: this.isMonitoring,
          metricsCount: Object.keys(this.metrics).reduce(
            (sum, type) => sum + this.metrics[type].length,
            0
          ),
          activeAlerts: this.alerts.active.length,
        },
        database: connectionStatus,
        latestMetrics,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取最新指标
   */
  getLatestMetrics() {
    const latest: Record<string, unknown> = {};

    Object.keys(this.metrics).forEach(type => {
      if (this.metrics[type].length > 0) {
        latest[type] = this.metrics[type][this.metrics[type].length - 1];
      }
    });

    return latest;
  }
}

export { DatabaseMonitoringService };

// 兼容 CommonJS require
module.exports = DatabaseMonitoringService;
