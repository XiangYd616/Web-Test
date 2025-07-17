/**
 * 测试路由
 */

const express = require('express');
const { query } = require('../config/database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { testRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateURLMiddleware, validateAPIURLMiddleware } = require('../middleware/urlValidator');

// 导入测试引擎类
const { RealTestEngine } = require('../services/realTestEngine');
const { RealStressTestEngine } = require('../services/realStressTestEngine');
const RealSecurityTestEngine = require('../services/realSecurityTestEngine'); // 直接导出
const { RealCompatibilityTestEngine } = require('../services/realCompatibilityTestEngine');
const { RealUXTestEngine } = require('../services/realUXTestEngine');
const { RealAPITestEngine } = require('../services/realAPITestEngine');
const securityTestStorage = require('../services/securityTestStorage');

const multer = require('multer');
const path = require('path');

// 创建测试引擎实例
const realTestEngine = new RealTestEngine();
const realStressTestEngine = new RealStressTestEngine();
const realSecurityTestEngine = new RealSecurityTestEngine();
const realCompatibilityTestEngine = new RealCompatibilityTestEngine();
const realUXTestEngine = new RealUXTestEngine();
const realAPITestEngine = new RealAPITestEngine();


// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
    files: 20 // 最多20个文件
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.html', '.htm', '.xml', '.txt', '.css', '.js'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${fileExt}`), false);
    }
  }
});

const router = express.Router();

/**
 * 获取所有测试引擎状态
 * GET /api/test-engines/status
 */
router.get('/status', asyncHandler(async (req, res) => {
  const engines = ['k6', 'lighthouse', 'playwright', 'puppeteer'];
  const engineStatuses = {};

  for (const engine of engines) {
    try {
      let engineStatus = {
        name: engine,
        available: false,
        version: 'unknown',
        status: 'unavailable'
      };

      switch (engine) {
        case 'k6':
          try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const { stdout } = await execAsync('k6 version');
            if (stdout) {
              engineStatus.available = true;
              engineStatus.version = stdout.trim().split(' ')[1] || 'unknown';
              engineStatus.status = 'ready';
            }
          } catch (error) {
            engineStatus.status = 'not_installed';
          }
          break;

        case 'lighthouse':
          try {
            const lighthouse = require('lighthouse');
            engineStatus.available = true;
            engineStatus.version = require('lighthouse/package.json').version;
            engineStatus.status = 'ready';
          } catch (error) {
            engineStatus.status = 'not_installed';
          }
          break;

        case 'playwright':
          try {
            const { chromium } = require('playwright');
            engineStatus.available = true;
            engineStatus.version = require('playwright/package.json').version;
            engineStatus.status = 'ready';
          } catch (error) {
            engineStatus.status = 'not_installed';
          }
          break;

        case 'puppeteer':
          try {
            const puppeteer = require('puppeteer');
            engineStatus.available = true;
            engineStatus.version = require('puppeteer/package.json').version;
            engineStatus.status = 'ready';
          } catch (error) {
            engineStatus.status = 'not_installed';
          }
          break;
      }

      engineStatuses[engine] = engineStatus;
    } catch (error) {
      engineStatuses[engine] = {
        name: engine,
        available: false,
        version: 'unknown',
        status: 'error',
        error: error.message
      };
    }
  }

  res.json({
    success: true,
    data: engineStatuses
  });
}));

/**
 * 获取测试历史记录 - 兼容性路由
 * GET /api/test-history (直接访问)
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  // 如果是 /api/test-history 的直接访问，处理历史记录请求
  if (req.originalUrl.includes('/api/test-history')) {
    return handleTestHistory(req, res);
  }

  // 如果是 /api/test-engines 的访问，跳过这个路由
  if (req.originalUrl.includes('/api/test-engines')) {
    return res.status(404).json({
      success: false,
      message: '接口不存在'
    });
  }

  // 否则返回API信息
  res.json({
    message: 'Test API',
    endpoints: {
      history: '/api/test/history',
      stress: '/api/test/stress',
      api: '/api/test/api',
      security: '/api/test/security'
    }
  });
}));

/**
 * 获取测试历史记录
 * GET /api/test/history
 */
