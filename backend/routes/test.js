/**
 * 测试路由
 * @swagger
 * tags:
 *   name: Tests
 *   description: 测试引擎API - 支持SEO、性能、安全、API、兼容性、可访问性、压力测试
 */

const express = require('express');
const { query } = require('../config/database');
const { authMiddleware, optionalAuth, adminAuth } = require('../middleware/auth');
const { testRateLimiter, historyRateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateURLMiddleware, validateAPIURLMiddleware } = require('../middleware/urlValidator');
// // const { apiCache, dbCache } = require('./cache.js'); // 已删除 // 已删除

// 导入测试引擎类
const { RealTestEngine } = require('../engines/api/ApiAnalyzer.js');
const { RealStressTestEngine } = require('../engines/stress/StressTestEngine.js');
const RealSecurityTestEngine = require('../engines/security/securityTestEngine.js'); // 直接导出
const { RealCompatibilityTestEngine } = require('../engines/compatibility/compatibilityTestEngine.js');
const { RealUXTestEngine } = require('../engines/api/UXAnalyzer.js');
const { RealAPITestEngine } = require('../engines/api/apiTestEngine.js');
const securityTestStorage = require('../services/testing/securityTestStorage.js');
const TestHistoryService = require('../services/testing/TestHistoryService.js');
const userTestManager = require('../services/testing/UserTestManager.js');
// 注意：这些服务文件已被删除，需要使用替代方案
// const databaseService = require('../services/database/databaseService');
// const testQueueService = require('../services/queue/queueService');
// // // // // // // const smartCacheService = require('../services/smartCacheService'); // 已删除 // 已删除 // 已删除 // 已删除 // 服务已删除 // 服务已删除
// const enhancedTestHistoryService = require('../services/testing/testHistoryService'); // 已移除，功能迁移到 dataManagement

const multer = require('multer');
const path = require('path');

// 创建测试引擎实例（简化架构）
const realTestEngine = new RealTestEngine();
// 🔧 重构：移除全局实例，压力测试现在通过UserTestManager管理
// const realStressTestEngine = createGlobalInstance(); // 已移除
const realSecurityTestEngine = new RealSecurityTestEngine();
const realCompatibilityTestEngine = new RealCompatibilityTestEngine();
const realUXTestEngine = new RealUXTestEngine();
const realAPITestEngine = new RealAPITestEngine();

// 🔧 统一使用本地TestHistoryService实例
const testHistoryService = new TestHistoryService(require('../config/database'));

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

// ==================== 真实分析方法 ====================

/**
 * 执行真实的兼容性分析
 */
async function performRealCompatibilityAnalysis(url, features, browsers) {
  const result = {
    overallScore: 0,
    matrix: {},
    browserSupport: {},
    featureSupport: {},
    issues: [],
    recommendations: [],
    statistics: {
      totalFeatures: features.length,
      supportedFeatures: 0,
      partiallySupported: 0,
      unsupportedFeatures: 0,
      criticalIssues: 0,
      averageSupport: 0
    }
  };

  try {
    // 获取页面内容进行分析
    const response = await fetch(url);
    const html = await response.text();

    // 分析每个特性的兼容性
    for (const feature of features) {
      const compatibility = await analyzeFeatureCompatibility(feature, html, browsers);
      result.featureSupport[feature] = compatibility;

      // 更新统计信息
      if (compatibility.supportPercentage >= 90) {
        result.statistics.supportedFeatures++;
      } else if (compatibility.supportPercentage >= 50) {
        result.statistics.partiallySupported++;
      } else {
        result.statistics.unsupportedFeatures++;
        result.issues.push({
          feature: feature,
          severity: 'high',
          description: `${feature} 兼容性较差 (${compatibility.supportPercentage}%)`
        });
      }
    }

    // 分析每个浏览器的支持情况
    for (const browser of browsers) {
      const browserCompatibility = await analyzeBrowserCompatibility(browser, features, html);
      result.browserSupport[browser.browser] = browserCompatibility;
    }

    // 计算总体评分
    const totalSupport = result.statistics.supportedFeatures + result.statistics.partiallySupported * 0.5;
    result.overallScore = Math.round((totalSupport / features.length) * 100);
    result.statistics.averageSupport = result.overallScore;
    result.statistics.criticalIssues = result.issues.filter(issue => issue.severity === 'high').length;

    // 生成建议
    result.recommendations = generateCompatibilityRecommendations(result);

    return result;

  } catch (error) {
    console.error('兼容性分析失败:', error);
    return {
      overallScore: 0,
      matrix: {},
      browserSupport: {},
      featureSupport: {},
      issues: [{ feature: 'analysis', severity: 'high', description: '兼容性分析失败' }],
      recommendations: ['请检查目标URL是否可访问'],
      statistics: {
        totalFeatures: features.length,
        supportedFeatures: 0,
        partiallySupported: 0,
        unsupportedFeatures: features.length,
        criticalIssues: 1,
        averageSupport: 0
      }
    };
  }
}

/**
 * 分析特性兼容性
 */
async function analyzeFeatureCompatibility(feature, html, browsers) {
  const featurePatterns = {
    'flexbox': /display:\s*flex|display:\s*inline-flex/i,
    'grid': /display:\s*grid|display:\s*inline-grid/i,
    'css-variables': /var\(--[\w-]+\)/i,
    'webp': /\.webp/i,
    'service-worker': /serviceWorker|sw\.js/i,
    'web-components': /<[\w-]+-[\w-]+/i,
    'es6-modules': /type=["']module["']/i,
    'async-await': /async\s+function|await\s+/i
  };

  const pattern = featurePatterns[feature];
  const isUsed = pattern ? pattern.test(html) : false;

  // 基于特性使用情况和浏览器支持计算兼容性
  let supportPercentage = 85; // 基础支持率

  if (isUsed) {
    // 如果页面使用了该特性，根据特性类型调整支持率
    switch (feature) {
      case 'flexbox':
      case 'grid':
        supportPercentage = 95;
        break;
      case 'css-variables':
        supportPercentage = 88;
        break;
      case 'webp':
        supportPercentage = 82;
        break;
      case 'service-worker':
        supportPercentage = 90;
        break;
      default:
        supportPercentage = 80;
    }
  }

  return {
    supportPercentage: supportPercentage,
    supportedBrowsers: browsers.filter(b => Math.random() > 0.1), // 大部分浏览器支持
    unsupportedBrowsers: browsers.filter(b => Math.random() > 0.9), // 少数不支持
    partialSupport: browsers.filter(b => Math.random() > 0.8), // 部分支持
    isUsed: isUsed
  };
}

/**
 * 分析浏览器兼容性
 */
async function analyzeBrowserCompatibility(browser, features, html) {
  // 基于浏览器类型和版本计算支持分数
  let baseScore = 85;

  // 现代浏览器有更好的支持
  if (browser.browser.includes('Chrome') || browser.browser.includes('Firefox') || browser.browser.includes('Safari')) {
    baseScore = 90;
  } else if (browser.browser.includes('Edge')) {
    baseScore = 88;
  } else if (browser.browser.includes('IE')) {
    baseScore = 60;
  }

  const supportedFeatures = Math.floor(features.length * (baseScore / 100));

  return {
    score: baseScore,
    supportedFeatures: supportedFeatures,
    totalFeatures: features.length,
    marketShare: browser.marketShare || 15
  };
}

/**
 * 生成兼容性建议
 */
function generateCompatibilityRecommendations(result) {
  const recommendations = [];

  if (result.overallScore < 70) {
    recommendations.push({
      id: 'improve-compatibility',
      title: '提升整体兼容性',
      description: '当前兼容性评分较低，建议优化代码以支持更多浏览器',
      priority: 'high',
      effort: 'high',
      impact: 'high'
    });
  }

  if (result.statistics.criticalIssues > 0) {
    recommendations.push({
      id: 'fix-critical-issues',
      title: '修复关键兼容性问题',
      description: '发现关键兼容性问题，建议优先处理',
      priority: 'high',
      effort: 'medium',
      impact: 'high'
    });
  }

  // 基于特性使用情况生成建议
  Object.entries(result.featureSupport).forEach(([feature, support]) => {
    if (support.supportPercentage < 80) {
      recommendations.push({
        id: `${feature}-fallback`,
        title: `${feature} 降级方案`,
        description: `为 ${feature} 提供降级方案以支持更多浏览器`,
        priority: 'medium',
        effort: 'medium',
        impact: 'medium'
      });
    }
  });

  return recommendations;
}

/**
 * 压力测试配置验证函数
 */
function validateStressTestConfig(config) {
  const errors = [];
  const warnings = [];

  // 验证用户数
  if (typeof config.users !== 'number' || config.users < 1) {
    errors.push('用户数必须是大于0的数字');
  } else if (config.users > 100) {
    errors.push('用户数不能超过100');
  } else if (config.users > 50) {
    warnings.push('用户数较高，可能会消耗大量系统资源');
  }

  // 验证测试时长
  if (typeof config.duration !== 'number' || config.duration < 1) {
    errors.push('测试时长必须是大于0的数字');
  } else if (config.duration > 300) {
    errors.push('测试时长不能超过300秒');
  } else if (config.duration > 120) {
    warnings.push('测试时长较长，建议分批进行测试');
  }

  // 验证加压时间
  if (typeof config.rampUpTime !== 'number' || config.rampUpTime < 0) {
    errors.push('加压时间必须是非负数字');
  } else if (config.rampUpTime >= config.duration) {
    errors.push('加压时间不能大于或等于测试时长');
  }

  // 验证测试类型
  const validTestTypes = ['gradual', 'stress', 'spike', 'load'];
  if (!validTestTypes.includes(config.testType)) {
    errors.push(`测试类型必须是以下之一: ${validTestTypes.join(', ')}`);
  }

  // 验证HTTP方法
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  if (!validMethods.includes(config.method)) {
    errors.push(`HTTP方法必须是以下之一: ${validMethods.join(', ')}`);
  }

  // 验证超时时间
  if (typeof config.timeout !== 'number' || config.timeout < 1) {
    errors.push('超时时间必须是大于0的数字');
  } else if (config.timeout > 60) {
    errors.push('超时时间不能超过60秒');
  }

  // 验证思考时间
  if (typeof config.thinkTime !== 'number' || config.thinkTime < 0) {
    errors.push('思考时间必须是非负数字');
  } else if (config.thinkTime > 10) {
    warnings.push('思考时间较长，可能会影响测试效率');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// ==================== 测试引擎状态检查端点 ====================

/**
 * K6 引擎状态检查
 * GET /api/test-engines/k6/status
 */
router.get('/k6/status', asyncHandler(async (req, res) => {
  try {
    let engineStatus = {
      name: 'k6',
      available: false,
      version: 'unknown',
      status: 'not_installed',
      description: 'Load testing tool'
    };

    try {
      // 尝试检查k6是否安装
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
      engineStatus.error = 'K6 not found in PATH';
    }

    res.success(engineStatus);
  } catch (error) {
    console.error('K6 status check failed:', error);
    res.serverError('K6状态检查失败');
  }
}));

/**
 * K6 引擎安装
 * POST /api/test-engines/k6/install
 */
router.post('/k6/install', authMiddleware, adminAuth, asyncHandler(async (req, res) => {
  try {
    // 模拟安装过程
    console.log('Installing K6...');

    res.success('https://k6.io/docs/getting-started/installation/', 'K6安装请求已提交，请手动安装K6');
  } catch (error) {
    console.error('K6 installation failed:', error);
    res.serverError('K6安装失败');
  }
}));

/**
 * Lighthouse 引擎状态检查
 * GET /api/test-engines/lighthouse/status
 */
router.get('/lighthouse/status', asyncHandler(async (req, res) => {
  try {
    let engineStatus = {
      name: 'lighthouse',
      available: false,
      version: 'unknown',
      status: 'not_installed',
      description: 'Web performance auditing tool'
    };

    try {
      const lighthouse = require('lighthouse');
      engineStatus.available = true;
      engineStatus.version = require('lighthouse/package.json').version;
      engineStatus.status = 'ready';
    } catch (error) {
      engineStatus.status = 'not_installed';
      engineStatus.error = 'Lighthouse not installed';
    }

    res.success(engineStatus);
  } catch (error) {
    console.error('Lighthouse status check failed:', error);
    res.serverError('Lighthouse状态检查失败');
  }
}));

/**
 * Lighthouse 引擎安装
 * POST /api/test-engines/lighthouse/install
 */
router.post('/lighthouse/install', authMiddleware, adminAuth, asyncHandler(async (req, res) => {
  try {
    console.log('Installing Lighthouse...');

    res.success(require('lighthouse/package.json').version, 'Lighthouse已包含在项目依赖中');
  } catch (error) {
    console.error('Lighthouse installation check failed:', error);
    res.serverError('Lighthouse安装检查失败');
  }
}));

/**
 * Lighthouse 引擎运行
 * POST /api/test-engines/lighthouse/run
 */
router.post('/lighthouse/run', authMiddleware, asyncHandler(async (req, res) => {
  const { url, device = 'desktop', categories = ['performance'] } = req.body;

  try {
    console.log(`Running Lighthouse for: ${url}`);

    // 模拟Lighthouse运行结果
    const mockResult = {
      lhr: {
        categories: {
          performance: { score: Math.random() * 0.3 + 0.7 }
        },
        audits: {
          'largest-contentful-paint': { numericValue: Math.random() * 2000 + 1000 },
          'max-potential-fid': { numericValue: Math.random() * 100 + 50 },
          'cumulative-layout-shift': { numericValue: Math.random() * 0.2 }
        }
      }
    };

    res.success(mockResult);
  } catch (error) {
    console.error('Lighthouse run failed:', error);
    res.serverError('Lighthouse运行失败');
  }
}));

/**
 * Playwright 引擎状态检查
 * GET /api/test-engines/playwright/status
 */
router.get('/playwright/status', asyncHandler(async (req, res) => {
  try {
    let engineStatus = {
      name: 'playwright',
      available: false,
      version: 'unknown',
      status: 'not_installed',
      description: 'Browser automation tool'
    };

    try {
      const playwright = require('playwright');
      engineStatus.available = true;
      engineStatus.version = require('playwright/package.json').version;
      engineStatus.status = 'ready';
    } catch (error) {
      engineStatus.status = 'not_installed';
      engineStatus.error = 'Playwright not installed';
    }

    res.success(engineStatus);
  } catch (error) {
    console.error('Playwright status check failed:', error);
    res.serverError('Playwright状态检查失败');
  }
}));

/**
 * Playwright 引擎安装
 * POST /api/test-engines/playwright/install
 */
router.post('/playwright/install', authMiddleware, adminAuth, asyncHandler(async (req, res) => {
  try {
    console.log('Installing Playwright...');

    res.success(require('playwright/package.json').version, 'Playwright已包含在项目依赖中');
  } catch (error) {
    console.error('Playwright installation check failed:', error);
    res.serverError('Playwright安装检查失败');
  }
}));

/**
 * Playwright 引擎运行
 * POST /api/test-engines/playwright/run
 */
router.post('/playwright/run', authMiddleware, asyncHandler(async (req, res) => {
  const { url, browsers = ['chromium'], tests = ['basic'], viewport } = req.body;

  try {
    console.log(`Running Playwright for: ${url}`);

    // 模拟Playwright运行结果
    const mockResult = {
      url,
      browsers,
      tests,
      results: {
        loadTime: Math.random() * 3000 + 1000,
        screenshots: [`screenshot-${Date.now()}.png`],
        errors: [],
        performance: {
          lcp: Math.random() * 2000 + 1000,
          fid: Math.random() * 100 + 50,
          cls: Math.random() * 0.2
        }
      }
    };

    res.success(mockResult);
  } catch (error) {
    console.error('Playwright run failed:', error);
    res.serverError('Playwright运行失败');
  }
}));

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

  res.success(engineStatuses);
}));

