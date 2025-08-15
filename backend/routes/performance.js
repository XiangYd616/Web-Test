/**
 * 性能监控路由
 * 提供系统性能指标、缓存统计、查询性能等监控数据
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { queryOptimizer } = require('../utils/queryOptimizer');
const cacheMiddleware = require('./cache.js');
const Logger = require('../utils/logger');

/**
 * 获取系统性能概览
 */
router.get('/overview', asyncHandler(async (req, res) => {
  const overview = {
    timestamp: new Date().toISOString(),
    system: await getSystemMetrics(),
    database: await getDatabaseMetrics(),
    cache: getCacheMetrics(),
    api: getApiMetrics(),
    uptime: process.uptime()
  };

  res.json({
    success: true,
    data: overview
  });
}));

/**
 * 获取数据库性能统计
 */
router.get('/database', asyncHandler(async (req, res) => {
  const stats = queryOptimizer.getPerformanceStats();

  res.json({
    success: true,
    data: {
      queryStats: stats,
      summary: {
        totalQueries: stats.length,
        avgDuration: stats.length > 0 ?
          stats.reduce((sum, s) => sum + s.avgDuration, 0) / stats.length : 0,
        slowQueries: stats.filter(s => s.avgDuration > 1000).length,
        topSlowQueries: stats.slice(0, 10)
      }
    }
  });
}));

/**
 * 获取缓存性能统计
 */
router.get('/cache', asyncHandler(async (req, res) => {
  const stats = cacheMiddleware.getCacheStats();

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * 获取API性能统计
 */
router.get('/api', asyncHandler(async (req, res) => {
  const stats = getApiMetrics();

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * 获取实时性能指标
 */
router.get('/realtime', asyncHandler(async (req, res) => {
  const metrics = {
    timestamp: Date.now(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    eventLoop: getEventLoopMetrics(),
    gc: getGCMetrics()
  };

  res.json({
    success: true,
    data: metrics
  });
}));

/**
 * 性能测试端点
 */
router.post('/test', asyncHandler(async (req, res) => {
  const { testType = 'basic', iterations = 10 } = req.body;

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const iterationStart = Date.now();

    switch (testType) {
      case 'database':
        await testDatabasePerformance();
        break;
      case 'cache':
        await testCachePerformance();
        break;
      case 'memory':
        await testMemoryPerformance();
        break;
      default:
        await testBasicPerformance();
    }

    const iterationTime = Date.now() - iterationStart;
    results.push({
      iteration: i + 1,
      duration: iterationTime,
      timestamp: Date.now()
    });
  }

  const totalTime = Date.now() - startTime;
  const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  res.json({
    success: true,
    data: {
      testType,
      iterations,
      totalTime,
      avgTime,
      minTime: Math.min(...results.map(r => r.duration)),
      maxTime: Math.max(...results.map(r => r.duration)),
      results
    }
  });
}));

/**
 * 清理性能数据
 */
router.delete('/cleanup', asyncHandler(async (req, res) => {
  const { type } = req.query;

  let cleaned = [];

  if (!type || type === 'cache') {
    cacheMiddleware.clearAllCache();
    cleaned.push('cache');
  }

  if (!type || type === 'query') {
    queryOptimizer.clearStats();
    cleaned.push('query_stats');
  }

  res.json({
    success: true,
    message: `Cleaned: ${cleaned.join(', ')}`,
    cleaned
  });
}));

/**
 * 获取系统指标
 */
async function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    memory: {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external),
      arrayBuffers: formatBytes(memUsage.arrayBuffers)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: process.uptime(),
    platform: process.platform,
    nodeVersion: process.version,
    pid: process.pid
  };
}

/**
 * 获取数据库指标
 */
async function getDatabaseMetrics() {
  const stats = queryOptimizer.getPerformanceStats();

  return {
    totalQueries: stats.length,
    avgDuration: stats.length > 0 ?
      stats.reduce((sum, s) => sum + s.avgDuration, 0) / stats.length : 0,
    slowQueries: stats.filter(s => s.avgDuration > 1000).length,
    fastQueries: stats.filter(s => s.avgDuration < 100).length,
    totalDuration: stats.reduce((sum, s) => sum + s.totalDuration, 0)
  };
}

/**
 * 获取缓存指标
 */
function getCacheMetrics() {
  return cacheMiddleware.getCacheStats();
}

/**
 * 获取API指标
 */
function getApiMetrics() {
  // 这里应该从实际的API监控系统获取数据
  // 目前返回模拟数据
  return {
    totalRequests: 0,
    avgResponseTime: 0,
    errorRate: 0,
    requestsPerSecond: 0,
    activeConnections: 0
  };
}

/**
 * 获取事件循环指标
 */
function getEventLoopMetrics() {
  // 简化的事件循环监控
  return {
    lag: 0, // 需要使用专门的库来测量
    utilization: 0
  };
}

/**
 * 获取垃圾回收指标
 */
function getGCMetrics() {
  // 简化的GC监控
  return {
    collections: 0,
    duration: 0,
    freed: 0
  };
}

/**
 * 测试数据库性能
 */
async function testDatabasePerformance() {
  const testQuery = 'SELECT 1 as test';
  await queryOptimizer.executeOptimizedQuery(testQuery, [], {
    operationName: 'performance_test'
  });
}

/**
 * 测试缓存性能
 */
async function testCachePerformance() {
  const key = `perf_test_${Date.now()}`;
  const value = { test: 'data', timestamp: Date.now() };

  cacheMiddleware.setCache(key, value);
  cacheMiddleware.getCache(key);
  cacheMiddleware.deleteCache(key);
}

/**
 * 测试内存性能
 */
async function testMemoryPerformance() {
  // 创建和销毁一些对象来测试内存性能
  const testData = new Array(1000).fill(0).map((_, i) => ({
    id: i,
    data: `test_data_${i}`,
    timestamp: Date.now()
  }));

  // 模拟一些计算
  const sum = testData.reduce((acc, item) => acc + item.id, 0);
  return sum;
}

/**
 * 测试基础性能
 */
async function testBasicPerformance() {
  // 简单的CPU密集型任务
  let result = 0;
  for (let i = 0; i < 100000; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

/**
 * 格式化字节数
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 健康检查端点
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Performance monitoring service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