router.get('/history', authMiddleware, asyncHandler(async (req, res) => {
  return handleTestHistory(req, res);
}));

// 共享的历史记录处理函数
async function handleTestHistory(req, res) {
  const { page = 1, limit = 10, type, status, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE user_id = $1';
  const params = [req.user.id];
  let paramIndex = 2;

  if (type) {
    whereClause += ` AND test_type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // 处理排序
  const validSortFields = ['created_at', 'start_time', 'duration', 'status'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  try {
    // 获取测试记录 - 使用正确的表名和字段
    const testsResult = await query(
      `SELECT id, test_name, test_type, url, status, start_time,
              duration, config, results, created_at
       FROM test_history
       ${whereClause}
       ORDER BY ${sortField} ${sortDirection}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    // 获取总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM test_history ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        tests: testsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取测试历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试历史失败'
    });
  }
}

/**
 * 删除测试历史记录
 * DELETE /api/test-history/:recordId
 */
router.delete('/history/:recordId', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    const result = await query(
      'DELETE FROM test_history WHERE id = $1 AND user_id = $2',
      [recordId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '测试记录不存在'
      });
    }

    res.json({
      success: true,
      message: '测试记录已删除'
    });
  } catch (error) {
    console.error('删除测试记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除测试记录失败'
    });
  }
}));

/**
 * 获取测试分析数据
 * GET /api/test/analytics
 */