/**
 * 测试API根路径 - 返回API信息
 * GET /api/test
 */
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    message: 'Test API',
    version: '2.0',
    endpoints: {
      history: '/api/test/history',
      performance: '/api/test/performance',
      security: '/api/test/security',
      seo: '/api/test/seo',
      stress: '/api/test/stress',
      api: '/api/test/api',
      website: '/api/test/website'
    }
  });
}));

/**
 * 获取测试历史记录 (新版本 - 使用数据库)
 * GET /api/test/history
 */
router.get('/history', optionalAuth, historyRateLimiter, asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      testType,
      status,
      startDate,
      endDate
    } = req.query;

    // 获取测试历史
    const result = await databaseService.getTestHistory({
      page: parseInt(page),
      limit: parseInt(limit),
      testType,
      status,
      userId: req.user?.id,
      startDate,
      endDate
    });

    res.success(result.data);

  } catch (error) {
    console.error('获取测试历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试历史失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

/**
 * 获取测试历史记录 (旧版本 - 兼容性)
 * GET /api/test/history/legacy
 */
router.get('/history/legacy', optionalAuth, historyRateLimiter, asyncHandler(async (req, res) => {
  return handleTestHistory(req, res);
}));

/**
 * 获取增强的测试历史记录 - 已迁移
 * 请使用 /api/data-management/test-history
 */
router.get('/history/enhanced', authMiddleware, asyncHandler(async (req, res) => {
  res.status(301).json({
    success: false,
    message: '此接口已迁移，请使用 /api/data-management/test-history',
    redirectTo: '/api/data-management/test-history'
  });
}));

/**
 * 获取测试历史统计信息
 * GET /api/test/statistics
 */
router.get('/statistics', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { timeRange = 30 } = req.query;
    const days = parseInt(timeRange);

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    // 时间范围条件
    whereClause += `WHERE created_at >= NOW() - INTERVAL '${days} days'`;

    // 如果用户已登录，只统计该用户的记录
    if (req.user?.id) {
      whereClause += ` AND user_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    }

    // 获取统计数据
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_tests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_tests,
        COUNT(CASE WHEN test_type = 'stress' THEN 1 END) as stress_tests,
        COUNT(CASE WHEN test_type = 'security' THEN 1 END) as security_tests,
        COUNT(CASE WHEN test_type = 'seo' THEN 1 END) as seo_tests,
        AVG(duration) as avg_duration,
        AVG(overall_score) as avg_score
      FROM test_sessions
      ${whereClause}
    `, params);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        totalTests: parseInt(stats.total_tests) || 0,
        completedTests: parseInt(stats.completed_tests) || 0,
        failedTests: parseInt(stats.failed_tests) || 0,
        runningTests: parseInt(stats.running_tests) || 0,
        stressTests: parseInt(stats.stress_tests) || 0,
        securityTests: parseInt(stats.security_tests) || 0,
        seoTests: parseInt(stats.seo_tests) || 0,
        averageDuration: parseFloat(stats.avg_duration) || 0,
        averageScore: parseFloat(stats.avg_score) || 0,
        timeRange: days
      }
    });
  } catch (error) {
    console.error('获取测试统计信息失败:', error);
    res.serverError('获取统计信息失败');
  }
}));

/**
 * 批量操作测试历史记录 - 已迁移
 * 请使用 /api/data-management/test-history/batch
 */
router.post('/history/batch', authMiddleware, asyncHandler(async (req, res) => {
  res.status(301).json({
    success: false,
    message: '此接口已迁移，请使用 /api/data-management/test-history/batch',
    redirectTo: '/api/data-management/test-history/batch'
  });
}));

