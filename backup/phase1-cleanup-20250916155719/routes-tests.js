/**
 * 通用测试路由
 * 提供网站综合测试功能的统一API
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const cacheMiddleware = require('../middleware/cache');

const router = express.Router();

// 通用测试API限制
const testRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10分钟
  max: 10, // 限制每个IP在10分钟内最多10次测试请求
  message: {
    success: false,
    error: '测试请求过于频繁，请稍后再试'
  }
});

/**
 * 启动网站综合测试
 * POST /api/tests/website
 */
router.post('/website', 
  testRateLimiter,
  asyncHandler(async (req, res) => {
    const {
      targetUrl,
      testSuite = 'comprehensive',
      includePerformance = true,
      includeSecurity = true,
      includeSEO = true,
      includeAccessibility = true,
      includeCompatibility = true,
      includeUX = true,
      reportFormat = 'detailed'
    } = req.body;

    // 验证输入
    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: '请提供目标网站URL'
      });
    }

    // 验证URL格式
    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: '无效的URL格式'
      });
    }

    // 生成测试ID
    const testId = `website_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 创建测试记录
      const testRecord = await query(
        `INSERT INTO tests (test_id, test_type, test_name, url, config, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING id`,
        [
          testId,
          'website',
          '网站综合测试',
          targetUrl,
          JSON.stringify({
            testSuite,
            includePerformance,
            includeSecurity,
            includeSEO,
            includeAccessibility,
            includeCompatibility,
            includeUX,
            reportFormat
          }),
          'pending'
        ]
      );

      // 模拟测试启动（实际实现中会调用真实的测试引擎）
      const testConfig = {
        testId,
        targetUrl,
        testSuite,
        includePerformance,
        includeSecurity,
        includeSEO,
        includeAccessibility,
        includeCompatibility,
        includeUX,
        reportFormat,
        status: 'running',
        startTime: new Date().toISOString()
      };

      console.log(`🚀 启动网站综合测试: ${testId} for ${targetUrl}`);

      res.json({
        success: true,
        data: {
          testId,
          status: 'started',
          message: '网站综合测试已启动',
          config: testConfig,
          estimatedDuration: '2-5分钟'
        }
      });

      // 异步执行测试逻辑
      setImmediate(() => {
        simulateWebsiteTest(testId, testConfig);
      });

    } catch (error) {
      console.error('启动网站测试失败:', error);
      res.status(500).json({
        success: false,
        error: '启动测试失败，请稍后重试'
      });
    }
  })
);

/**
 * 获取测试状态和进度
 * GET /api/tests/:testId/status
 */
router.get('/:testId/status',
  asyncHandler(async (req, res) => {
    const { testId } = req.params;

    try {
      const result = await query(
        'SELECT * FROM tests WHERE test_id = $1',
        [testId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '测试记录不存在'
        });
      }

      const test = result.rows[0];
      
      res.json({
        success: true,
        data: {
          testId: test.test_id,
          status: test.status,
          progress: test.progress || 0,
          startTime: test.started_at,
          completedTime: test.completed_at,
          results: test.results,
          error: test.error_message
        }
      });

    } catch (error) {
      console.error('获取测试状态失败:', error);
      res.status(500).json({
        success: false,
        error: '获取测试状态失败'
      });
    }
  })
);

/**
 * 取消正在运行的测试
 * POST /api/tests/:testId/cancel
 */
router.post('/:testId/cancel',
  asyncHandler(async (req, res) => {
    const { testId } = req.params;

    try {
      const result = await query(
        'UPDATE tests SET status = $1, updated_at = NOW() WHERE test_id = $2 RETURNING *',
        ['cancelled', testId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '测试记录不存在'
        });
      }

      console.log(`🛑 取消测试: ${testId}`);

      res.json({
        success: true,
        message: '测试已取消',
        data: {
          testId,
          status: 'cancelled'
        }
      });

    } catch (error) {
      console.error('取消测试失败:', error);
      res.status(500).json({
        success: false,
        error: '取消测试失败'
      });
    }
  })
);

/**
 * 获取测试结果详情
 * GET /api/tests/:testId/results
 */
router.get('/:testId/results',
  cacheMiddleware.apiCache('test-results', { ttl: 3600 }), // 1小时缓存
  asyncHandler(async (req, res) => {
    const { testId } = req.params;

    try {
      const result = await query(
        'SELECT * FROM tests WHERE test_id = $1 AND status = $2',
        [testId, 'completed']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '测试结果不存在或测试未完成'
        });
      }

      const test = result.rows[0];
      
      res.json({
        success: true,
        data: {
          testId: test.test_id,
          testType: test.test_type,
          targetUrl: test.url,
          startTime: test.started_at,
          completedTime: test.completed_at,
          duration: test.duration,
          score: test.score,
          results: test.results,
          recommendations: test.results?.recommendations || [],
          summary: {
            overallScore: test.score || 0,
            totalTests: test.results?.summary?.totalTests || 0,
            passedTests: test.results?.summary?.passedTests || 0,
            failedTests: test.results?.summary?.failedTests || 0,
            warningTests: test.results?.summary?.warningTests || 0
          }
        }
      });

    } catch (error) {
      console.error('获取测试结果失败:', error);
      res.status(500).json({
        success: false,
        error: '获取测试结果失败'
      });
    }
  })
);

/**
 * 获取用户测试历史
 * GET /api/tests/history
 */
router.get('/history',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, testType, status } = req.query;
    const offset = (page - 1) * limit;

    try {
      let whereClause = 'WHERE user_id = $1';
      let params = [req.user.id];
      
      if (testType) {
        whereClause += ` AND test_type = $${params.length + 1}`;
        params.push(testType);
      }
      
      if (status) {
        whereClause += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      const result = await query(
        `SELECT test_id, test_type, test_name, url, status, score, created_at, completed_at, duration
         FROM tests ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) as total FROM tests ${whereClause}`,
        params
      );

      res.json({
        success: true,
        data: {
          tests: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(countResult.rows[0].total),
            pages: Math.ceil(countResult.rows[0].total / limit)
          }
        }
      });

    } catch (error) {
      console.error('获取测试历史失败:', error);
      res.status(500).json({
        success: false,
        error: '获取测试历史失败'
      });
    }
  })
);

/**
 * 模拟网站测试执行（实际环境中应该调用真实的测试引擎）
 */
async function simulateWebsiteTest(testId, config) {
  try {
    console.log(`⚡ 开始执行网站测试: ${testId}`);

    // 更新测试状态为运行中
    await query(
      'UPDATE tests SET status = $1, started_at = NOW(), progress = $2 WHERE test_id = $3',
      ['running', 0, testId]
    );

    // 模拟测试进度更新
    const testSteps = [
      { progress: 10, message: '分析目标网站...' },
      { progress: 20, message: '检测性能指标...' },
      { progress: 40, message: '扫描安全漏洞...' },
      { progress: 60, message: 'SEO分析进行中...' },
      { progress: 80, message: '可访问性测试...' },
      { progress: 90, message: '生成测试报告...' },
      { progress: 100, message: '测试完成！' }
    ];

    for (let i = 0; i < testSteps.length; i++) {
      const step = testSteps[i];
      
      // 模拟测试时间
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      await query(
        'UPDATE tests SET progress = $1 WHERE test_id = $2',
        [step.progress, testId]
      );
      
      console.log(`📊 ${testId}: ${step.progress}% - ${step.message}`);
    }

    // 生成模拟测试结果
    const mockResults = generateMockWebsiteTestResults(config);

    // 保存测试结果
    await query(
      `UPDATE tests SET 
        status = $1, 
        completed_at = NOW(), 
        duration = EXTRACT(EPOCH FROM (NOW() - started_at)), 
        results = $2, 
        score = $3
       WHERE test_id = $4`,
      ['completed', JSON.stringify(mockResults), mockResults.overallScore, testId]
    );

    console.log(`✅ 网站测试完成: ${testId}, 得分: ${mockResults.overallScore}`);

  } catch (error) {
    console.error(`❌ 网站测试失败: ${testId}`, error);
    
    await query(
      'UPDATE tests SET status = $1, error_message = $2, completed_at = NOW() WHERE test_id = $3',
      ['failed', error.message, testId]
    );
  }
}

/**
 * 生成模拟的网站测试结果
 */
function generateMockWebsiteTestResults(config) {
  const results = {
    testId: config.testId,
    targetUrl: config.targetUrl,
    timestamp: new Date().toISOString()
  };

  // 模拟各项测试结果
  if (config.includePerformance) {
    results.performance = {
      score: Math.floor(Math.random() * 30) + 70, // 70-100分
      metrics: {
        loadTime: Math.floor(Math.random() * 2000) + 500,
        firstContentfulPaint: Math.floor(Math.random() * 1000) + 300,
        largestContentfulPaint: Math.floor(Math.random() * 1500) + 800,
        cumulativeLayoutShift: Math.random() * 0.2,
        timeToInteractive: Math.floor(Math.random() * 2000) + 1000
      }
    };
  }

  if (config.includeSecurity) {
    results.security = {
      score: Math.floor(Math.random() * 25) + 75, // 75-100分
      vulnerabilities: Math.random() > 0.7 ? [
        {
          type: 'Mixed Content',
          severity: 'medium',
          description: '检测到混合内容，建议全站使用HTTPS'
        }
      ] : [],
      certificates: {
        valid: Math.random() > 0.1,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        issuer: 'Let\'s Encrypt'
      }
    };
  }

  if (config.includeSEO) {
    results.seo = {
      score: Math.floor(Math.random() * 20) + 80, // 80-100分
      issues: Math.random() > 0.8 ? [
        {
          category: 'Meta Tags',
          description: '缺少meta description',
          impact: 'medium'
        }
      ] : [],
      recommendations: [
        '优化页面标题长度',
        '添加结构化数据',
        '提高内容质量'
      ]
    };
  }

  // 计算总分
  const scores = [];
  if (results.performance) scores.push(results.performance.score);
  if (results.security) scores.push(results.security.score);
  if (results.seo) scores.push(results.seo.score);

  results.overallScore = Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length);

  results.summary = {
    totalTests: scores.length * 10,
    passedTests: Math.floor(scores.length * 8.5),
    failedTests: Math.floor(scores.length * 0.5),
    warningTests: Math.floor(scores.length * 1)
  };

  return results;
}

module.exports = router;