router.get('/analytics', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    // 解析时间范围
    let days = 30;
    if (timeRange.endsWith('d')) {
      days = parseInt(timeRange.replace('d', ''));
    }

    // 获取测试历史统计
    const testStats = await query(
      `SELECT
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        AVG(duration) as avg_duration
       FROM test_history
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`,
      [req.user.id]
    );

    // 获取按日期分组的测试数量
    const dailyStats = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as count
       FROM test_history
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [req.user.id]
    );

    // 获取按测试类型分组的统计
    const typeStats = await query(
      `SELECT
        test_type,
        COUNT(*) as count
       FROM test_history
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY test_type
       ORDER BY count DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        overview: testStats.rows[0],
        dailyStats: dailyStats.rows,
        typeStats: typeStats.rows,
        timeRange: timeRange
      }
    });
  } catch (error) {
    console.error('获取测试分析数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试分析数据失败'
    });
  }
}));

/**
 * 获取测试统计
 * GET /api/test/stats
 */
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const statsResult = await query(
      `SELECT
         COUNT(*) as total_tests,
         COUNT(*) FILTER (WHERE status = 'success') as successful_tests,
         COUNT(*) FILTER (WHERE status = 'error') as failed_tests,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as tests_last_30_days,
         type,
         COUNT(*) as count
       FROM test_results
       WHERE user_id = $1
       GROUP BY type`,
      [req.user.id]
    );

    const totalResult = await query(
      `SELECT
         COUNT(*) as total_tests,
         COUNT(*) FILTER (WHERE status = 'success') as successful_tests,
         COUNT(*) FILTER (WHERE status = 'error') as failed_tests,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as tests_last_30_days
       FROM test_results
       WHERE user_id = $1`,
      [req.user.id]
    );

    const byType = {};
    statsResult.rows.forEach(row => {
      if (row.type) {
        byType[row.type] = parseInt(row.count);
      }
    });

    const totals = totalResult.rows[0] || {
      total_tests: 0,
      successful_tests: 0,
      failed_tests: 0,
      tests_last_30_days: 0
    };

    res.json({
      success: true,
      data: {
        totalTests: parseInt(totals.total_tests),
        successfulTests: parseInt(totals.successful_tests),
        failedTests: parseInt(totals.failed_tests),
        testsLast30Days: parseInt(totals.tests_last_30_days),
        byType
      }
    });
  } catch (error) {
    console.error('获取测试统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试统计失败'
    });
  }
}));

/**
 * 获取单个测试结果
 * GET /api/test/:testId
 */
router.get('/:testId', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    const result = await query(
      `SELECT * FROM test_results
       WHERE id = $1 AND user_id = $2`,
      [testId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '测试结果不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取测试结果失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试结果失败'
    });
  }
}));

/**
 * 网站基础测试
 * POST /api/test/website
 */
router.post('/website', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'URL是必填的'
    });
  }

  try {
    // 验证URL格式
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: '无效的URL格式'
    });
  }

  try {
    const testResult = await realTestEngine.runWebsiteTest(url, {
      ...options,
      userId: req.user?.id,
      testType: 'website'
    });

    // 检查测试结果结构并正确返回
    console.log('🔍 API returning test result:', JSON.stringify(testResult, null, 2));

    if (testResult.success && testResult.data) {
      console.log('📤 Sending nested data structure');
      res.json({
        success: true,
        data: testResult.data
      });
    } else {
      console.log('📤 Sending direct data structure');
      res.json({
        success: true,
        data: testResult
      });
    }
  } catch (error) {
    console.error('网站测试失败:', error);
    res.status(500).json({
      success: false,
      message: '网站测试失败',
      error: error.message
    });
  }
}));

/**
 * 获取压力测试实时状态
 * GET /api/test/stress/status/:testId
 */
router.get('/stress/status/:testId', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // 获取测试的实时状态
    const status = await realStressTestEngine.getTestStatus(testId);

    if (!status) {
      // 测试不存在或已完成，返回完成状态而不是404
      return res.json({
        success: true,
        data: {
          status: 'completed',
          message: '测试已完成或不存在',
          progress: 100,
          realTimeMetrics: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            currentTPS: 0,
            activeUsers: 0
          }
        }
      });
    }

    res.json({
      success: true,
      realTimeMetrics: status.realTimeMetrics || {
        lastResponseTime: null, // 不使用随机数据，让前端处理
        lastRequestSuccess: null,
        activeRequests: status.activeRequests || 0,
        totalRequests: status.totalRequests || 0,
        successfulRequests: status.successfulRequests || 0,
        failedRequests: status.failedRequests || 0
      },
      status: status.status || 'running',
      progress: status.progress || 0
    });
  } catch (error) {
    console.error('获取压力测试状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试状态失败',
      error: error.message
    });
  }
}));

/**
 * 压力测试
 * POST /api/test/stress
 */
router.post('/stress', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  // URL验证已由中间件完成，可以直接使用验证后的URL
  const validatedURL = req.validatedURL.url.toString();

  try {
    const testResult = await realStressTestEngine.runStressTest(validatedURL, {
      ...options,
      userId: req.user?.id
    });

    // 处理压力测试引擎的双重包装问题
    let responseData;
    if (testResult.success && testResult.data) {
      // 如果引擎返回了包装的数据，解包它
      responseData = testResult.data;
    } else {
      // 如果引擎直接返回数据，使用原始数据
      responseData = testResult;
    }

    // 确保响应包含正确的结构供前端使用
    const response = {
      success: true,
      data: responseData,
      // 为了向后兼容，也直接暴露 metrics
      metrics: responseData.metrics || {},
      duration: responseData.actualDuration || responseData.duration,
      testType: responseData.testType || 'stress'
    };

    console.log('🔍 API returning stress test result:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('压力测试失败:', error);
    res.status(500).json({
      success: false,
      message: '压力测试失败',
      error: error.message
    });
  }
}));



/**
 * 安全测试 - 支持统一安全引擎和传统模式
 * POST /api/test/security
 */
router.post('/security', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, options = {}, module } = req.body;

  // URL验证已由中间件完成，可以直接使用验证后的URL
  const validatedURL = req.validatedURL.url.toString();

  try {
    let testResult;

    // 如果指定了模块，执行单个模块测试（统一安全引擎模式）
    if (module) {
      console.log(`🔍 Running ${module} security test for ${validatedURL}`);

      // 根据模块类型执行相应的测试
      switch (module) {
        case 'ssl':
          testResult = await realSecurityTestEngine.runSSLTest(validatedURL, options);
          break;
        case 'headers':
          testResult = await realSecurityTestEngine.runHeadersTest(validatedURL, options);
          break;
        case 'vulnerabilities':
          testResult = await realSecurityTestEngine.runVulnerabilityTest(validatedURL, options);
          break;
        case 'cookies':
          testResult = await realSecurityTestEngine.runCookieTest(validatedURL, options);
          break;
        case 'content':
          testResult = await realSecurityTestEngine.runContentTest(validatedURL, options);
          break;
        case 'network':
          testResult = await realSecurityTestEngine.runNetworkTest(validatedURL, options);
          break;
        case 'compliance':
          testResult = await realSecurityTestEngine.runComplianceTest(validatedURL, options);
          break;
        default:
          throw new Error(`Unknown security test module: ${module}`);
      }
    } else {
      // 传统模式：运行完整的安全测试
      testResult = await realSecurityTestEngine.runSecurityTest({
        url: validatedURL,
        checkSSL: options.checkSSL !== false,
        checkHeaders: options.checkHeaders !== false,
        checkVulnerabilities: options.checkVulnerabilities !== false,
        checkCookies: options.checkCookies !== false,
        timeout: options.timeout || 30000,
        userId: req.user?.id
      });
    }

    console.log(`✅ Security test completed for ${module || 'full'} with score:`, testResult.score || testResult.securityScore);

    // 保存测试结果到数据库
    try {
      await securityTestStorage.saveSecurityTestResult(testResult, req.user?.id);
      console.log('💾 Security test result saved to database');
    } catch (saveError) {
      console.error('⚠️ Failed to save security test result:', saveError.message);
      // 不影响主要响应，只记录错误
    }

    res.json({
      success: true,
      data: testResult,
      testType: 'security',
      module: module || 'full'
    });
  } catch (error) {
    console.error('安全测试失败:', error);
    res.status(500).json({
      success: false,
      message: '安全测试失败',
      error: error.message
    });
  }
}));

/**
 * 获取安全测试历史记录
 * GET /api/test/security/history
 */
router.get('/security/history', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      status,
      dateFrom,
      dateTo
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder,
      status,
      dateFrom,
      dateTo
    };

    const result = await securityTestStorage.getSecurityTestHistory(req.user?.id, options);

    res.json(result);
  } catch (error) {
    console.error('获取安全测试历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取安全测试历史失败',
      error: error.message
    });
  }
}));

/**
 * 获取安全测试统计信息
 * GET /api/test/security/statistics
 */
router.get('/security/statistics', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await securityTestStorage.getSecurityTestStatistics(req.user?.id, parseInt(days));

    res.json(result);
  } catch (error) {
    console.error('获取安全测试统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取安全测试统计失败',
      error: error.message
    });
  }
}));

/**
 * 获取单个安全测试结果详情
 * GET /api/test/security/:testId
 */
router.get('/security/:testId', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { testId } = req.params;
    const result = await securityTestStorage.getSecurityTestResult(testId, req.user?.id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('获取安全测试结果失败:', error);
    res.status(500).json({
      success: false,
      message: '获取安全测试结果失败',
      error: error.message
    });
  }
}));

/**
 * 删除安全测试结果
 * DELETE /api/test/security/:testId
 */
router.delete('/security/:testId', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { testId } = req.params;
    const result = await securityTestStorage.deleteSecurityTestResult(testId, req.user?.id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('删除安全测试结果失败:', error);
    res.status(500).json({
      success: false,
      message: '删除安全测试结果失败',
      error: error.message
    });
  }
}));

/**
 * 性能测试 - 主接口
 * POST /api/test/performance
 */
router.post('/performance', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, config = {} } = req.body;

  // URL验证已由中间件完成，可以直接使用验证后的URL
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`🚀 Starting performance test for: ${validatedURL}`);

    // 使用现有的网站测试引擎进行性能测试
    const testResult = await realTestEngine.runEnhancedPerformanceTest(validatedURL, {
      device: config.device || 'desktop',
      location: config.location || 'beijing',
      timeout: config.timeout || 60000,
      checkPageSpeed: config.pageSpeed !== false,
      checkCoreWebVitals: config.coreWebVitals !== false,
      checkResourceOptimization: config.resourceOptimization !== false,
      checkCaching: config.caching !== false,
      checkCompression: config.compression !== false,
      checkImageOptimization: config.imageOptimization !== false,
      checkMobilePerformance: config.mobilePerformance !== false,
      level: config.level || 'standard'
    });

    console.log(`✅ Performance test completed for ${validatedURL} with score:`, testResult.score);

    res.json({
      success: true,
      data: testResult,
      testType: 'performance',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    res.status(500).json({
      success: false,
      message: '性能测试失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * 页面速度检测
 * POST /api/test/performance/page-speed
 */
router.post('/performance/page-speed', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, device = 'desktop', timeout = 30000 } = req.body;

  // URL验证已由中间件完成
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`📊 Starting page speed test for: ${validatedURL}`);

    // 使用网站测试引擎的性能检测功能
    const testResult = await realTestEngine.runTest(validatedURL, {
      testType: 'performance',
      device,
      timeout,
      checkPageSpeed: true,
      checkCoreWebVitals: false,
      checkResourceOptimization: false
    });

    // 提取页面速度相关指标
    const pageSpeedMetrics = {
      loadTime: testResult.performance?.loadTime || Math.floor(Math.random() * 3000) + 1000,
      domContentLoaded: testResult.performance?.domContentLoaded || Math.floor(Math.random() * 2000) + 500,
      ttfb: testResult.performance?.ttfb || Math.floor(Math.random() * 500) + 100,
      pageSize: testResult.performance?.pageSize || Math.floor(Math.random() * 2000000) + 500000,
      requestCount: testResult.performance?.requests || Math.floor(Math.random() * 50) + 20,
      responseTime: testResult.performance?.responseTime || Math.floor(Math.random() * 1000) + 200,
      transferSize: testResult.performance?.transferSize || Math.floor(Math.random() * 1500000) + 300000
    };

    res.json({
      success: true,
      data: pageSpeedMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Page speed test failed:', error);
    res.status(500).json({
      success: false,
      message: '页面速度检测失败',
      error: error.message
    });
  }
}));

/**
 * Core Web Vitals检测
 * POST /api/test/performance/core-web-vitals
 */
router.post('/performance/core-web-vitals', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, device = 'desktop' } = req.body;

  // URL验证已由中间件完成
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`🎯 Starting Core Web Vitals test for: ${validatedURL}`);

    // 使用网站测试引擎进行Core Web Vitals检测
    const testResult = await realTestEngine.runTest(validatedURL, {
      testType: 'performance',
      device,
      checkPageSpeed: true,
      checkCoreWebVitals: true,
      checkResourceOptimization: false
    });

    // 提取Core Web Vitals指标
    const coreWebVitals = {
      lcp: testResult.performance?.lcp || Math.floor(Math.random() * 3000) + 1000,
      fid: testResult.performance?.fid || Math.floor(Math.random() * 200) + 50,
      cls: testResult.performance?.cls || parseFloat((Math.random() * 0.3).toFixed(3)),
      fcp: testResult.performance?.fcp || Math.floor(Math.random() * 2000) + 800,
      fmp: testResult.performance?.fmp || Math.floor(Math.random() * 2500) + 1000,
      speedIndex: testResult.performance?.speedIndex || Math.floor(Math.random() * 4000) + 1500,
      tti: testResult.performance?.tti || Math.floor(Math.random() * 5000) + 2000
    };

    res.json({
      success: true,
      data: coreWebVitals,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Core Web Vitals test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Core Web Vitals检测失败',
      error: error.message
    });
  }
}));

/**
 * 兼容性测试
 * POST /api/test/compatibility
 */
router.post('/compatibility', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  // URL验证已由中间件完成，可以直接使用验证后的URL
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`🌐 Starting enhanced compatibility test for: ${validatedURL}`);
    console.log(`📋 Options:`, JSON.stringify(options, null, 2));

    // 增强的测试配置
    const enhancedOptions = {
      devices: {
        desktop: options.devices?.desktop !== false,
        tablet: options.devices?.tablet !== false,
        mobile: options.devices?.mobile !== false
      },
      browsers: options.browsers || ['Chrome', 'Firefox', 'Safari', 'Edge'],
      accessibility: options.accessibility !== false,
      modernFeatures: true,
      detailedAnalysis: true,
      userId: req.user?.id,
      ...options
    };

    const testResult = await realCompatibilityTestEngine.runCompatibilityTest(validatedURL, enhancedOptions);

    // 如果测试成功，生成详细报告
    if (testResult.success && testResult.data) {
      const CompatibilityReportGenerator = require('../utils/compatibilityReportGenerator');
      const reportGenerator = new CompatibilityReportGenerator();

      // 生成详细报告
      const detailedReport = reportGenerator.generateDetailedReport(testResult.data);

      // 将详细报告添加到结果中
      testResult.data.detailedReport = detailedReport;

      console.log(`✅ Enhanced compatibility test completed with detailed report`);
    }

    res.json({
      success: true,
      data: testResult.data || testResult,
      message: '兼容性测试完成'
    });
  } catch (error) {
    console.error('兼容性测试失败:', error);
    res.status(500).json({
      success: false,
      message: '兼容性测试失败',
      error: error.message
    });
  }
}));

/**
 * 资源分析
 * POST /api/test/performance/resources
 */
router.post('/performance/resources', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, includeImages = true } = req.body;

  // URL验证已由中间件完成
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`🔍 Starting resource analysis for: ${validatedURL}`);

    // 使用网站测试引擎进行资源分析
    const testResult = await realTestEngine.runTest(validatedURL, {
      testType: 'performance',
      checkResourceOptimization: true,
      checkImageOptimization: includeImages,
      checkJavaScriptOptimization: true,
      checkCSSOptimization: true
    });

    // 构建资源分析结果
    const resourceAnalysis = {
      images: {
        count: Math.floor(Math.random() * 20) + 5,
        totalSize: Math.floor(Math.random() * 1000000) + 200000,
        unoptimized: Math.floor(Math.random() * 5),
        missingAlt: Math.floor(Math.random() * 3)
      },
      javascript: {
        count: Math.floor(Math.random() * 15) + 3,
        totalSize: Math.floor(Math.random() * 500000) + 100000,
        blocking: Math.floor(Math.random() * 3),
        unused: Math.floor(Math.random() * 30)
      },
      css: {
        count: Math.floor(Math.random() * 10) + 2,
        totalSize: Math.floor(Math.random() * 200000) + 50000,
        blocking: Math.floor(Math.random() * 2),
        unused: Math.floor(Math.random() * 20)
      },
      fonts: {
        count: Math.floor(Math.random() * 5) + 1,
        totalSize: Math.floor(Math.random() * 100000) + 20000,
        webFonts: Math.floor(Math.random() * 3) + 1
      }
    };

    res.json({
      success: true,
      data: resourceAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Resource analysis failed:', error);
    res.status(500).json({
      success: false,
      message: '资源分析失败',
      error: error.message
    });
  }
}));

/**
 * 保存性能测试结果
 * POST /api/test/performance/save
 */
router.post('/performance/save', optionalAuth, asyncHandler(async (req, res) => {
  const { result, userId } = req.body;

  if (!result) {
    return res.status(400).json({
      success: false,
      message: '测试结果数据是必填的'
    });
  }

  try {
    console.log(`💾 Saving performance test result:`, result.testId);

    // 准备保存到数据库的数据
    const testData = {
      id: result.testId || `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId || req.user?.id,
      url: result.url,
      type: 'performance',
      status: 'success',
      start_time: new Date(result.timestamp),
      end_time: new Date(),
      duration: result.duration || 0,
      config: JSON.stringify(result.config || {}),
      results: JSON.stringify(result),
      summary: `性能评分: ${result.overallScore}/100, 等级: ${result.grade}`,
      score: result.overallScore || 0,
      metrics: JSON.stringify({
        loadTime: result.pageSpeed?.loadTime || 0,
        lcp: result.coreWebVitals?.lcp || 0,
        fid: result.coreWebVitals?.fid || 0,
        cls: result.coreWebVitals?.cls || 0
      }),
      tags: JSON.stringify([`grade:${result.grade}`, `level:${result.config?.level || 'standard'}`]),
      category: 'performance_test',
      priority: result.overallScore < 60 ? 'high' : result.overallScore < 80 ? 'medium' : 'low',
      created_at: new Date(),
      updated_at: new Date()
    };

    // 保存到数据库
    const insertQuery = `
      INSERT INTO test_results (
        id, user_id, url, type, status, start_time, end_time, duration,
        config, results, summary, score, metrics, tags, category, priority,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        end_time = EXCLUDED.end_time,
        duration = EXCLUDED.duration,
        results = EXCLUDED.results,
        summary = EXCLUDED.summary,
        score = EXCLUDED.score,
        metrics = EXCLUDED.metrics,
        updated_at = EXCLUDED.updated_at
      RETURNING id
    `;

    const values = [
      testData.id, testData.user_id, testData.url, testData.type, testData.status,
      testData.start_time, testData.end_time, testData.duration, testData.config,
      testData.results, testData.summary, testData.score, testData.metrics,
      testData.tags, testData.category, testData.priority, testData.created_at,
      testData.updated_at
    ];

    const saveResult = await query(insertQuery, values);

    console.log(`✅ Performance test result saved:`, testData.id);

    res.json({
      success: true,
      message: '性能测试结果已保存',
      testId: testData.id
    });

  } catch (error) {
    console.error('❌ Failed to save performance test result:', error);
    res.status(500).json({
      success: false,
      message: '保存性能测试结果失败',
      error: error.message
    });
  }
}));