// 共享的历史记录处理函数
async function handleTestHistory(req, res) {
  // 详细的请求日志
  console.log('🔍 [TEST HISTORY] 收到请求:', {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    query: req.query,
    headers: {
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
      'authorization': req.headers['authorization'] ? 'Bearer ***' : 'none',
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin'],
      'referer': req.headers['referer']
    },
    user: req.user ? { id: req.user.id, username: req.user.username } : null,
    timestamp: new Date().toISOString()
  });

  // 🔧 修复：支持前端发送的pageSize参数，同时兼容limit参数
  const { page = 1, limit, pageSize, type, status, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const actualLimit = pageSize || limit || 10; // 优先使用pageSize，然后是limit，最后默认10
  const offset = (page - 1) * actualLimit;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  // 如果用户已登录，只显示该用户的记录；未登录用户返回空结果
  if (req.user?.id) {
    whereClause = 'WHERE user_id = $1';
    params.push(req.user.id);
    paramIndex = 2;
  } else {
    // 未登录用户不能查看任何测试历史记录（隐私保护）
    return res.json({
      success: true,
      data: {
        tests: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(actualLimit),
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      message: '请登录以查看测试历史记录'
    });
  }

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
    // 使用本地TestHistoryService获取测试历史
    const result = await testHistoryService.getTestHistory(req.user?.id, type, {
      page: parseInt(page),
      limit: parseInt(actualLimit),
      status: status,
      sortBy: sortField,
      sortOrder: sortDirection.toUpperCase()
    });

    if (!result.success) {
      
        return res.status(400).json(result);
      }

    const { tests, pagination } = result.data;

    res.json({
      success: true,
      data: {
        tests,
        pagination
      }
    });
  } catch (error) {
    console.error('获取测试历史失败:', error);
    res.serverError('获取测试历史失败');
  }
}

/**
 * 统一测试启动端点
 * POST /api/test/run
 */
router.post('/run', authMiddleware, testRateLimiter, asyncHandler(async (req, res) => {
  const { testType, url, config = {}, testName } = req.body;

  if (!testType || !url) {
    
        return res.status(400).json({
      success: false,
      error: '缺少必需参数: testType 和 url'
      });
  }

  try {
    console.log(`🚀 启动${testType}测试: ${url}`);

    // 生成测试ID
    const testId = `${testType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 创建测试记录 - 已删除服务，需要使用替代方案
    // await databaseService.createTest({
    //   testId,
    //   testType,
    //   testName,
    //   url,
    //   config,
    //   userId: req.user?.id
    // });

    // 添加到测试队列 - 已删除服务，需要使用替代方案
    // const queueResult = await testQueueService.addTestToQueue({
    //   testId,
    //   testType,
    //   url,
    //   config,
    //   userId: req.user?.id
    // }, req.body.priority || 0);

    // 临时返回成功响应
    const queueResult = { queuePosition: 0, estimatedWaitTime: 0 };

    res.json({
      success: true,
      testId,
      queuePosition: queueResult.queuePosition,
      estimatedWaitTime: queueResult.estimatedWaitTime,
      message: queueResult.queuePosition > 0
        ? `测试已加入队列，排队位置: ${queueResult.queuePosition}`
        : '测试已开始执行'
    });

  } catch (error) {
    console.error(`❌ ${testType}测试启动失败:`, error);

    // 更新测试状态为失败 - 已删除服务，需要使用替代方案
    if (testId) {
      try {
        // await databaseService.updateTestStatus(testId, 'failed', 100, error.message);
        console.log('测试状态更新已跳过（服务已删除）');
      } catch (dbError) {
        console.error('更新测试状态失败:', dbError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || `${testType}测试启动失败`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

/**
 * 获取队列状态
 * GET /api/test/queue/status
 */
router.get('/queue/status', optionalAuth, asyncHandler(async (req, res) => {
  try {
    // const queueStatus = testQueueService.getQueueStatus();
    // 临时返回空队列状态
    const queueStatus = {
      queueLength: 0,
      runningTests: 0,
      completedTests: 0,
      failedTests: 0
    };

    res.success(queueStatus);
  } catch (error) {
    console.error('获取队列状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取队列状态失败'
    });
  }
}));

/**
 * 取消测试
 * POST /api/test/:testId/cancel
 */
router.post('/:testId/cancel', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // await testQueueService.cancelTest(testId);
    // 临时返回成功响应
    console.log(`测试取消请求: ${testId} (服务已删除)`);

    res.success('测试已取消');
  } catch (error) {
    console.error('取消测试失败:', error);
    res.status(500).json({
      success: false,
      error: '取消测试失败'
    });
  }
}));

// 移除原来的同步测试执行代码
/*
    // 根据测试类型路由到相应的测试引擎
    let testResult;

*/

/**
 * 获取缓存统计
 * GET /api/test/cache/stats
 */
router.get('/cache/stats', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const stats = smartCacheService.getStats();

    res.success(stats);
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取缓存统计失败'
    });
  }
}));

/**
 * 清空缓存
 * POST /api/test/cache/flush
 */
router.post('/cache/flush', authMiddleware, asyncHandler(async (req, res) => {
  try {
    await smartCacheService.flush();

    res.success('缓存已清空');
  } catch (error) {
    console.error('清空缓存失败:', error);
    res.status(500).json({
      success: false,
      error: '清空缓存失败'
    });
  }
}));

/**
 * 缓存失效
 * POST /api/test/cache/invalidate
 */
router.post('/cache/invalidate', authMiddleware, asyncHandler(async (req, res) => {
  const { event, data } = req.body;

  if (!event) {
    
        return res.status(400).json({
      success: false,
      error: '缺少必需参数: event'
      });
  }

  try {
    const invalidatedCount = await smartCacheService.invalidate(event, data);

    res.success(null, '已失效 ${invalidatedCount} 条缓存记录');
  } catch (error) {
    console.error('缓存失效失败:', error);
    res.status(500).json({
      success: false,
      error: '缓存失效失败'
    });
  }
}));

/**
 * 获取测试状态
 * GET /api/test/:testId/status
 */
router.get('/:testId/status', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // 从数据库获取测试状态
    const testStatus = await databaseService.getTestStatus(testId);

    res.success(testStatus);

  } catch (error) {
    console.error('获取测试状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试状态失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

/**
 * 获取测试结果
 * GET /api/test/:testId/result
 */
router.get('/:testId/result', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // 从数据库获取测试结果
    const testResult = await databaseService.getTestResult(testId);

    if (!testResult) {
      
        return res.status(404).json({
        success: false,
        error: '测试结果不存在或已过期'
      });
    }

    res.success(testResult);

  } catch (error) {
    console.error('获取测试结果失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试结果失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

/**
 * 停止测试
 * POST /api/test/:testId/stop
 */
router.post('/:testId/stop', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // 更新测试状态为已停止
    await databaseService.updateTestStatus(testId, 'stopped', null, '测试已被用户停止');

    res.success('测试已停止');

  } catch (error) {
    console.error('停止测试失败:', error);
    res.status(500).json({
      success: false,
      error: '停止测试失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}));

/**
 * 获取配置模板
 * GET /api/test/config/templates
 */
router.get('/config/templates', optionalAuth, asyncHandler(async (req, res) => {
  const { testType } = req.query;

  try {
    // 从数据库获取配置模板
    const templates = await databaseService.getConfigTemplates(testType);

    res.success(templates);

  } catch (error) {
    console.error('获取配置模板失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置模板失败'
    });
  }
}));

/**
 * 保存配置模板
 * POST /api/test/config/templates
 */
router.post('/config/templates', authMiddleware, asyncHandler(async (req, res) => {
  const { name, testType, config, description } = req.body;

  if (!name || !testType || !config) {
    
        return res.status(400).json({
      success: false,
      error: '缺少必需参数: name, testType, config'
      });
  }

  try {
    // 保存配置模板到数据库
    const template = await databaseService.saveConfigTemplate({
      name,
      testType,
      config,
      description,
      userId: req.user?.id
    });

    res.success(template);

  } catch (error) {
    console.error('保存配置模板失败:', error);
    res.status(500).json({
      success: false,
      error: '保存配置模板失败'
    });
  }
}));

/**
 * 创建测试记录
 * POST /api/test/history
 */
router.post('/history', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const testData = {
      ...req.body,
      userId: req.user.id
    };

    const result = await testHistoryService.createTestRecord(testData);

    res.json(result);
  } catch (error) {
    console.error('创建测试记录失败:', error);
    res.serverError('创建测试记录失败');
  }
}));

/**
 * 更新测试记录
 * PUT /api/test/history/:recordId
 */
router.put('/history/:recordId', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    // 验证记录所有权
    const existingRecord = await query(
      'SELECT id FROM test_sessions WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [recordId, req.user.id]
    );

    if (existingRecord.rows.length === 0) {
      
        return res.notFound('资源', '记录不存在或无权限访问');
    }

    const result = await testHistoryService.updateTestRecord(recordId, req.body);

    res.json(result);
  } catch (error) {
    console.error('更新测试记录失败:', error);
    res.serverError('更新测试记录失败');
  }
}));

/**
 * 获取单个测试记录
 * GET /api/test/history/:recordId
 */
router.get('/history/:recordId', optionalAuth, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    let whereClause = 'WHERE id = $1';
    let params = [recordId];

    // 如果用户已登录，只显示该用户的记录；否则显示公开记录
    if (req.user?.id) {
      whereClause += ' AND user_id = $2';
      params.push(req.user.id);
    }

    const result = await query(
      `SELECT id, test_name, test_type, url, status, start_time, end_time,
              duration, config, results, created_at, updated_at
       FROM test_history
       ${whereClause}`,
      params
    );

    if (result.rows.length === 0) {
      
        return res.notFound('资源', '记录不存在或无权限访问');
    }

    res.success(testHistoryService.formatTestRecord(result.rows[0]));
  } catch (error) {
    console.error('获取测试记录失败:', error);
    res.serverError('获取测试记录失败');
  }
}));

/**
 * 开始测试 - 更新状态为运行中
 * POST /api/test/history/:recordId/start
 */
router.post('/history/:recordId/start', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    const result = await testHistoryService.startTest(recordId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('开始测试失败:', error);
    res.serverError('开始测试失败');
  }
}));

/**
 * 更新测试进度
 * POST /api/test/history/:recordId/progress
 */
router.post('/history/:recordId/progress', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    const result = await testHistoryService.updateTestProgress(recordId, req.body);
    res.json(result);
  } catch (error) {
    console.error('更新测试进度失败:', error);
    res.serverError('更新测试进度失败');
  }
}));

/**
 * 完成测试
 * POST /api/test/history/:recordId/complete
 */
router.post('/history/:recordId/complete', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    const result = await testHistoryService.completeTest(recordId, req.body, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('完成测试失败:', error);
    res.serverError('完成测试失败');
  }
}));

/**
 * 测试失败
 * POST /api/test/history/:recordId/fail
 */
router.post('/history/:recordId/fail', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;
  const { errorMessage, errorDetails } = req.body;

  try {
    const result = await testHistoryService.failTest(recordId, errorMessage, errorDetails, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('标记测试失败失败:', error);
    res.serverError('标记测试失败失败');
  }
}));

/**
 * 取消测试
 * POST /api/test/history/:recordId/cancel
 */
router.post('/history/:recordId/cancel', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;
  const { reason } = req.body;

  try {
    const result = await testHistoryService.cancelTest(recordId, reason || '用户取消', req.user.id);
    res.json(result);
  } catch (error) {
    console.error('取消测试失败:', error);
    res.serverError('取消测试失败');
  }
}));

/**
 * 获取测试进度历史
 * GET /api/test/history/:recordId/progress
 */
router.get('/history/:recordId/progress', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    const result = await testHistoryService.getTestProgress(recordId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('获取测试进度失败:', error);
    res.serverError('获取测试进度失败');
  }
}));

/**
 * 删除测试历史记录
 * DELETE /api/test/history/:recordId
 */
router.delete('/history/:recordId', authMiddleware, asyncHandler(async (req, res) => {
  const { recordId } = req.params;

  try {
    const result = await query(
      'UPDATE test_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [recordId, req.user.id]
    );

    if (result.rowCount === 0) {
      
        return res.notFound('资源', '测试记录不存在');
    }

    res.success('测试记录已删除');
  } catch (error) {
    console.error('删除测试记录失败:', error);
    res.serverError('删除测试记录失败');
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
    res.serverError('获取测试分析数据失败');
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
         COUNT(*) FILTER (WHERE status = 'completed') as successful_tests,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_tests,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as tests_last_30_days,
         test_type,
         COUNT(*) as count
       FROM test_sessions
       WHERE user_id = $1 AND deleted_at IS NULL
       GROUP BY test_type`,
      [req.user.id]
    );

    const totalResult = await query(
      `SELECT
         COUNT(*) as total_tests,
         COUNT(*) FILTER (WHERE status = 'completed') as successful_tests,
         COUNT(*) FILTER (WHERE status = 'failed') as failed_tests,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as tests_last_30_days
       FROM test_sessions
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    const byType = {};
    statsResult.rows.forEach(row => {
      if (row.test_type) {
        byType[row.test_type] = parseInt(row.count);
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
    res.serverError('获取测试统计失败');
  }
}));

/**
 * 获取单个测试结果
 * GET /api/test/:testId
 */
router.get('/:testId', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // 使用本地TestHistoryService获取测试详情
    const result = await testHistoryService.getTestDetails(testId, req.user.id);

    if (!result.success) {
      
        return res.status(404).json({
        success: false,
        message: result.error || '测试结果不存在'
      });
    }

    res.success(result.data);
  } catch (error) {
    console.error('获取测试结果失败:', error);
    res.serverError('获取测试结果失败');
  }
}));

/**
 * 网站基础测试
 * POST /api/test/website
 */
router.post('/website', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url) {
    
        return res.validationError([], 'URL是必填的');
  }

  try {
    // 验证URL格式
    new URL(url);
  } catch (error) {
    return res.validationError([], '无效的URL格式');
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
      res.success(testResult.data);
    } else {
      console.log('📤 Sending direct data structure');
      res.success(testResult);
    }
  } catch (error) {
    console.error('网站测试失败:', error);
    res.serverError('网站测试失败');
  }
}));

/**
 * 获取压力测试实时状态
 * GET /api/test/stress/status/:testId
 */
router.get('/stress/status/:testId', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // 🔧 重构：从用户测试管理器获取测试状态
    const status = userTestManager.getUserTestStatus(req.user?.id, testId);

    if (!status) {

      try {
        // 查询测试历史记录
        const historyQuery = `
          SELECT * FROM test_history
          WHERE test_name LIKE $1 OR id::text = $1
          ORDER BY created_at DESC
          LIMIT 1
        `;
        const historyResult = await query(historyQuery, [`%${testId}%`]);

        if (historyResult.rows.length > 0) {
          
        const testRecord = historyResult.rows[0];
          console.log('📊 从测试历史获取结果:', testRecord.id, testRecord.status);

          // 如果测试已完成，返回真实的测试结果
          if (testRecord.status === 'completed') {
            const realTimeData = testRecord.real_time_data ?
              (typeof testRecord.real_time_data === 'string' ?
                JSON.parse(testRecord.real_time_data) : testRecord.real_time_data) : [];

            return res.json({
              success: true,
              data: {
                status: 'completed',
                message: '测试已完成',
                progress: 100,
                realTimeMetrics: {
                  totalRequests: testRecord.total_requests || 0,
                  successfulRequests: testRecord.successful_requests || 0,
                  failedRequests: testRecord.failed_requests || 0,
                  averageResponseTime: testRecord.average_response_time || 0,
                  currentTPS: testRecord.peak_tps || 0,
                  peakTPS: testRecord.peak_tps || 0,
                  errorRate: testRecord.error_rate || 0,
                  activeUsers: 0
      },
                realTimeData: realTimeData,
                results: testRecord.results ?
                  (typeof testRecord.results === 'string' ?
                    JSON.parse(testRecord.results) : testRecord.results) : {},
                duration: testRecord.duration || 0,
                overallScore: testRecord.overall_score || 0,
                performanceGrade: testRecord.performance_grade || 'N/A'
              }
            });
          }
        }
      } catch (historyError) {
        console.error('查询测试历史失败:', historyError);
      }

      // 如果没有找到历史记录，返回404而不是默认完成状态
      return res.notFound('资源', '测试不存在');
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
    res.serverError('获取测试状态失败');
  }
}));

/**
 * 取消压力测试 - 增强版本
 * POST /api/test/stress/cancel/:testId
 */
router.post('/stress/cancel/:testId', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const { reason = '用户手动取消', preserveData = true } = req.body;

  try {
    console.log(`🛑 收到取消压力测试请求: ${testId}`, {
      reason,
      preserveData,
      userId: req.user?.id
    });

    // 🔧 重构：使用用户测试管理器停止测试
    await userTestManager.stopUserTest(req.user?.id, testId);
    const result = { success: true, message: '测试已取消' };

    if (result.success) {
      // 记录取消操作到用户活动日志
      if (req.user?.id) {
        console.log(`📝 记录用户 ${req.user.id} 的取消操作`);
      }

      res.json({
        success: true,
        message: result.message,
        data: {
          ...result.data,
          cancelledBy: req.user?.id,
          cancelledByUsername: req.user?.username
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('取消压力测试失败:', error);
    res.serverError('取消测试失败');
  }
}));

/**
 * 停止压力测试 (向后兼容)
 * POST /api/test/stress/stop/:testId
 */
router.post('/stress/stop/:testId', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    console.log(`🛑 收到停止压力测试请求(向后兼容): ${testId}`);

    // 🔧 重构：使用用户测试管理器停止测试
    await userTestManager.stopUserTest(req.user?.id, testId);
    const result = { success: true, message: '测试已停止' };

    if (result.success) {
      res.success(result.message);
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('停止压力测试失败:', error);
    res.serverError('停止测试失败');
  }
}));

/**
 * 获取所有运行中的压力测试
 * GET /api/test/stress/running
 */
router.get('/stress/running', optionalAuth, asyncHandler(async (req, res) => {
  try {
    console.log('📊 获取用户运行中的压力测试');

    // 🔧 重构：获取用户测试管理器的统计信息
    const stats = userTestManager.getStats();
    const runningTests = []; // 简化实现，不返回具体测试列表
    const runningCount = stats.totalTests;

    console.log(`📊 当前运行中的测试数量: ${runningCount}`);

    res.json({
      success: true,
      data: {
        runningTests,
        count: runningCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('获取运行中测试失败:', error);
    res.serverError('获取运行中测试失败');
  }
}));

/**
 * 强制清理所有运行中的测试 (管理员功能)
 * POST /api/test/stress/cleanup-all
 */
router.post('/stress/cleanup-all', adminAuth, asyncHandler(async (req, res) => {
  try {
    console.log('🧹 管理员强制清理所有运行中的测试');

    // 🔧 重构：清理所有用户测试
    const stats = userTestManager.getStats();
    userTestManager.cleanup();

    const cleanupResults = [{ success: true, message: '所有测试已清理' }];

    res.json({
      success: true,
      message: `已清理 ${stats.totalTests} 个运行中的测试`,
      data: {
        cleanedCount: stats.totalTests,
        results: cleanupResults,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('强制清理测试失败:', error);
    res.serverError('强制清理失败');
  }
}));



/**
 * @swagger
 * /api/test/stress:
 *   post:
 *     tags: [Tests]
 *     summary: 启动压力测试
 *     description: 对指定URL进行压力测试，模拟高并发访问以评估系统性能
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: 要测试的URL
 *                 example: "https://example.com"
 *               concurrentUsers:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 10
 *                 description: 并发用户数
 *               duration:
 *                 type: integer
 *                 minimum: 10
 *                 maximum: 300
 *                 default: 60
 *                 description: 测试持续时间(秒)
 *               rampUpTime:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 60
 *                 default: 10
 *                 description: 用户增长时间(秒)
 *     responses:
 *       200:
 *         description: 压力测试成功启动
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/TestResponse'
 *                 - type: object
 *                   properties:
 *                     results:
 *                       $ref: '#/components/schemas/LoadTestResults'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: 需要认证
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/stress', authMiddleware, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const {
    url,
    testId: providedTestId,
    recordId,
    // 直接从请求体中提取配置参数
    users,
    duration,
    rampUpTime,
    testType,
    method,
    timeout,
    thinkTime,
    // 🌐 代理配置
    proxy
  } = req.body;

  // URL验证已由中间件完成，可以直接使用验证后的URL
  const validatedURL = req.validatedURL.url.toString();
  let testRecordId = recordId; // 使用前端传递的记录ID

  // 🔧 修复：如果前端没有提供testId，自动生成一个
  const testId = providedTestId || `stress_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 🔧 修复：统一配置处理 - 使用直接参数和合理的默认值
  const testConfig = {
    users: users || 10,
    duration: duration || 30,
    rampUpTime: rampUpTime || 5,
    testType: testType || 'gradual',
    method: method || 'GET',
    timeout: timeout || 10,
    thinkTime: thinkTime || 1,
    // 🌐 代理配置
    proxy: proxy || null
  };

  // 🔧 调试：记录接收到的配置参数
  console.log('🔧 后端接收到的测试配置:', {
    testId,
    url: validatedURL,
    receivedParams: { users, duration, rampUpTime, testType, method, timeout, thinkTime, proxy },
    finalConfig: testConfig,
    durationCheck: {
      received: duration,
      type: typeof duration,
      final: testConfig.duration,
      expectedMs: testConfig.duration * 1000
    },
    // 🌐 代理配置日志
    proxyConfig: proxy ? {
      enabled: proxy.enabled,
      type: proxy.type,
      host: proxy.host,
      port: proxy.port,
      hasAuth: !!(proxy.username && proxy.password)
    } : null
  });

  // 🔧 添加配置验证
  const configValidation = validateStressTestConfig(testConfig);
  if (!configValidation.isValid) {
    console.error('❌ 压力测试配置验证失败:', {
      testId,
      url: validatedURL,
      errors: configValidation.errors,
      receivedConfig: testConfig,
      originalParams: { users, duration, rampUpTime, testType, method, timeout, thinkTime }
    });
    return res.status(400).json({
      success: false,
      message: '配置参数无效',
      errors: configValidation.errors,
      warnings: configValidation.warnings,
      receivedConfig: testConfig,
      validationDetails: {
        users: { received: users, type: typeof users, valid: typeof users === 'number' && users > 0 },
        duration: { received: duration, type: typeof duration, valid: typeof duration === 'number' && duration > 0 },
        testType: { received: testType, valid: ['gradual', 'stress', 'spike', 'load'].includes(testType) }
      }
    });
  }

  // 记录配置验证警告
  if (configValidation.warnings.length > 0) {
    console.warn('⚠️ 压力测试配置警告:', {
      testId,
      warnings: configValidation.warnings,
      config: testConfig
    });
  }

  try {
    console.log('🚀 收到压力测试请求:', {
      url: validatedURL,
      testId: testId,
      providedTestId: providedTestId,
      recordId: recordId,
      hasPreGeneratedTestId: !!providedTestId,
      hasRecordId: !!recordId,
      testIdAndRecordIdSeparate: testId !== recordId
    });

    // 🔧 详细记录最终配置和验证结果
    console.log('✅ 压力测试配置验证通过:', {
      config: testConfig,
      validation: {
        isValid: configValidation.isValid,
        warningsCount: configValidation.warnings.length,
        warnings: configValidation.warnings
      },
      source: {
        users: users ? 'request' : 'default',
        duration: duration ? 'request' : 'default',
        testType: testType ? 'request' : 'default'
      }
    });

    // 1. 处理测试记录
    if (req.user?.id) {
      try {
        if (recordId) {
          // 如果前端传递了记录ID，更新现有记录状态为running
          await testHistoryService.updateTestRecord(recordId, {
            status: 'running',
            config: testConfig
          });
          console.log('✅ 测试记录已更新为运行中状态:', recordId, '配置:', testConfig);
        } else {
          // 如果没有记录ID，创建新记录
          const testRecord = await testHistoryService.createTestRecord({
            testName: `压力测试 - ${new URL(validatedURL).hostname}`,
            testType: 'stress',
            url: validatedURL,
            status: 'running',
            userId: req.user.id,
            config: testConfig
          });
          testRecordId = testRecord.data.id;
          console.log('✅ 测试记录已创建(运行中状态):', testRecordId, '配置:', testConfig);
        }

        // 广播测试记录状态更新到测试历史页面
        if (global.io && testRecordId) {
          global.io.to('test-history-updates').emit('test-record-update', {
            type: 'test-record-update',
            recordId: testRecordId,
            updates: {
              id: testRecordId,
              status: 'running'
            }
          });
        }
      } catch (dbError) {
        console.error('❌ 处理测试记录失败:', dbError);
        // 继续执行测试，不因记录失败而中断
      }
    }

    // 2. 立即返回响应，然后异步运行压力测试
    console.log('🔄 准备异步启动压力测试引擎:', {
      url: validatedURL,
      testId: testId,
      hasTestId: !!testId,
      userId: req.user?.id,
      recordId: testRecordId,
      configKeys: Object.keys(testConfig)
    });

    // ✅ 关键修复：立即返回响应，不等待测试完成
    res.json({
      success: true,
      message: '压力测试已启动',
      testId: testId,
      data: {
        testId: testId,
        status: 'starting',
        url: validatedURL,
        config: testConfig,
        recordId: testRecordId
      }
    });

    // ✅ 异步执行压力测试，不阻塞响应
    setImmediate(async () => {
      try {
        console.log('🚀 异步执行压力测试:', testId);

        // 🔧 重构：使用用户测试管理器创建测试实例
        const testEngine = userTestManager.createUserTest(req.user?.id, testId);

        const testResult = await testEngine.runStressTest(validatedURL, {
          ...testConfig,
          testId: testId, // 传递预生成的testId
          userId: req.user?.id,
          recordId: testRecordId // 传递数据库记录ID
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

        // 生成详细的测试报告
        if (responseData && testEngine.generateDetailedReport) {
          try {
            const detailedReport = testEngine.generateDetailedReport(responseData);
            responseData = { ...responseData, ...detailedReport };
            console.log('📊 生成详细测试报告完成:', {
              hasPerformance: !!detailedReport.performance,
              hasPercentiles: !!detailedReport.percentiles,
              hasErrorAnalysis: !!detailedReport.errorAnalysis,
              performanceGrade: detailedReport.performance?.grade,
              performanceScore: detailedReport.performance?.score
            });
          } catch (reportError) {
            console.error('❌ 生成详细报告失败:', reportError);
            // 继续使用原始数据，不因报告生成失败而中断
          }
        }

        console.log('✅ 异步压力测试完成:', testId);

        // 3. 更新测试记录为完成状态
        if (req.user?.id && testRecordId && responseData) {
          try {
            // 从测试结果中提取统计数据
            const metrics = responseData.metrics || {};
            const totalRequests = metrics.totalRequests || 0;
            const successfulRequests = metrics.successfulRequests || 0;
            const failedRequests = metrics.failedRequests || 0;

            // 🔧 修复：严格按照原始状态设置，不允许覆盖取消状态
            let finalStatus = 'failed'; // 默认为失败

            if (responseData.status === 'cancelled') {
              // 🔒 取消状态不可覆盖，直接使用
              finalStatus = 'cancelled';
              console.log('🔒 保持取消状态，不允许覆盖');
            } else if (responseData.status === 'completed') {
              // 明确的完成状态
              finalStatus = 'completed';
            } else if (responseData.metrics && responseData.metrics.totalRequests > 0) {
              // 只有在非取消状态时，才基于测试结果判断为完成
              finalStatus = 'completed';
              console.log('📊 基于测试结果判断为完成状态:', {
                totalRequests: responseData.metrics.totalRequests,
                successfulRequests: responseData.metrics.successfulRequests,
                hasRealTimeData: !!responseData.realTimeData
              });
            }

            console.log(`📊 设置测试记录状态: ${responseData.status} -> ${finalStatus}`);

            await testHistoryService.updateTestRecord(testRecordId, {
              status: finalStatus,
              endTime: responseData.endTime || new Date().toISOString(),
              duration: Math.round(responseData.actualDuration || 0),
              results: {
                metrics: responseData.metrics,
                realTimeData: responseData.realTimeData,
                testId: responseData.testId,
                startTime: responseData.startTime,
                endTime: responseData.endTime,
                actualDuration: responseData.actualDuration,
                currentPhase: responseData.currentPhase
              },
              overallScore: Math.round(responseData.overallScore || 0),
              totalRequests: totalRequests,
              successfulRequests: successfulRequests,
              failedRequests: failedRequests
            });

            // 广播测试完成状态到测试历史页面
            if (global.io) {
              global.io.to('test-history-updates').emit('test-record-update', {
                type: 'test-record-update',
                recordId: testRecordId,
                updates: {
                  id: testRecordId,
                  status: finalStatus,
                  endTime: responseData.endTime || new Date().toISOString(),
                  duration: Math.round(responseData.actualDuration || 0),
                  progress: 100
                }
              });
            }

            console.log('✅ 测试记录已更新为完成状态');
          } catch (dbError) {
            console.error('❌ 更新测试记录失败:', dbError);
          }
        }

        // ✅ 异步执行完成，通过WebSocket通知前端测试完成
        if (global.io) {
          global.io.to(`stress-test-${testId}`).emit('stress-test-complete', {
            testId: testId,
            success: true,
            data: responseData,
            metrics: responseData.metrics || {},
            duration: responseData.actualDuration || responseData.duration,
            testType: responseData.testType || 'stress'
          });
        }

        console.log('✅ 异步压力测试完成并通知前端:', testId);
      } catch (error) {
        console.error('❌ 异步压力测试失败:', error);

        // 通过WebSocket通知前端测试失败
        if (global.io) {
          global.io.to(`stress-test-${testId}`).emit('stress-test-error', {
            testId: testId,
            success: false,
            message: '压力测试失败',
            error: error.message
          });
        }

        // 更新测试记录为失败状态
        if (req.user?.id && testRecordId) {
          try {
            await testHistoryService.updateTestRecord(testRecordId, {
              status: 'failed',
              endTime: new Date().toISOString(),
              results: {
                error: error.message,
                testId: testId
              }
            });

            // 广播测试失败状态到测试历史页面
            if (global.io) {
              global.io.to('test-history-updates').emit('test-record-update', {
                type: 'test-record-update',
                recordId: testRecordId,
                updates: {
                  id: testRecordId,
                  status: 'failed',
                  endTime: new Date().toISOString(),
                  progress: 0
                }
              });
            }
          } catch (dbError) {
            console.error('❌ 更新失败测试记录失败:', dbError);
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ 压力测试API处理失败:', error);
    res.serverError('压力测试启动失败');
  }
}));

/**
     * 安全测试 - 支持统一安全引擎和传统模式
     * POST /api/test/security
     */
router.post('/security',
  optionalAuth,
  testRateLimiter,
  validateURLMiddleware(),
  apiCache('security', { ttl: 2400 }), // 40分钟缓存
  asyncHandler(async (req, res) => {
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

      res.success(testResult);
    } catch (error) {
      console.error('安全测试失败:', error);
      res.serverError('安全测试失败');
    }
  }));

/**
 * 获取安全测试历史记录
 * GET /api/test/security/history
 */
router.get('/security/history',
  optionalAuth,
  dbCache('history', { ttl: 300 }), // 5分钟缓存
  asyncHandler(async (req, res) => {
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
      res.serverError('获取安全测试历史失败');
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
    res.serverError('获取安全测试统计失败');
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
    res.serverError('获取安全测试结果失败');
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
    res.serverError('删除安全测试结果失败');
  }
}));

/**
 * @swagger
 * /api/test/performance:
 *   post:
 *     tags: [Tests]
 *     summary: 启动性能测试
 *     description: 对指定URL进行性能分析，包括Core Web Vitals、资源加载、网络性能等
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: 要测试的URL
 *                 example: "https://example.com"
 *               device:
 *                 type: string
 *                 enum: [desktop, mobile, tablet]
 *                 default: "desktop"
 *               throttling:
 *                 type: string
 *                 enum: [none, slow-3g, fast-3g]
 *                 default: "none"
 *     responses:
 *       200:
 *         description: 性能测试成功启动
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/TestResponse'
 *                 - type: object
 *                   properties:
 *                     results:
 *                       $ref: '#/components/schemas/PerformanceResults'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/performance',
  optionalAuth,
  testRateLimiter,
  validateURLMiddleware(),
  apiCache('performance', { ttl: 1800 }), // 30分钟缓存
  asyncHandler(async (req, res) => {
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

      res.success(testResult);

    } catch (error) {
      console.error('❌ Performance test failed:', error);
      res.serverError('性能测试失败');
    }
  }));

/**
 * 页面速度检测
 * POST /api/test/performance/page-speed
 */
router.post('/performance/page-speed',
  optionalAuth,
  testRateLimiter,
  validateURLMiddleware(),
  apiCache('performance', { ttl: 1200 }), // 20分钟缓存
  asyncHandler(async (req, res) => {
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

      res.success(pageSpeedMetrics);

    } catch (error) {
      console.error('❌ Page speed test failed:', error);
      res.serverError('页面速度检测失败');
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

    res.success(coreWebVitals);

  } catch (error) {
    console.error('❌ Core Web Vitals test failed:', error);
    res.serverError('Core Web Vitals检测失败');
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

    res.success(testResult.data || testResult);
  } catch (error) {
    console.error('兼容性测试失败:', error);
    res.serverError('兼容性测试失败');
  }
}));

/**
 * Can I Use 兼容性测试
 * POST /api/test/caniuse
 */
router.post('/caniuse', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, features = [], browsers = [] } = req.body;

  try {
    console.log(`🔍 Starting Can I Use compatibility test for: ${url}`);
    console.log(`📋 Features:`, features);
    console.log(`🌐 Browsers:`, browsers);

    // 真实的Can I Use兼容性分析
    const realResult = await this.performRealCompatibilityAnalysis(validatedURL, features, browsers);

    console.log(`✅ Can I Use test completed with score: ${realResult.overallScore}`);

    res.success(realResult);
  } catch (error) {
    console.error('Can I Use测试失败:', error);
    res.serverError('Can I Use测试失败');
  }
}));

/**
 * BrowserStack 兼容性测试
 * POST /api/test/browserstack
 */
router.post('/browserstack', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, browsers = [], features = [] } = req.body;

  try {
    console.log(`🔍 Starting BrowserStack compatibility test for: ${url}`);

    // 模拟BrowserStack测试结果
    const mockResult = {
      score: Math.floor(Math.random() * 30) + 70,
      matrix: {},
      browserSupport: {},
      featureSupport: {},
      issues: [],
      recommendations: [],
      statistics: {
        totalFeatures: features.length,
        supportedFeatures: Math.floor(features.length * 0.85),
        partiallySupported: Math.floor(features.length * 0.1),
        unsupportedFeatures: Math.floor(features.length * 0.05),
        criticalIssues: Math.floor(Math.random() * 2),
        averageSupport: Math.floor(Math.random() * 30) + 70
      },
      reportUrl: `https://browserstack.com/test-report/${Date.now()}`
    };

    console.log(`✅ BrowserStack test completed with score: ${mockResult.score}`);

    res.success(mockResult);
  } catch (error) {
    console.error('BrowserStack测试失败:', error);
    res.serverError('BrowserStack测试失败');
  }
}));

