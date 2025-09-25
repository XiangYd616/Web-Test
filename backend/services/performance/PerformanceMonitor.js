/**
 * 性能监控服务
 * 监控API响应时间、系统资源使用、缓存命中率等
 */

const os = require('os');
const { performance } = require('perf_hooks');
const { logger } = require('../../utils/errorHandler');

/**
 * 性能指标收集器
 */
class PerformanceCollector {
  constructor() {
    this.metrics = {
      requests: new Map(),
      system: {
        cpu: [],
        memory: [],
        timestamps: []
      },
      api: {
        responseTime: [],
        throughput: 0,
        errorRate: 0
      }
    };
    
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    
    // 定期收集系统指标
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // 每30秒收集一次
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const memoryUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
    const timestamp = Date.now();
    
    // 保留最近100个数据点
    if (this.metrics.system.cpu.length >= 100) {
      this.metrics.system.cpu.shift();
      this.metrics.system.memory.shift();
      this.metrics.system.timestamps.shift();
    }
    
    this.metrics.system.cpu.push(cpuUsage);
    this.metrics.system.memory.push(memoryUsage);
    this.metrics.system.timestamps.push(timestamp);
  }

  /**
   * 记录API请求开始
   */
  startRequest(requestId, method, path) {
    this.metrics.requests.set(requestId, {
      method,
      path,
      startTime: performance.now(),
      timestamp: Date.now()
    });
    
    this.requestCount++;
  }

  /**
   * 记录API请求结束
   */
  endRequest(requestId, statusCode, error = null) {
    const request = this.metrics.requests.get(requestId);
    if (!request) return;
    
    const endTime = performance.now();
    const responseTime = endTime - request.startTime;
    
    // 记录响应时间
    this.metrics.api.responseTime.push({
      path: request.path,
      method: request.method,
      responseTime,
      statusCode,
      timestamp: Date.now(),
      error: error ? error.message : null
    });
    
    // 保留最近1000个请求
    if (this.metrics.api.responseTime.length > 1000) {
      this.metrics.api.responseTime.shift();
    }
    
    // 统计错误率
    if (statusCode >= 400 || error) {
      this.errorCount++;
    }
    
    // 清理请求记录
    this.metrics.requests.delete(requestId);
    
    // 记录慢请求
    if (responseTime > 1000) { // 超过1秒的请求
      logger.logWarn('Slow API request detected', {
        path: request.path,
        method: request.method,
        responseTime: Math.round(responseTime),
        statusCode
      });
    }
  }

  /**
   * 获取性能统计
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // 计算吞吐量 (请求/秒)
    const throughput = this.requestCount / (uptime / 1000);
    
    // 计算错误率
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    // 计算平均响应时间
    const recentRequests = this.metrics.api.responseTime.slice(-100); // 最近100个请求
    const avgResponseTime = recentRequests.length > 0 
      ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length
      : 0;
    
    // 计算P95响应时间
    const sortedResponseTimes = recentRequests
      .map(req => req.responseTime)
      .sort((a, b) => a - b);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p95ResponseTime = sortedResponseTimes[p95Index] || 0;
    
    // 获取当前系统指标
    const currentCpu = this.metrics.system.cpu[this.metrics.system.cpu.length - 1] || 0;
    const currentMemory = this.metrics.system.memory[this.metrics.system.memory.length - 1] || 0;
    
    return {
      uptime: Math.round(uptime / 1000), // 秒
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        throughput: Math.round(throughput * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        activeRequests: this.metrics.requests.size
      },
      system: {
        cpu: Math.round(currentCpu * 100) / 100,
        memory: Math.round(currentMemory * 100) / 100,
        loadAverage: os.loadavg(),
        freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
        totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version
      },
      process: {
        pid: process.pid,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };
  }

  /**
   * 获取详细的API统计
   */
  getApiStats() {
    const pathStats = new Map();
    
    // 按路径统计
    this.metrics.api.responseTime.forEach(req => {
      const key = `${req.method} ${req.path}`;
      if (!pathStats.has(key)) {
        pathStats.set(key, {
          method: req.method,
          path: req.path,
          count: 0,
          totalTime: 0,
          errors: 0,
          minTime: Infinity,
          maxTime: 0
        });
      }
      
      const stats = pathStats.get(key);
      stats.count++;
      stats.totalTime += req.responseTime;
      stats.minTime = Math.min(stats.minTime, req.responseTime);
      
      /**
      
       * if功能函数
      
       * @param {Object} params - 参数对象
      
       * @returns {Promise<Object>} 返回结果
      
       */
      stats.maxTime = Math.max(stats.maxTime, req.responseTime);
      
      if (req.statusCode >= 400 || req.error) {
        stats.errors++;
      }
    });
    
    // 转换为数组并计算平均值
    const apiStats = Array.from(pathStats.values()).map(stats => ({
      ...stats,
      avgTime: Math.round(stats.totalTime / stats.count),
      errorRate: Math.round((stats.errors / stats.count) * 100 * 100) / 100,
      minTime: Math.round(stats.minTime),
      maxTime: Math.round(stats.maxTime)
    }));
    
    // 按请求数排序
    apiStats.sort((a, b) => b.count - a.count);
    
    return apiStats;
  }

  /**
   * 获取系统历史数据
   */
  getSystemHistory() {
    return {
      cpu: this.metrics.system.cpu,
      memory: this.metrics.system.memory,
      timestamps: this.metrics.system.timestamps
    };
  }

  /**
   * 重置统计数据
   */
  reset() {
    this.metrics.requests.clear();
    this.metrics.api.responseTime = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    
    logger.logInfo('Performance metrics reset');
  }

  /**
   * 销毁监控器
   */
  destroy() {
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    this.metrics.requests.clear();
  }
}

/**
 * 性能监控中间件
 */
function createPerformanceMiddleware(collector) {
  return (req, res, next) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 记录请求开始
    collector.startRequest(requestId, req.method, req.route?.path || req.path);
    
    // 拦截响应结束
    const originalEnd = res.end;
    res.end = function(...args) {
      collector.endRequest(requestId, res.statusCode);
      return originalEnd.apply(this, args);
    };
    
    // 处理错误
    res.on('error', (error) => {
      collector.endRequest(requestId, res.statusCode, error);
    });
    
    next();
  };
}

// 创建全局性能收集器
const performanceCollector = new PerformanceCollector();

module.exports = {
  PerformanceCollector,
  createPerformanceMiddleware,
  performanceCollector
};
