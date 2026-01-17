/**
 * 测试调度API路由
 * 提供测试调度、批量执行、性能监控等功能
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');
const testEngineService = require('../services/core/TestEngineService');

// 应用认证中间件
router.use(authMiddleware);

/**
 * 调度单个测试
 * POST /api/scheduler/schedule
 */
router.post('/schedule', asyncHandler(async (req, res) => {
  const { testType, url, options = {}, scheduleOptions = {} } = req.body;

  // 验证必填参数
  if (!testType || !url) {
    return res.validationError(['testType', 'url'], '测试类型和URL不能为空');
  }

  // 验证调度时间
  if (scheduleOptions.executeAt && new Date(scheduleOptions.executeAt) < new Date()) {
    return res.validationError(['scheduleOptions.executeAt'], '执行时间不能早于当前时间');
  }

  try {
    const result = await testEngineService.scheduleTest(
      testType,
      url,
      { ...options, userId: req.user.id },
      {
        executeAt: scheduleOptions.executeAt || new Date(),
        recurring: scheduleOptions.recurring || false,
        interval: scheduleOptions.interval,
        maxRetries: scheduleOptions.maxRetries || 3,
        priority: scheduleOptions.priority || 'normal'
      }
    );

    res.success(result, '测试调度成功');
  } catch (error) {
    console.error('调度测试失败:', error);
    res.serverError(error.message);
  }
}));

/**
 * 获取调度测试列表
 * GET /api/scheduler/scheduled
 */
router.get('/scheduled', asyncHandler(async (req, res) => {
  const { status, priority, page = 1, limit = 20 } = req.query;

  try {
    let scheduledTests = testEngineService.getScheduledTests();

    // 过滤
    if (status) {
      scheduledTests = scheduledTests.filter(test => test.status === status);
    }
    if (priority) {
      scheduledTests = scheduledTests.filter(test => test.priority === priority);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTests = scheduledTests.slice(startIndex, endIndex);

    res.success({
      tests: paginatedTests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: scheduledTests.length,
        totalPages: Math.ceil(scheduledTests.length / limit)
      }
    });
  } catch (error) {
    console.error('获取调度测试失败:', error);
    res.serverError('获取调度测试失败');
  }
}));

/**
 * 取消调度测试
 * DELETE /api/scheduler/scheduled/:testId
 */
router.delete('/scheduled/:testId', asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    const result = testEngineService.cancelScheduledTest(testId);
    
    if (result.success) {
      res.success(result, result.message);
    } else {
      res.notFound('resource', result.message);
    }
  } catch (error) {
    console.error('取消调度测试失败:', error);
    res.serverError('取消调度测试失败');
  }
}));

/**
 * 批量执行测试
 * POST /api/scheduler/batch
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { tests, options = {} } = req.body;

  if (!tests || !Array.isArray(tests) || tests.length === 0) {
    return res.validationError(['tests'], '测试配置列表不能为空');
  }

  // 验证每个测试配置
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    if (!test.testType || !test.url) {
      return res.validationError([`tests[${i}].testType`, `tests[${i}].url`], 
        `第${i + 1}个测试的类型和URL不能为空`);
    }
  }

  try {
    const batchOptions = {
      parallel: options.parallel !== false,
      maxConcurrency: Math.min(options.maxConcurrency || 5, 10), // 限制最大并发数
      stopOnError: options.stopOnError || false
    };

    // 为每个测试添加用户信息
    const testConfigs = tests.map(test => ({
      ...test,
      options: { ...test.options, userId: req.user.id }
    }));

    const result = await testEngineService.runBatchTests(testConfigs, batchOptions);

    res.success({
      ...result,
      batchId: `batch-${Date.now()}`,
      executedAt: new Date().toISOString(),
      user: req.user.id
    }, '批量测试执行完成');
  } catch (error) {
    console.error('批量测试执行失败:', error);
    res.serverError(error.message);
  }
}));

/**
 * 获取性能指标
 * GET /api/scheduler/metrics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  try {
    const metrics = testEngineService.getPerformanceMetrics();
    
    res.success({
      ...metrics,
      timestamp: new Date().toISOString(),
      user: req.user.id
    });
  } catch (error) {
    console.error('获取性能指标失败:', error);
    res.serverError('获取性能指标失败');
  }
}));

/**
 * 获取引擎健康状态
 * GET /api/scheduler/health
 */