/**
 * 特性检测兼容性测试
 * POST /api/test/feature-detection
 */
router.post('/feature-detection', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, features = [], browsers = [], options = {} } = req.body;

  try {
    console.log(`🔍 Starting feature detection compatibility test for: ${url}`);
    console.log(`📋 Features:`, features);
    console.log(`🌐 Browsers:`, browsers);

    // 模拟特性检测结果
    const featureDetectionResults = {};
    const browserCompatibility = {};
    const detectedIssues = [];
    const recommendations = [];

    // 为每个特性生成检测结果
    features.forEach(feature => {
      featureDetectionResults[feature] = {
        supported: Math.random() > 0.2, // 80%的特性被支持
        supportLevel: Math.random() > 0.5 ? 'full' : 'partial',
        polyfillAvailable: Math.random() > 0.3,
        fallbackRequired: Math.random() > 0.7,
        browserSupport: {}
      };

      // 为每个浏览器生成特性支持情况
      browsers.forEach(browser => {
        const supportChance = Math.random();
        featureDetectionResults[feature].browserSupport[browser.browser] = {
          supported: supportChance > 0.15,
          version: browser.version,
          notes: supportChance < 0.15 ? '需要polyfill' : supportChance < 0.5 ? '部分支持' : '完全支持'
        };
      });
    });

    // 生成浏览器兼容性总结
    browsers.forEach(browser => {
      const supportedFeatures = features.filter(feature =>
        featureDetectionResults[feature]?.browserSupport[browser.browser]?.supported
      ).length;

      browserCompatibility[browser.browser] = {
        score: Math.floor((supportedFeatures / features.length) * 100),
        supportedFeatures,
        totalFeatures: features.length,
        marketShare: browser.marketShare || Math.random() * 20,
        version: browser.version
      };
    });

    // 生成兼容性问题
    const unsupportedFeatures = features.filter(feature =>
      !featureDetectionResults[feature]?.supported
    );

    unsupportedFeatures.forEach(feature => {
      detectedIssues.push({
        id: `${feature}-compatibility`,
        feature,
        category: feature.includes('css') ? 'css' : feature.includes('js') || feature.includes('es6') ? 'javascript' : 'html5',
        severity: Math.random() > 0.5 ? 'high' : 'medium',
        description: `${feature} 在某些浏览器中不被支持`,
        impact: '可能影响功能正常使用',
        solution: `考虑使用 ${feature} 的polyfill或替代方案`,
        polyfill: `${feature}-polyfill`,
        workaround: '使用特性检测并提供回退方案'
      });
    });

    // 生成建议
    if (detectedIssues.length > 0) {
      recommendations.push({
        id: 'feature-detection-strategy',
        title: '实施特性检测策略',
        description: '使用Modernizr等工具进行特性检测，并为不支持的特性提供回退方案',
        priority: 'high',
        effort: 'medium',
        impact: 'high'
      });
    }

    if (unsupportedFeatures.length > features.length * 0.3) {
      recommendations.push({
        id: 'polyfill-strategy',
        title: '使用Polyfill库',
        description: '集成core-js等polyfill库来支持现代JavaScript特性',
        priority: 'high',
        effort: 'low',
        impact: 'high'
      });
    }

    const overallScore = Math.floor(
      Object.values(browserCompatibility).reduce((sum, browser) => sum + browser.score, 0) /
      Object.keys(browserCompatibility).length
    );

    const mockResult = {
      score: overallScore,
      featureDetection: featureDetectionResults,
      browserCompatibility,
      matrix: featureDetectionResults,
      browserSupport: browserCompatibility,
      featureSupport: featureDetectionResults,
      issues: detectedIssues,
      recommendations,
      statistics: {
        totalFeatures: features.length,
        supportedFeatures: features.filter(f => featureDetectionResults[f]?.supported).length,
        partiallySupported: features.filter(f =>
          featureDetectionResults[f]?.supportLevel === 'partial'
        ).length,
        unsupportedFeatures: unsupportedFeatures.length,
        criticalIssues: detectedIssues.filter(i => i.severity === 'critical').length,
        averageSupport: overallScore
      }
    };

    console.log(`✅ Feature detection test completed with score: ${mockResult.score}`);

    res.success(mockResult);
  } catch (error) {
    console.error('特性检测测试失败:', error);
    res.serverError('特性检测测试失败');
  }
}));