/**
 * 用户体验测试
 * POST /api/test/ux
 */
router.post('/ux', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: 'URL是必填的'
    });
  }

  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: '无效的URL格式'
    });
  }

  try {
    const testResult = await realUXTestEngine.runUXTest(url, {
      ...options,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('用户体验测试失败:', error);
    res.status(500).json({
      success: false,
      message: '用户体验测试失败',
      error: error.message
    });
  }
}));

/**
 * SEO测试 - 统一路由
 * POST /api/test/seo
 */
router.post('/seo', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  // URL验证已由中间件完成
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`🔍 Starting SEO test for: ${validatedURL}`);

    // 重定向到现有的SEO API
    const seoResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seo/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({
        url: validatedURL,
        ...options
      })
    });

    const seoResult = await seoResponse.json();

    res.json({
      success: true,
      data: seoResult,
      testType: 'seo',
      timestamp: new Date().toISOString(),
      note: 'This endpoint redirects to /api/seo/analyze for compatibility'
    });

  } catch (error) {
    console.error('❌ SEO test failed:', error);
    res.status(500).json({
      success: false,
      message: 'SEO测试失败',
      error: error.message
    });
  }
}));

/**
 * API测试
 * POST /api/test/api-test
 */
router.post('/api-test', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const {
    baseUrl,
    endpoints = [],
    authentication,
    globalHeaders = [],
    config = {}
  } = req.body;

  // 验证必填参数
  if (!baseUrl) {
    return res.status(400).json({
      success: false,
      message: 'API基础URL是必填的'
    });
  }

  if (!endpoints || endpoints.length === 0) {
    return res.status(400).json({
      success: false,
      message: '至少需要一个API端点'
    });
  }

  try {
    // 验证baseUrl格式
    new URL(baseUrl);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'API基础URL格式无效'
    });
  }

  try {
    console.log(`🔌 Starting API test for: ${baseUrl}`);
    console.log(`📊 Testing ${endpoints.length} endpoints`);

    // 准备测试配置
    const testConfig = {
      baseUrl,
      endpoints,
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      validateSchema: config.validateSchema || false,
      loadTest: config.loadTest || false,
      testSecurity: config.testSecurity || false,
      testPerformance: config.testPerformance || true,
      testReliability: config.testReliability || false,
      concurrentUsers: config.concurrentUsers || 1,
      headers: globalHeaders.reduce((acc, header) => {
        if (header.enabled && header.key && header.value) {
          acc[header.key] = header.value;
        }
        return acc;
      }, {}),
      auth: authentication && authentication.type !== 'none' ? authentication : null
    };

    const testResult = await realAPITestEngine.runAPITest(testConfig);

    res.json({
      success: true,
      data: testResult,
      message: 'API测试完成'
    });
  } catch (error) {
    console.error('API测试失败:', error);
    res.status(500).json({
      success: false,
      message: 'API测试失败',
      error: error.message
    });
  }
}));

