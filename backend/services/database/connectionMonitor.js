/**
 * 数据库连接池监控服务
 * 提供连接池状态监控、健康检查和性能统计
 */

const EventEmitter = require('events');

class ConnectionMonitor extends EventEmitter {
  constructor(databaseService) {
    super();
    this.databaseService = databaseService;
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      slowQueries: [],
      connectionErrors: 0,
      lastHealthCheck: null
    };
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.slowQueryThreshold = 1000; // 1秒
  }

  /**
   * 开始监控
   */
  startMonitoring(intervalMs = 30000) {
    if (this.isMonitoring) {
      console.log('⚠️ 连接池监控已在运行');
      return;
    }

    this.isMonitoring = true;
    console.log('🔍 开始数据库连接池监控');

    // 定期健康检查
    this.monitorInterval = setInterval(async () => {
      await this.performHealthCheck();
      this.logPoolStatus();
      this.checkPoolHealth();
    }, intervalMs);

    // 监听数据库服务事件
    this.setupEventListeners();
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      const healthResult = await this.databaseService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      this.metrics.lastHealthCheck = {
        ...healthResult,
        responseTime
      };

      if (healthResult.status === 'healthy') {
        this.emit('healthCheck', { status: 'success', responseTime });
      } else {
        this.emit('healthCheck', { status: 'failed', error: healthResult.error });
        this.metrics.connectionErrors++;
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.lastHealthCheck = {
        status: 'error',
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      };

      this.emit('healthCheck', { status: 'error', error: error.message });
      this.metrics.connectionErrors++;
    }
  }

  /**
   * 记录查询指标
   */
  recordQuery(queryTime, success = true, sql = '') {
    this.metrics.totalQueries++;
    
    if (success) {
      this.metrics.successfulQueries++;
    } else {
      this.metrics.failedQueries++;
    }

    // 更新平均响应时间
    this.updateAverageResponseTime(queryTime);

    // 记录慢查询
    if (queryTime > this.slowQueryThreshold) {
      this.recordSlowQuery(sql, queryTime);
    }

    // 发出查询事件
    this.emit('query', {
      queryTime,
      success,
      sql: sql.substring(0, 100), // 只记录前100个字符
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(sql, queryTime) {
    const slowQuery = {
      sql: sql.substring(0, 200),
      queryTime,
      timestamp: new Date().toISOString()
    };

    this.metrics.slowQueries.push(slowQuery);

    // 只保留最近的50个慢查询
    if (this.metrics.slowQueries.length > 50) {
      this.metrics.slowQueries = this.metrics.slowQueries.slice(-50);
    }

    this.emit('slowQuery', slowQuery);
  }

  /**
   * 更新平均响应时间
   */
  updateAverageResponseTime(queryTime) {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalQueries - 1) + queryTime;
    this.metrics.averageResponseTime = Math.round(totalTime / this.metrics.totalQueries);
  }

  /**
   * 记录连接池状态
   */
  logPoolStatus() {
    const poolStatus = this.databaseService.getPoolStatus();
    const timestamp = new Date().toISOString();

    console.log(`📊 [${timestamp}] 连接池状态:`, {
      总连接数: poolStatus.totalCount,
      空闲连接数: poolStatus.idleCount,
      等待连接数: poolStatus.waitingCount,
      查询总数: this.metrics.totalQueries,
      成功率: this.getSuccessRate() + '%',
      平均响应时间: this.metrics.averageResponseTime + 'ms'
    });
  }

  /**
   * 检查连接池健康状态
   */
  checkPoolHealth() {
    const poolStatus = this.databaseService.getPoolStatus();
    const successRate = this.getSuccessRate();

    // 检查连接池是否健康
    const warnings = [];

    if (poolStatus.waitingCount > 5) {
      warnings.push('等待连接数过多');
    }

    if (successRate < 95) {
      warnings.push('查询成功率过低');
    }

    if (this.metrics.averageResponseTime > 500) {
      warnings.push('平均响应时间过长');
    }

    if (this.metrics.connectionErrors > 10) {
      warnings.push('连接错误过多');
    }

    if (warnings.length > 0) {
      this.emit('warning', {
        warnings,
        poolStatus,
        metrics: this.getMetrics()
      });
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听警告事件
    this.on('warning', (data) => {
      console.warn('⚠️ 数据库连接池警告:', data.warnings.join(', '));
    });

    // 监听慢查询事件
    this.on('slowQuery', (slowQuery) => {
      console.warn('🐌 检测到慢查询:', {
        时间: slowQuery.queryTime + 'ms',
        SQL: slowQuery.sql,
        时间戳: slowQuery.timestamp
      });
    });

    // 监听健康检查失败
    this.on('healthCheck', (result) => {
      if (result.status === 'failed' || result.status === 'error') {
        console.error('❌ 数据库健康检查失败:', result.error);
      }
    });
  }

  /**
   * 获取成功率
   */
  getSuccessRate() {
    if (this.metrics.totalQueries === 0) return 100;
    return Math.round((this.metrics.successfulQueries / this.metrics.totalQueries) * 100);
  }

  /**
   * 获取监控指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.getSuccessRate(),
      poolStatus: this.databaseService.getPoolStatus(),
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      slowQueries: [],
      connectionErrors: 0,
      lastHealthCheck: null
    };

  }

  /**
   * 生成监控报告
   */
  generateReport() {
    const poolStatus = this.databaseService.getPoolStatus();
    const metrics = this.getMetrics();

    return {
      timestamp: new Date().toISOString(),
      poolStatus,
      metrics: {
        totalQueries: metrics.totalQueries,
        successRate: metrics.successRate,
        averageResponseTime: metrics.averageResponseTime,
        connectionErrors: metrics.connectionErrors,
        slowQueriesCount: metrics.slowQueries.length
      },
      recentSlowQueries: metrics.slowQueries.slice(-10),
      lastHealthCheck: metrics.lastHealthCheck,
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * 生成优化建议
   */
  generateRecommendations() {
    const recommendations = [];
    const poolStatus = this.databaseService.getPoolStatus();
    const successRate = this.getSuccessRate();

    if (poolStatus.waitingCount > 5) {
      recommendations.push('考虑增加连接池大小');
    }

    if (successRate < 95) {
      recommendations.push('检查数据库连接稳定性');
    }

    if (this.metrics.averageResponseTime > 500) {
      recommendations.push('优化查询性能或检查网络延迟');
    }

    if (this.metrics.slowQueries.length > 10) {
      recommendations.push('优化慢查询SQL语句');
    }

    if (this.metrics.connectionErrors > 10) {
      recommendations.push('检查数据库服务器状态');
    }

    return recommendations;
  }
}

module.exports = ConnectionMonitor;