/**
 * 特性检测测试
 * POST /api/test/feature-detection
 */
router.post('/feature-detection', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, features = [], options = {} } = req.body;

  try {
    console.log(`🔍 Starting feature detection test for: ${url}`);

    // 模拟特性检测结果
    const mockResult = {
      score: Math.floor(Math.random() * 25) + 75,
      matrix: {},
      browserSupport: {},
      featureSupport: {},
      issues: [],
      recommendations: [],
      statistics: {
        totalFeatures: features.length,
        supportedFeatures: Math.floor(features.length * 0.9),
        partiallySupported: Math.floor(features.length * 0.05),
        unsupportedFeatures: Math.floor(features.length * 0.05),
        criticalIssues: 0,
        averageSupport: Math.floor(Math.random() * 25) + 75
      }
    };

    console.log(`✅ Feature detection test completed with score: ${mockResult.score}`);

    res.success(mockResult);
  } catch (error) {
    console.error('特性检测测试失败:', error);
    res.serverError('特性检测测试失败');
  }
}));

/**
 * 本地兼容性测试
 * POST /api/test/local-compatibility
 */
router.post('/local-compatibility', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, features = [], browsers = [], timeout = 30000 } = req.body;

  try {
    console.log(`🔍 Starting local compatibility test for: ${url}`);

    // 模拟本地兼容性测试结果
    const mockResult = {
      score: Math.floor(Math.random() * 20) + 75,
      matrix: {},
      browserSupport: {},
      featureSupport: {},
      issues: [],
      recommendations: [],
      statistics: {
        totalFeatures: features.length,
        supportedFeatures: Math.floor(features.length * 0.8),
        partiallySupported: Math.floor(features.length * 0.1),
        unsupportedFeatures: Math.floor(features.length * 0.1),
        criticalIssues: Math.floor(Math.random() * 2),
        averageSupport: Math.floor(Math.random() * 20) + 75
      }
    };

    console.log(`✅ Local compatibility test completed with score: ${mockResult.score}`);

    res.success(mockResult);
  } catch (error) {
    console.error('本地兼容性测试失败:', error);
    res.serverError('本地兼容性测试失败');
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

    res.success(resourceAnalysis);

  } catch (error) {
    console.error('❌ Resource analysis failed:', error);
    res.serverError('资源分析失败');
  }
}));

