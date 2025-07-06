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
const { RealSEOTestEngine } = require('../services/realSEOTestEngine');
const multer = require('multer');
const path = require('path');

// 创建测试引擎实例
const realTestEngine = new RealTestEngine();
const realStressTestEngine = new RealStressTestEngine();
const realSecurityTestEngine = new RealSecurityTestEngine();
const realCompatibilityTestEngine = new RealCompatibilityTestEngine();
const realUXTestEngine = new RealUXTestEngine();
const realAPITestEngine = new RealAPITestEngine();
const realSEOTestEngine = new RealSEOTestEngine();

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
 * SEO测试
 * POST /api/test/seo
 */
router.post('/seo', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, config = {} } = req.body;

  // URL验证已由中间件完成，可以直接使用验证后的URL
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log('🔍 Starting comprehensive SEO analysis for:', validatedURL);

    // 使用专门的SEO测试引擎
    const testResult = await realSEOTestEngine.runSEOTest(validatedURL, {
      ...config,
      userId: req.user?.id,
      keywords: config.keywords || config.customKeywords || '',
      depth: config.depth || 'medium',
      checkSEO: config.checkSEO !== false,
      checkPerformance: config.checkPerformance !== false,
      checkAccessibility: config.checkAccessibility !== false,
      checkContent: config.checkContent !== false,
      checkSecurity: config.checkSecurity !== false,
      checkMobile: config.checkMobile !== false,
      checkLinks: config.checkLinks !== false
    });

    console.log('✅ SEO analysis completed with score:', testResult.overallScore);

    res.json({
      success: true,
      data: testResult,
      testType: 'seo'
    });
  } catch (error) {
    console.error('❌ SEO测试失败:', error);
    res.status(500).json({
      success: false,
      message: 'SEO测试失败',
      error: error.message
    });
  }
}));

/**
 * 安全测试
 * POST /api/test/security
 */
router.post('/security', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  // URL验证已由中间件完成，可以直接使用验证后的URL
  const validatedURL = req.validatedURL.url.toString();

  try {
    const testResult = await realSecurityTestEngine.runSecurityTest({
      url: validatedURL,
      checkSSL: options.checkSSL !== false,
      checkHeaders: options.checkHeaders !== false,
      checkVulnerabilities: options.checkVulnerabilities !== false,
      checkCookies: options.checkCookies !== false,
      timeout: options.timeout || 30000,
      userId: req.user?.id
    });

    console.log('✅ Security test completed with score:', testResult.securityScore);

    res.json({
      success: true,
      data: testResult,
      testType: 'security'
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

/**
 * 本地SEO文件分析
 * POST /api/test/seo/local
 */
router.post('/seo/local', optionalAuth, upload.array('files', 20), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: '请上传至少一个文件'
    });
  }

  try {
    console.log(`📁 Starting local SEO analysis for ${req.files.length} files`);

    const options = {
      checkTechnicalSEO: req.body.checkTechnicalSEO !== 'false',
      checkContentQuality: req.body.checkContentQuality !== 'false',
      checkAccessibility: req.body.checkAccessibility !== 'false',
      checkPerformance: req.body.checkPerformance !== 'false',
      keywords: req.body.keywords || '',
      userId: req.user?.id
    };

    const analysisResult = await enhancedSEOEngine.analyzeLocalFiles(req.files, options);

    console.log(`✅ Local SEO analysis completed with score: ${analysisResult.overallScore}`);

    res.json({
      success: true,
      data: analysisResult,
      testType: 'seo-local'
    });

  } catch (error) {
    console.error('本地SEO分析失败:', error);
    res.status(500).json({
      success: false,
      message: '本地SEO分析失败',
      error: error.message
    });
  }
}));

/**
 * 增强SEO分析
 * POST /api/test/seo/enhanced
 */
router.post('/seo/enhanced', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log('🚀 Starting enhanced SEO analysis for:', validatedURL);

    const enhancedOptions = {
      ...options,
      userId: req.user?.id,
      keywords: options.keywords || '',
      deepCrawl: options.deepCrawl === true,
      maxPages: parseInt(options.maxPages) || 10,
      maxDepth: parseInt(options.maxDepth) || 2,
      competitorAnalysis: options.competitorAnalysis === true,
      competitorUrls: options.competitorUrls || [],
      backlinksAnalysis: options.backlinksAnalysis === true,
      keywordRanking: options.keywordRanking === true,
      internationalSEO: options.internationalSEO === true,
      technicalAudit: options.technicalAudit === true
    };

    // 使用现有的realSEOTestEngine，但传入增强选项
    const testResult = await realSEOTestEngine.runSEOTest(validatedURL, enhancedOptions);

    console.log('✅ Enhanced SEO analysis completed with score:', testResult.overallScore);

    res.json({
      success: true,
      data: testResult,
      testType: 'seo-enhanced'
    });

  } catch (error) {
    console.error('增强SEO分析失败:', error);
    res.status(500).json({
      success: false,
      message: '增强SEO分析失败',
      error: error.message
    });
  }
}));

module.exports = router;