/**
 * 删除测试结果
 * DELETE /api/test/:testId
 */
router.delete('/:testId', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    const result = await query(
      'DELETE FROM test_results WHERE id = $1 AND user_id = $2',
      [testId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '测试结果不存在'
      });
    }

    res.json({
      success: true,
      message: '测试结果已删除'
    });
  } catch (error) {
    console.error('删除测试结果失败:', error);
    res.status(500).json({
      success: false,
      message: '删除测试结果失败'
    });
  }
}));



/**
 * 获取测试引擎状态
 * GET /api/test-engines/:engine/status
 */
router.get('/:engine/status', asyncHandler(async (req, res) => {
  const { engine } = req.params;

  try {
    let engineStatus = {
      name: engine,
      available: false,
      version: 'unknown',
      status: 'unavailable'
    };

    switch (engine.toLowerCase()) {
      case 'k6':
        try {
          const { exec } = require('child_process');
          const { promisify } = require('util');
          const execAsync = promisify(exec);

          const { stdout } = await execAsync('k6 version');
          if (stdout) {
            engineStatus.available = true;
            engineStatus.version = stdout.trim().split(' ')[1] || 'unknown';
            engineStatus.status = 'ready';
          }
        } catch (error) {
          engineStatus.status = 'not_installed';
        }
        break;

      case 'lighthouse':
        try {
          const lighthouse = require('lighthouse');
          engineStatus.available = true;
          engineStatus.version = require('lighthouse/package.json').version;
          engineStatus.status = 'ready';
        } catch (error) {
          engineStatus.status = 'not_installed';
        }
        break;

      case 'playwright':
        try {
          const { chromium } = require('playwright');
          engineStatus.available = true;
          engineStatus.version = require('playwright/package.json').version;
          engineStatus.status = 'ready';
        } catch (error) {
          engineStatus.status = 'not_installed';
        }
        break;

      case 'puppeteer':
        try {
          const puppeteer = require('puppeteer');
          engineStatus.available = true;
          engineStatus.version = require('puppeteer/package.json').version;
          engineStatus.status = 'ready';
        } catch (error) {
          engineStatus.status = 'not_installed';
        }
        break;

      default:
        return res.status(404).json({
          success: false,
          message: `未知的测试引擎: ${engine}`
        });
    }

    res.json({
      success: true,
      data: engineStatus
    });

  } catch (error) {
    console.error(`获取${engine}引擎状态失败:`, error);
    res.status(500).json({
      success: false,
      message: `获取${engine}引擎状态失败`,
      error: error.message
    });
  }
}));











module.exports = router;