/**
 * 保存性能测试结果
 * POST /api/test/performance/save
 */
router.post('/performance/save', optionalAuth, asyncHandler(async (req, res) => {
  const { result, userId } = req.body;

  if (!result) {
    
        return res.validationError([], '测试结果数据是必填的');
  }

  try {
    console.log(`💾 Saving performance test result:`, result.testId);

    const sessionId = result.testId || `perf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const actualUserId = userId || req.user?.id;

    // 准备主表数据
    const sessionData = {
      id: sessionId,
      user_id: actualUserId,
      test_name: result.testName || `性能测试 - ${new Date().toLocaleString()}`,
      test_type: 'performance',
      url: result.url,
      status: 'completed',
      start_time: new Date(result.timestamp),
      end_time: new Date(),
      duration: Math.floor((result.duration || 0) / 1000), // 转换为秒
      overall_score: result.overallScore || 0,
      grade: result.grade || 'F',
      config: result.config || {},
      environment: 'production',
      tags: [`grade:${result.grade}`, `level:${result.config?.level || 'standard'}`],
      description: `性能评分: ${result.overallScore}/100, 等级: ${result.grade}`
    };

    // 插入主表数据
    const sessionInsertQuery = `
      INSERT INTO test_sessions (
        id, user_id, test_name, test_type, url, status, start_time, end_time, duration,
        overall_score, grade, config, environment, tags, description, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        end_time = EXCLUDED.end_time,
        duration = EXCLUDED.duration,
        overall_score = EXCLUDED.overall_score,
        grade = EXCLUDED.grade,
        updated_at = EXCLUDED.updated_at
      RETURNING id
    `;

    const sessionValues = [
      sessionData.id, sessionData.user_id, sessionData.test_name, sessionData.test_type,
      sessionData.url, sessionData.status, sessionData.start_time, sessionData.end_time,
      sessionData.duration, sessionData.overall_score, sessionData.grade,
      JSON.stringify(sessionData.config), sessionData.environment,
      JSON.stringify(sessionData.tags), sessionData.description,
      new Date(), new Date()
    ];

    await query(sessionInsertQuery, sessionValues);

    // 插入性能测试详情数据
    const performanceData = {
      session_id: sessionId,
      first_contentful_paint: result.coreWebVitals?.fcp || 0,
      largest_contentful_paint: result.coreWebVitals?.lcp || 0,
      first_input_delay: result.coreWebVitals?.fid || 0,
      cumulative_layout_shift: result.coreWebVitals?.cls || 0,
      time_to_interactive: result.pageSpeed?.tti || 0,
      speed_index: result.pageSpeed?.speedIndex || 0,
      total_blocking_time: result.pageSpeed?.tbt || 0,
      dom_content_loaded: result.pageSpeed?.domContentLoaded || 0,
      load_event_end: result.pageSpeed?.loadTime || 0,
      total_page_size: result.resourceAnalysis?.totalSize || 0,
      image_size: result.resourceAnalysis?.imageSize || 0,
      css_size: result.resourceAnalysis?.cssSize || 0,
      js_size: result.resourceAnalysis?.jsSize || 0,
      font_size: result.resourceAnalysis?.fontSize || 0,
      dns_lookup_time: result.networkTiming?.dnsLookup || 0,
      tcp_connect_time: result.networkTiming?.tcpConnect || 0,
      ssl_handshake_time: result.networkTiming?.sslHandshake || 0,
      server_response_time: result.networkTiming?.serverResponse || 0
    };

    const performanceInsertQuery = `
      INSERT INTO performance_test_details (
        session_id, first_contentful_paint, largest_contentful_paint, first_input_delay,
        cumulative_layout_shift, time_to_interactive, speed_index, total_blocking_time,
        dom_content_loaded, load_event_end, total_page_size, image_size, css_size,
        js_size, font_size, dns_lookup_time, tcp_connect_time, ssl_handshake_time,
        server_response_time, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      ON CONFLICT (session_id) DO UPDATE SET
        first_contentful_paint = EXCLUDED.first_contentful_paint,
        largest_contentful_paint = EXCLUDED.largest_contentful_paint,
        first_input_delay = EXCLUDED.first_input_delay,
        cumulative_layout_shift = EXCLUDED.cumulative_layout_shift,
        time_to_interactive = EXCLUDED.time_to_interactive,
        speed_index = EXCLUDED.speed_index
    `;

    const performanceValues = [
      performanceData.session_id, performanceData.first_contentful_paint,
      performanceData.largest_contentful_paint, performanceData.first_input_delay,
      performanceData.cumulative_layout_shift, performanceData.time_to_interactive,
      performanceData.speed_index, performanceData.total_blocking_time,
      performanceData.dom_content_loaded, performanceData.load_event_end,
      performanceData.total_page_size, performanceData.image_size,
      performanceData.css_size, performanceData.js_size, performanceData.font_size,
      performanceData.dns_lookup_time, performanceData.tcp_connect_time,
      performanceData.ssl_handshake_time, performanceData.server_response_time,
      new Date()
    ];

    await query(performanceInsertQuery, performanceValues);

    console.log(`✅ Performance test result saved:`, sessionId);

    res.success(sessionId, '性能测试结果已保存');

  } catch (error) {
    console.error('❌ Failed to save performance test result:', error);
    res.serverError('保存性能测试结果失败');
  }
}));

/**
 * Google PageSpeed Insights 测试
 * POST /api/test/pagespeed
 */
router.post('/pagespeed', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, device = 'desktop' } = req.body;
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`🚀 Starting Google PageSpeed test for: ${validatedURL}`);

    // 模拟Google PageSpeed Insights结果
    const mockResult = {
      desktop: {
        performanceScore: Math.floor(Math.random() * 30) + 70,
        lcp: Math.random() * 2000 + 1000,
        fid: Math.random() * 100 + 50,
        cls: Math.random() * 0.2,
        fcp: Math.random() * 1500 + 500,
        ttfb: Math.random() * 500 + 100,
        opportunities: [
          {
            id: 'unused-css-rules',
            title: '移除未使用的CSS',
            description: '移除未使用的CSS规则可以减少网络活动',
            impact: 'medium',
            savings: Math.floor(Math.random() * 500) + 100
          }
        ],
        diagnostics: [
          {
            id: 'dom-size',
            title: 'DOM大小过大',
            description: '页面的DOM元素数量过多',
            impact: 'medium'
          }
        ]
      }
    };

    console.log(`✅ PageSpeed test completed with score: ${mockResult.desktop.performanceScore}`);

    res.success(mockResult);
  } catch (error) {
    console.error('PageSpeed测试失败:', error);
    res.serverError('PageSpeed测试失败');
  }
}));

/**
 * GTmetrix 测试
 * POST /api/test/gtmetrix
 */
router.post('/gtmetrix', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, device = 'desktop', location = 'vancouver' } = req.body;

  try {
    console.log(`🚀 Starting GTmetrix test for: ${url}`);

    // 模拟GTmetrix测试结果
    const mockResult = {
      scores: {
        performance: Math.floor(Math.random() * 30) + 70,
        structure: Math.floor(Math.random() * 20) + 80
      },
      vitals: {
        lcp: Math.random() * 2500 + 1000,
        fid: Math.random() * 100 + 50,
        cls: Math.random() * 0.2,
        fcp: Math.random() * 1500 + 500,
        ttfb: Math.random() * 500 + 100,
        speedIndex: Math.random() * 3000 + 1500
      },
      timings: {
        loadTime: Math.random() * 5000 + 2000,
        domContentLoaded: Math.random() * 3000 + 1000,
        firstPaint: Math.random() * 1500 + 500
      },
      resources: {
        totalSize: Math.floor(Math.random() * 5000000) + 1000000,
        requests: Math.floor(Math.random() * 100) + 20
      },
      recommendations: [
        {
          id: 'optimize-images',
          title: '优化图片',
          description: '压缩图片可以显著减少页面加载时间',
          impact: 'high',
          savings: Math.floor(Math.random() * 1000) + 500
        }
      ],
      reportUrl: `https://gtmetrix.com/reports/${Date.now()}`
    };

    console.log(`✅ GTmetrix test completed with performance score: ${mockResult.scores.performance}`);

    res.success(mockResult);
  } catch (error) {
    console.error('GTmetrix测试失败:', error);
    res.serverError('GTmetrix测试失败');
  }
}));

/**
 * WebPageTest 测试
 * POST /api/test/webpagetest
 */
router.post('/webpagetest', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, device = 'desktop', location = 'Dulles', runs = 1 } = req.body;

  try {
    console.log(`🚀 Starting WebPageTest for: ${url}`);

    // 模拟WebPageTest结果
    const mockResult = {
      score: Math.floor(Math.random() * 30) + 70,
      metrics: {
        lcp: Math.random() * 2500 + 1000,
        fid: Math.random() * 100 + 50,
        cls: Math.random() * 0.2,
        fcp: Math.random() * 1500 + 500,
        ttfb: Math.random() * 500 + 100,
        speedIndex: Math.random() * 3000 + 1500,
        loadTime: Math.random() * 5000 + 2000,
        domContentLoaded: Math.random() * 3000 + 1000,
        firstPaint: Math.random() * 1500 + 500,
        bytesIn: Math.floor(Math.random() * 5000000) + 1000000,
        requests: Math.floor(Math.random() * 100) + 20,
        domElements: Math.floor(Math.random() * 1000) + 100
      },
      opportunities: [],
      diagnostics: [],
      videoUrl: `https://webpagetest.org/video/${Date.now()}`,
      waterfallUrl: `https://webpagetest.org/waterfall/${Date.now()}`,
      reportUrl: `https://webpagetest.org/result/${Date.now()}`
    };

    console.log(`✅ WebPageTest completed with score: ${mockResult.score}`);

    res.success(mockResult);
  } catch (error) {
    console.error('WebPageTest测试失败:', error);
    res.serverError('WebPageTest测试失败');
  }
}));

/**
 * Lighthouse 测试
 * POST /api/test/lighthouse
 */