router.get('/health', asyncHandler(async (req, res) => {
  try {
    const healthStatus = await testEngineService.getEngineHealthStatus();
    
    res.success({
      engines: healthStatus,
      timestamp: new Date().toISOString(),
      overallHealth: Object.values(healthStatus).every(engine => engine.healthy) ? 'healthy' : 'degraded'
    });
  } catch (error) {
    console.error('获取引擎健康状态失败:', error);
    res.serverError('获取引擎健康状态失败');
  }
}));

/**
 * 清理缓存
 * DELETE /api/scheduler/cache
 */
router.delete('/cache', asyncHandler(async (req, res) => {
  const { pattern } = req.query;

  try {
    const result = testEngineService.clearCache(pattern);
    
    res.success(result, `清理了${result.cleared}条缓存记录`);
  } catch (error) {
    console.error('清理缓存失败:', error);
    res.serverError('清理缓存失败');
  }
}));

/**
 * 获取测试历史统计
 * GET /api/scheduler/statistics
 */
router.get('/statistics', asyncHandler(async (req, res) => {
  const { timeRange = '24h', testType } = req.query;

  try {
    // 计算时间范围
    const now = new Date();
    let _startTime;
    
    switch (timeRange) {
      case '1h':
        _startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        _startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        _startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        _startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        _startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // 这里应该从数据库获取真实数据
    // 目前返回模拟数据
    const statistics = {
      totalTests: Math.floor(Math.random() * 1000) + 100,
      successfulTests: Math.floor(Math.random() * 800) + 80,
      failedTests: Math.floor(Math.random() * 50) + 5,
      averageResponseTime: Math.floor(Math.random() * 1000) + 200,
      totalTestTime: Math.floor(Math.random() * 10000) + 1000,
      engineUsage: {
        performance: Math.floor(Math.random() * 100) + 10,
        seo: Math.floor(Math.random() * 80) + 8,
        security: Math.floor(Math.random() * 60) + 6,
        api: Math.floor(Math.random() * 120) + 12,
        stress: Math.floor(Math.random() * 40) + 4,
        compatibility: Math.floor(Math.random() * 30) + 3,
        ux: Math.floor(Math.random() * 50) + 5
      },
      trends: {
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          count: Math.floor(Math.random() * 50) + 1,
          successRate: 85 + Math.random() * 10
        })),
        daily: Array.from({ length: 7 }, (_, i) => ({
          day: new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 200) + 20,
          successRate: 80 + Math.random() * 15
        }))
      },
      topUrls: [
        { url: 'https://example.com', count: Math.floor(Math.random() * 100) + 20 },
        { url: 'https://test.com', count: Math.floor(Math.random() * 80) + 15 },
        { url: 'https://demo.com', count: Math.floor(Math.random() * 60) + 10 },
        { url: 'https://api.example.com', count: Math.floor(Math.random() * 40) + 8 },
        { url: 'https://staging.test.com', count: Math.floor(Math.random() * 30) + 5 }
      ]
    };

    // 如果指定了测试类型，过滤数据
    if (testType && statistics.engineUsage[testType] !== undefined) {
      statistics.filteredByType = testType;
      statistics.typeSpecificData = {
        count: statistics.engineUsage[testType],
        percentage: (statistics.engineUsage[testType] / statistics.totalTests * 100).toFixed(2)
      };
    }

    res.success({
      statistics,
      timeRange,
      testType,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.serverError('获取统计数据失败');
  }
}));

/**
 * 手动触发调度任务处理
 * POST /api/scheduler/process
 */
router.post('/process', asyncHandler(async (req, res) => {
  try {
    const result = testEngineService.processScheduledTasks();
    
    res.success(result, '调度任务处理完成');
  } catch (error) {
    console.error('处理调度任务失败:', error);
    res.serverError('处理调度任务失败');
  }
}));

module.exports = router;