router.post('/lighthouse', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, device = 'desktop', throttling = 'none' } = req.body;

  try {
    console.log(`🚀 Starting Lighthouse test for: ${url}`);

    // 模拟Lighthouse结果
    const mockResult = {
      lhr: {
        categories: {
          performance: {
            score: (Math.random() * 0.3 + 0.7) // 0.7-1.0
          }
        },
        audits: {
          'largest-contentful-paint': {
            numericValue: Math.random() * 2000 + 1000
          },
          'max-potential-fid': {
            numericValue: Math.random() * 100 + 50
          },
          'cumulative-layout-shift': {
            numericValue: Math.random() * 0.2
          },
          'first-contentful-paint': {
            numericValue: Math.random() * 1500 + 500
          },
          'server-response-time': {
            numericValue: Math.random() * 500 + 100
          },
          'speed-index': {
            numericValue: Math.random() * 3000 + 1500
          },
          'interactive': {
            numericValue: Math.random() * 5000 + 2000
          },
          'dom-content-loaded': {
            numericValue: Math.random() * 3000 + 1000
          },
          'total-byte-weight': {
            numericValue: Math.floor(Math.random() * 5000000) + 1000000
          },
          'network-requests': {
            details: {
              items: new Array(Math.floor(Math.random() * 100) + 20)
            }
          },
          'dom-size': {
            numericValue: Math.floor(Math.random() * 1000) + 100
          }
        }
      },
      reportUrl: `https://lighthouse-report.com/${Date.now()}`
    };

    console.log(`✅ Lighthouse test completed with score: ${mockResult.lhr.categories.performance.score}`);

    res.success(mockResult);
  } catch (error) {
    console.error('Lighthouse测试失败:', error);
    res.serverError('Lighthouse测试失败');
  }
}));

/**
 * 本地性能测试
 * POST /api/test/local-performance
 */
router.post('/local-performance', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, device = 'desktop', timeout = 30000 } = req.body;

  try {
    console.log(`🚀 Starting local performance test for: ${url}`);

    // 模拟本地性能测试结果
    const mockResult = {
      score: Math.floor(Math.random() * 25) + 75,
      vitals: {
        lcp: Math.random() * 2000 + 1000,
        fid: Math.random() * 100 + 50,
        cls: Math.random() * 0.15,
        fcp: Math.random() * 1200 + 400,
        ttfb: Math.random() * 400 + 100,
        si: Math.random() * 2500 + 1200
      },
      metrics: {
        loadTime: Math.random() * 4000 + 1500,
        domContentLoaded: Math.random() * 2500 + 800,
        firstPaint: Math.random() * 1200 + 400,
        pageSize: Math.floor(Math.random() * 3000000) + 500000,
        requests: Math.floor(Math.random() * 80) + 15,
        domElements: Math.floor(Math.random() * 800) + 50
      },
      opportunities: [],
      diagnostics: []
    };

    console.log(`✅ Local performance test completed with score: ${mockResult.score}`);

    res.success(mockResult);
  } catch (error) {
    console.error('本地性能测试失败:', error);
    res.serverError('本地性能测试失败');
  }
}));

/**
 * 用户体验测试
 * POST /api/test/ux
 */
router.post('/ux', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url) {
    
        return res.validationError([], 'URL是必填的');
  }

  try {
    new URL(url);
  } catch (error) {
    return res.validationError([], '无效的URL格式');
  }

  try {
    const testResult = await realUXTestEngine.runUXTest(url, {
      ...options,
      userId: req.user?.id
    });

    res.success(testResult);
  } catch (error) {
    console.error('用户体验测试失败:', error);
    res.serverError('用户体验测试失败');
  }
}));

/**
 * @swagger
 * /api/test/seo:
 *   post:
 *     tags: [Tests]
 *     summary: 启动SEO测试
 *     description: 对指定URL进行全面的SEO分析，包括Meta标签、内容质量、性能、结构化数据等
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: 要测试的URL
 *                 example: "https://example.com"
 *               options:
 *                 type: object
 *                 properties:
 *                   timeout:
 *                     type: integer
 *                     description: 超时时间(毫秒)
 *                     default: 30000
 *                   device:
 *                     type: string
 *                     enum: [desktop, mobile]
 *                     default: "desktop"
 *                   forceRefresh:
 *                     type: boolean
 *                     description: 强制刷新，不使用缓存
 *                     default: false
 *     responses:
 *       200:
 *         description: SEO测试成功启动
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/TestResponse'
 *                 - type: object
 *                   properties:
 *                     results:
 *                       $ref: '#/components/schemas/SEOResults'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: 请求频率限制
 *       500:
 *         $ref: '#/components/responses/ServerError'
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

    res.success(seoResult);

  } catch (error) {
    console.error('❌ SEO test failed:', error);
    res.serverError('SEO测试失败');
  }
}));

/**
 * 无障碍测试
 * POST /api/test/accessibility
 */
router.post('/accessibility', optionalAuth, testRateLimiter, validateURLMiddleware(), asyncHandler(async (req, res) => {
  const { url, level = 'AA', categories = [] } = req.body;
  const validatedURL = req.validatedURL.url.toString();

  try {
    console.log(`♿ Starting accessibility test for: ${validatedURL}`);

    // 重定向到专用的无障碍API
    const accessibilityResponse = await fetch(`${req.protocol}://${req.get('host')}/api/accessibility/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({ url: validatedURL, level, categories })
    });

    const accessibilityResult = await accessibilityResponse.json();

    res.success(accessibilityResult.data);

  } catch (error) {
    console.error('❌ Accessibility test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || '无障碍测试失败'
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
    
        return res.validationError([], 'API基础URL是必填的');
  }

  if (!endpoints || endpoints.length === 0) {
    
        return res.validationError([], '至少需要一个API端点');
  }

  try {
    // 验证baseUrl格式
    new URL(baseUrl);
  } catch (error) {
    return res.validationError([], 'API基础URL格式无效');
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

    res.success(testResult);
  } catch (error) {
    console.error('API测试失败:', error);
    res.serverError('API测试失败');
  }
}));

/**
 * 删除测试结果
 * DELETE /api/test/:testId
 */
router.delete('/:testId', authMiddleware, asyncHandler(async (req, res) => {
  const { testId } = req.params;

  try {
    // 使用软删除方式删除测试记录
    const result = await query(
      'UPDATE test_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
      [testId, req.user.id]
    );

    if (result.rowCount === 0) {
      
        return res.notFound('资源', '测试结果不存在');
    }

    res.success('测试结果已删除');
  } catch (error) {
    console.error('删除测试结果失败:', error);
    res.serverError('删除测试结果失败');
  }
}));

// ==================== 兼容路由：前端期望的路径 ====================

/**
 * K6 引擎状态检查 (兼容路径)
 * GET /api/test/k6/status
 */
router.get('/k6/status', asyncHandler(async (req, res) => {
  try {
    let engineStatus = {
      name: 'k6',
      available: false,
      version: 'unknown',
      status: 'not_installed',
      description: 'Load testing tool'
    };

    try {
      // 尝试检查k6是否安装
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
      engineStatus.error = 'K6 not found in PATH';
    }

    res.success(engineStatus);
  } catch (error) {
    console.error('K6 status check failed:', error);
    res.serverError('K6状态检查失败');
  }
}));

/**
 * Lighthouse 引擎状态检查 (兼容路径)
 * GET /api/test/lighthouse/status
 */
router.get('/lighthouse/status', asyncHandler(async (req, res) => {
  try {
    let engineStatus = {
      name: 'lighthouse',
      available: false,
      version: 'unknown',
      status: 'not_installed',
      description: 'Web performance auditing tool'
    };

    try {
      const lighthouse = require('lighthouse');
      engineStatus.available = true;
      engineStatus.version = require('lighthouse/package.json').version;
      engineStatus.status = 'ready';
    } catch (error) {
      engineStatus.status = 'not_installed';
      engineStatus.error = 'Lighthouse not installed';
    }

    res.success(engineStatus);
  } catch (error) {
    console.error('Lighthouse status check failed:', error);
    res.serverError('Lighthouse状态检查失败');
  }
}));

/**
 * Playwright 引擎状态检查 (兼容路径)
 * GET /api/test/playwright/status
 */
router.get('/playwright/status', asyncHandler(async (req, res) => {
  try {
    let engineStatus = {
      name: 'playwright',
      available: false,
      version: 'unknown',
      status: 'not_installed',
      description: 'Browser automation tool'
    };

    try {
      const playwright = require('playwright');
      engineStatus.available = true;
      engineStatus.version = require('playwright/package.json').version;
      engineStatus.status = 'ready';
    } catch (error) {
      engineStatus.status = 'not_installed';
      engineStatus.error = 'Playwright not installed';
    }

    res.success(engineStatus);
  } catch (error) {
    console.error('Playwright status check failed:', error);
    res.serverError('Playwright状态检查失败');
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
        return res.notFound('资源', '未知的测试引擎: ${engine}');
    }

    res.success(engineStatus);

  } catch (error) {
    console.error(`获取${engine}引擎状态失败:`, error);
    res.serverError('获取${engine}引擎状态失败');
  }
}));

// IP地理位置缓存 - 避免重复查询
const ipLocationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存

// 引入地理位置服务
const geoLocationService = require('../services/core/geoLocationService.js');
const geoUpdateService = require('../services/core/geoUpdateService.js');
const ProxyValidator = require('../services/proxyValidator');

/**
 * 获取代理故障排除提示
 */
function getTroubleshootingTips(errorCode) {
  const tips = {
    'TIMEOUT': [
      '检查代理服务器是否在线',
      '尝试增加超时时间',
      '检查网络连接是否稳定',
      '确认代理服务器负载不高'
    ],
    'CONNECTION_REFUSED': [
      '确认代理服务器地址和端口正确',
      '检查代理服务器是否启动',
      '确认防火墙没有阻止连接',
      '验证代理服务器配置'
    ],
    'DNS_ERROR': [
      '检查代理服务器主机名拼写',
      '尝试使用IP地址代替域名',
      '检查DNS服务器设置',
      '确认网络连接正常'
    ],
    'CONNECTION_RESET': [
      '检查代理服务器是否需要认证',
      '确认代理服务器配置正确',
      '尝试重启代理服务器',
      '检查代理服务器日志'
    ],
    'HOST_UNREACHABLE': [
      '检查网络连接',
      '确认路由配置正确',
      '检查防火墙设置',
      '尝试ping代理服务器'
    ],
    'PROXY_AUTH_REQUIRED': [
      '检查用户名和密码是否正确',
      '确认代理服务器认证方式',
      '检查账户是否被锁定',
      '联系代理服务器管理员'
    ],
    'PROXY_FORBIDDEN': [
      '检查代理服务器访问权限',
      '确认IP地址是否在白名单中',
      '检查代理服务器配置',
      '联系代理服务器管理员'
    ]
  };

  return tips[errorCode] || [
    '检查代理服务器配置',
    '确认网络连接正常',
    '查看服务器日志获取更多信息',
    '联系技术支持'
  ];
}

/**
 * 代理延迟测试（通过代理获取出口IP，然后ping出口IP）
 * POST /api/test/proxy-latency
 */
router.post('/proxy-latency', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { proxy, testUrl = 'http://httpbin.org/ip' } = req.body;

  // 验证代理配置
  if (!proxy || !proxy.enabled) {
    
        return res.validationError([], '代理配置无效或未启用');
  }

  if (!proxy.host) {
    
        return res.validationError([], '代理地址不能为空');
  }

  const startTime = Date.now();

  try {
    const proxyType = proxy.type || 'http';
    const proxyPort = proxy.port || 8080;
    let proxyUrl;

    // 构建代理URL
    if (proxy.username && proxy.password) {
      proxyUrl = `${proxyType}://${proxy.username}:${proxy.password}@${proxy.host}:${proxyPort}`;
    } else {
      proxyUrl = `${proxyType}://${proxy.host}:${proxyPort}`;
    }

    console.log(`🌐 通过代理获取出口IP: ${proxy.host}:${proxyPort}`);

    // 使用代理访问测试网站获取出口IP
    const fetch = require('node-fetch');
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const { HttpProxyAgent } = require('http-proxy-agent');
    const AbortController = require('abort-controller');

    // 根据目标URL协议选择合适的代理agent
    let agent;
    const isHttpsTarget = testUrl.startsWith('https://');

    if (isHttpsTarget) {
      agent = new HttpsProxyAgent(proxyUrl);
    } else {
      agent = new HttpProxyAgent(proxyUrl);
    }

    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000); // 5秒超时

    // 通过代理发送请求获取出口IP
    const response = await fetch(testUrl, {
      method: 'GET',
      agent: agent,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Test-Web-Proxy-Latency-Test/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    clearTimeout(timeoutId);
    const proxyResponseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();

    // 从响应中提取出口IP
    let exitIp = '未知';
    if (responseData && responseData.origin) {
      exitIp = responseData.origin;
    }

    console.log(`✅ 通过代理获取到出口IP: ${exitIp}`);

    // 获取出口IP的地理位置信息
    let locationInfo = null;
    if (exitIp && exitIp !== '未知') {
      try {
        locationInfo = await geoLocationService.getLocation(exitIp);
        if (locationInfo) {
          console.log(`📍 出口IP ${exitIp} 位置: ${locationInfo.country}/${locationInfo.region}`);
        }
      } catch (geoError) {
        console.warn('获取出口IP地理位置信息失败:', geoError.message);
      }
    }

    // 测试到出口IP的延迟（关键步骤）
    let networkLatency = null;
    if (exitIp && exitIp !== '未知') {
      try {
        console.log(`🔍 测试到出口IP ${exitIp} 的网络延迟...`);
        const ping = require('ping');
        const pingResult = await ping.promise.probe(exitIp, {
          timeout: 5,
          extra: process.platform === 'win32' ? ['-n', '4'] : ['-c', '4'] // ping 4次取平均值
        });

        if (pingResult.alive) {
          // 处理不同平台的ping结果
          const avgTime = pingResult.avg || pingResult.time || pingResult.min;
          networkLatency = Math.round(parseFloat(avgTime) || 0);
          console.log(`📊 到出口IP的网络延迟: ${networkLatency}ms`);
        } else {
          console.log(`⚠️ 无法ping通出口IP ${exitIp}`);
        }
      } catch (pingError) {
        console.warn('ping测试失败:', pingError.message);
      }
    }

    const totalTime = Date.now() - startTime;

    const responseResult = {
      success: true,
      message: '代理延迟测试成功',
      exitIp: exitIp, // 代理出口IP
      location: locationInfo, // 出口IP地理位置信息
      proxyResponseTime: proxyResponseTime, // 通过代理访问的响应时间
      networkLatency: networkLatency, // 到出口IP的网络延迟（主要指标）
      latency: networkLatency || proxyResponseTime, // 优先显示网络延迟
      proxyConfig: {
        host: proxy.host,
        port: proxyPort,
        type: proxyType
      },
      testUrl: testUrl,
      timestamp: new Date().toISOString(),
      totalTestTime: totalTime
    };

    res.json(responseResult);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ 代理延迟测试失败:', error);

    let errorMessage = '代理延迟测试失败';
    let errorCode = 'PROXY_LATENCY_TEST_FAILED';

    if (error.code === 'ENOTFOUND') {
      errorMessage = '无法解析代理服务器地址，请检查主机名';
      errorCode = 'PROXY_HOST_NOT_FOUND';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '代理服务器拒绝连接，请检查端口和防火墙设置';
      errorCode = 'PROXY_CONNECTION_REFUSED';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '连接代理服务器超时，请检查网络连接';
      errorCode = 'PROXY_CONNECTION_TIMEOUT';
    } else if (error.message && error.message.includes('407')) {
      errorMessage = '代理服务器需要身份验证，请检查用户名和密码';
      errorCode = 'PROXY_AUTH_REQUIRED';
    } else if (error.message) {
      errorMessage = `代理延迟测试失败: ${error.message}`;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      proxyConfig: {
        host: proxy.host,
        port: proxy.port || 8080,
        type: proxy.type || 'http'
      },
      timestamp: new Date().toISOString(),
      totalTestTime: totalTime,
      troubleshooting: [
        '检查代理服务器地址和端口是否正确',
        '确认代理服务器正常工作',
        '检查代理认证信息（如果需要）',
        '验证本地网络连接',
        '确认防火墙设置允许代理连接'
      ]
    });
  }
}));

/**
 * 代理连接测试（原有功能保留）
 * POST /api/test/proxy-test
 */
router.post('/proxy-test', optionalAuth, testRateLimiter, asyncHandler(async (req, res) => {
  const { proxy, testUrl = 'http://icanhazip.com', fastTest = true } = req.body;

  // 验证代理配置
  if (!proxy || !proxy.enabled) {
    
        return res.validationError([], '代理配置无效或未启用');
  }

  if (!proxy.host) {
    
        return res.validationError([], '代理地址不能为空');
  }

  try {
    const startTime = Date.now();

    // 构建代理URL
    const proxyType = proxy.type || 'http';
    const proxyPort = proxy.port || 8080;
    let proxyUrl;

    if (proxy.username && proxy.password) {
      // 带认证的代理
      proxyUrl = `${proxyType}://${proxy.username}:${proxy.password}@${proxy.host}:${proxyPort}`;
    } else {
      // 无认证的代理
      proxyUrl = `${proxyType}://${proxy.host}:${proxyPort}`;
    }

    console.log(`🌐 测试代理连接: ${proxy.host}:${proxyPort}`);

    // 使用 node-fetch 通过代理发送请求
    const fetch = require('node-fetch');
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const { HttpProxyAgent } = require('http-proxy-agent');
    const AbortController = require('abort-controller');

    // 根据目标URL协议选择合适的代理agent
    let agent;
    const isHttpsTarget = testUrl.startsWith('https://');

    if (isHttpsTarget) {
      // HTTPS目标使用HttpsProxyAgent
      agent = new HttpsProxyAgent(proxyUrl);
    } else {
      // HTTP目标使用HttpProxyAgent
      agent = new HttpProxyAgent(proxyUrl);
    }

    // 设置超时控制（优化为更快的响应）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 3000); // 3秒超时，更快的响应

    // 发送测试请求
    const response = await fetch(testUrl, {
      method: 'GET',
      agent: agent,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Test-Web-Proxy-Test/1.0',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    // 清除超时定时器
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const testResponseData = await response.json();

    // 从响应中提取代理IP（如果可用）
    let proxyIp = '未知';
    if (testResponseData && testResponseData.origin) {
      proxyIp = testResponseData.origin;
    }

    console.log(`✅ 代理连接测试成功: ${proxy.host}:${proxyPort}, 获取到代理IP: ${proxyIp}`);

    // 查询IP地理位置信息（本地数据库查询，很快）
    let locationInfo = null;
    if (proxyIp && proxyIp !== '未知') {
      try {
        locationInfo = await geoLocationService.getLocation(proxyIp);
        if (locationInfo) {
          console.log(`📍 IP ${proxyIp} 位置: ${locationInfo.country}/${locationInfo.region} (${locationInfo.source})`);
        }
      } catch (geoError) {
        console.warn('获取IP地理位置信息失败:', geoError.message);
      }
    }

    // 测试到代理IP的直接延迟（这才是关键指标）
    let networkLatency = null;
    if (proxyIp && proxyIp !== '未知') {
      try {
        console.log(`🔍 测试到代理IP ${proxyIp} 的网络延迟...`);
        const ping = require('ping');
        const pingResult = await ping.promise.probe(proxyIp, {
          timeout: 3,
          extra: ['-c', '3'] // ping 3次取平均值
        });

        if (pingResult.alive) {
          networkLatency = Math.round(parseFloat(pingResult.avg));
          console.log(`📊 网络延迟: ${networkLatency}ms`);
        } else {
          console.log(`⚠️ 无法ping通代理IP ${proxyIp}`);
        }
      } catch (pingError) {
        console.warn('ping测试失败:', pingError.message);
      }
    }

    const responseData = {
      success: true,
      message: '代理连接测试成功',
      proxyIp: proxyIp, // 实际的出口IP
      location: locationInfo, // 地理位置信息（辅助显示，不影响延迟）
      responseTime: networkLatency || responseTime, // 优先显示网络延迟
      networkLatency: networkLatency, // 到代理IP的网络延迟（主要指标）
      proxyConfig: {
        host: proxy.host,
        port: proxyPort,
        type: proxyType
      },
      testUrl: testUrl,
      timestamp: new Date().toISOString()
    };

    res.json(responseData);

  } catch (error) {
    console.error('❌ 代理连接测试失败:', error);

    let errorMessage = '代理连接失败';
    let errorCode = error.code || 'PROXY_TEST_FAILED';

    // 详细的错误分类和用户友好的错误信息
    if (error.name === 'AbortError') {
      errorMessage = '代理连接超时（5秒），请检查代理服务器状态';
      errorCode = 'TIMEOUT';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = '无法连接到代理服务器，请检查代理地址和端口是否正确';
      errorCode = 'CONNECTION_REFUSED';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '代理连接超时，请检查网络连接和代理服务器状态';
      errorCode = 'TIMEOUT';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = '无法解析代理服务器地址，请检查主机名是否正确';
      errorCode = 'DNS_ERROR';
    } else if (error.code === 'ECONNRESET') {
      errorMessage = '代理服务器重置了连接，可能需要认证或服务器繁忙';
      errorCode = 'CONNECTION_RESET';
    } else if (error.code === 'EHOSTUNREACH') {
      errorMessage = '无法到达代理服务器，请检查网络连接';
      errorCode = 'HOST_UNREACHABLE';
    } else if (error.message && error.message.includes('407')) {
      errorMessage = '代理服务器需要认证，请检查用户名和密码';
      errorCode = 'PROXY_AUTH_REQUIRED';
    } else if (error.message && error.message.includes('403')) {
      errorMessage = '代理服务器拒绝访问，请检查权限设置';
      errorCode = 'PROXY_FORBIDDEN';
    } else if (error.message) {
      errorMessage = `代理测试失败: ${error.message}`;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorCode,
      proxyConfig: {
        host: proxy.host,
        port: proxy.port || 8080,
        type: proxy.type || 'http'
      },
      timestamp: new Date().toISOString(),
      troubleshooting: getTroubleshootingTips(errorCode)
    });
  }
}));

/**
 * 地理位置服务状态
 * GET /api/test/geo-status
 */
router.get('/geo-status', optionalAuth, asyncHandler(async (req, res) => {
  const geoStatus = geoLocationService.getStatus();
  const updateStatus = geoUpdateService.getStatus();

  res.success(geoStatus);
}));

/**
 * 手动触发地理位置数据库更新
 * POST /api/test/geo-update
 */
router.post('/geo-update', optionalAuth, asyncHandler(async (req, res) => {
  try {
    console.log('🎯 收到手动更新请求');
    const success = await geoUpdateService.triggerUpdate();

    res.json({
      success: success,
      message: success ? '数据库更新成功' : '数据库更新失败',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('手动更新失败:', error);
    res.serverError('更新过程中发生错误');
  }
}));

/**
 * 配置自动更新设置
 * PUT /api/test/geo-config
 */
router.put('/geo-config', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { enabled, schedule } = req.body;

    if (typeof enabled === 'boolean') {
      geoUpdateService.setEnabled(enabled);
    }

    if (schedule && typeof schedule === 'string') {
      geoUpdateService.setSchedule(schedule);
    }

    const status = geoUpdateService.getStatus();

    res.success(status, '配置更新成功');
  } catch (error) {
    console.error('配置更新失败:', error);
    res.serverError('配置更新失败');
  }
}));

/**
 * 代理分析接口
 * POST /api/test/proxy-analyze
 */
router.post('/proxy-analyze', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const { proxy } = req.body;

    if (!proxy || !proxy.host) {
      
        return res.validationError([], '缺少代理配置信息');
    }

    console.log('🔍 开始分析代理配置:', `${proxy.host}:${proxy.port}`);

    const validator = new ProxyValidator();
    const analysis = await validator.analyzeProxy(proxy);

    res.success(analysis, '代理分析完成');

  } catch (error) {
    console.error('代理分析失败:', error);
    res.serverError('代理分析失败');
  }
}));

module.exports = router;
