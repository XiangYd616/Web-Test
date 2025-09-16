/**
 * 测试工具API路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 测试管理服务实例 (将在app.js中初始化)
let testManagementService = null;

// 设置测试管理服务实例
router.setTestManagementService = (service) => {
  testManagementService = service;
};

// 验证规则
const createTestSchema = Joi.object({
  engineType: Joi.string().valid(
    'performance', 'security', 'seo', 'api', 
    'stress', 'compatibility', 'database', 'network'
  ).required(),
  name: Joi.string().max(255),
  url: Joi.string().uri().when('engineType', {
    is: Joi.valid('performance', 'security', 'seo', 'compatibility'),
    then: Joi.required()
  }),
  config: Joi.object({
    // 性能测试配置
    throttling: Joi.string().valid('no-throttling', '4G', '3G', 'slow-3G'),
    viewport: Joi.object({
      width: Joi.number().integer().min(320).max(3840),
      height: Joi.number().integer().min(240).max(2160)
    }),
    metrics: Joi.array().items(Joi.string()),
    
    // 安全测试配置
    scanType: Joi.string().valid('basic', 'advanced', 'full'),
    depth: Joi.number().integer().min(1).max(10),
    checkSSL: Joi.boolean(),
    checkHeaders: Joi.boolean(),
    checkVulnerabilities: Joi.array().items(Joi.string()),
    
    // SEO测试配置
    checkMeta: Joi.boolean(),
    checkSitemap: Joi.boolean(),
    checkRobots: Joi.boolean(),
    checkSchema: Joi.boolean(),
    checkSpeed: Joi.boolean(),
    
    // API测试配置
    method: Joi.string().valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
    headers: Joi.object(),
    body: Joi.any(),
    timeout: Joi.number().integer().min(1000).max(120000),
    validateResponse: Joi.boolean(),
    expectedStatus: Joi.number().integer().min(100).max(599),
    
    // 压力测试配置
    virtualUsers: Joi.number().integer().min(1).max(10000),
    duration: Joi.number().integer().min(10).max(3600),
    rampUp: Joi.number().integer().min(0),
    thinkTime: Joi.number().integer().min(0),
    scenario: Joi.array().items(Joi.object()),
    
    // 数据库测试配置
    connectionString: Joi.string(),
    queries: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      sql: Joi.string().required(),
      expectedTime: Joi.number()
    })),
    
    // 网络测试配置
    targets: Joi.array().items(Joi.string()),
    protocol: Joi.string().valid('http', 'https', 'tcp', 'udp', 'icmp'),
    port: Joi.number().integer().min(1).max(65535),
    packetSize: Joi.number().integer().min(1).max(65535)
  }).default({}),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  tags: Joi.array().items(Joi.string())
});

const testHistoryQuerySchema = Joi.object({
  engineType: Joi.string().valid(
    'performance', 'security', 'seo', 'api', 
    'stress', 'compatibility', 'database', 'network'
  ),
  status: Joi.string().valid('pending', 'running', 'completed', 'failed', 'cancelled'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

/**
 * 获取所有测试引擎状态
 * GET /api/testing/engines
 */
router.get('/engines', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const engineStatus = testManagementService.getEngineStatus();
  
  res.json({
    success: true,
    data: engineStatus
  });
}));

/**
 * 创建新的测试任务
 * POST /api/testing/tests
 */
router.post('/tests', authMiddleware, validateRequest(createTestSchema), asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const { engineType, ...config } = req.validatedData;
  const userId = req.user.id;

  const test = await testManagementService.createTest(userId, engineType, config);

  res.status(201).json({
    success: true,
    data: test,
    message: '测试任务创建成功'
  });
}));

/**
 * 获取测试历史列表
 * GET /api/testing/history
 */
router.get('/history', authMiddleware, validateRequest(testHistoryQuerySchema, 'query'), asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { page, limit, ...filters } = req.validatedData;
  
  const offset = (page - 1) * limit;
  
  const result = await testManagementService.getTestHistory(userId, {
    ...filters,
    limit,
    offset
  });

  res.json({
    success: true,
    data: {
      tests: result.tests,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      }
    }
  });
}));

/**
 * 获取特定引擎的测试历史
 * GET /api/testing/history/:engineType
 */
router.get('/history/:engineType', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { engineType } = req.params;
  const { page = 1, limit = 20 } = req.query;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  const result = await testManagementService.getTestHistory(userId, {
    engineType,
    limit: parseInt(limit),
    offset
  });

  res.json({
    success: true,
    data: {
      engineType,
      tests: result.tests,
      pagination: {
        total: result.total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.total / parseInt(limit))
      }
    }
  });
}));

/**
 * 获取测试详情
 * GET /api/testing/tests/:testId
 */
router.get('/tests/:testId', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { testId } = req.params;

  const test = await testManagementService.getTestDetails(testId, userId);

  if (!test) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '测试记录不存在'
      }
    });
  }

  res.json({
    success: true,
    data: test
  });
}));

/**
 * 取消测试
 * POST /api/testing/tests/:testId/cancel
 */
router.post('/tests/:testId/cancel', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { testId } = req.params;

  const result = await testManagementService.cancelTest(testId, userId);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * 重新运行测试
 * POST /api/testing/tests/:testId/rerun
 */
router.post('/tests/:testId/rerun', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { testId } = req.params;

  const newTest = await testManagementService.rerunTest(testId, userId);

  res.status(201).json({
    success: true,
    data: newTest,
    message: '测试任务已重新创建'
  });
}));

/**
 * 获取测试统计数据
 * GET /api/testing/statistics
 */
router.get('/statistics', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { period = '7d' } = req.query;

  const statistics = await testManagementService.getTestStatistics(userId, period);

  res.json({
    success: true,
    data: statistics
  });
}));

/**
 * 获取测试模板列表
 * GET /api/testing/templates
 */
router.get('/templates', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { engineType } = req.query;

  let query = `
    SELECT * FROM test_templates 
    WHERE (user_id = $1 OR is_public = true)
  `;
  const params = [userId];

  if (engineType) {
    query += ` AND engine_type = $2`;
    params.push(engineType);
  }

  query += ` ORDER BY is_default DESC, usage_count DESC`;

  const result = await testManagementService.db.query(query, params);

  res.json({
    success: true,
    data: result.rows
  });
}));

/**
 * 创建测试模板
 * POST /api/testing/templates
 */
router.post('/templates', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { engineType, templateName, description, config, isPublic = false } = req.body;

  const result = await testManagementService.db.query(
    `INSERT INTO test_templates 
     (user_id, engine_type, template_name, description, config, is_public)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, engineType, templateName, description, JSON.stringify(config), isPublic]
  );

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: '测试模板创建成功'
  });
}));

/**
 * 获取测试比较结果
 * POST /api/testing/compare
 */
router.post('/compare', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { testIds, comparisonType = 'multi-result' } = req.body;

  if (!testIds || testIds.length < 2) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '至少需要两个测试结果进行比较'
      }
    });
  }

  // 获取所有测试结果
  const tests = await Promise.all(
    testIds.map(id => testManagementService.getTestDetails(id, userId))
  );

  // 过滤掉不存在的测试
  const validTests = tests.filter(test => test !== null);

  if (validTests.length < 2) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_DATA',
        message: '有效的测试结果不足'
      }
    });
  }

  // 生成比较数据
  const comparisonData = {
    type: comparisonType,
    tests: validTests.map(test => ({
      testId: test.test_id,
      name: test.test_name,
      engineType: test.engine_type,
      score: test.score,
      grade: test.grade,
      executionTime: test.execution_time,
      createdAt: test.created_at,
      metrics: test.metrics
    })),
    analysis: {
      bestScore: Math.max(...validTests.map(t => t.score || 0)),
      worstScore: Math.min(...validTests.map(t => t.score || 0)),
      avgScore: validTests.reduce((sum, t) => sum + (t.score || 0), 0) / validTests.length,
      avgExecutionTime: validTests.reduce((sum, t) => sum + (t.execution_time || 0), 0) / validTests.length
    }
  };

  // 保存比较记录
  await testManagementService.db.query(
    `INSERT INTO test_comparisons 
     (user_id, comparison_name, test_ids, comparison_type, comparison_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, `比较 - ${new Date().toLocaleString()}`, 
     testIds, comparisonType, JSON.stringify(comparisonData)]
  );

  res.json({
    success: true,
    data: comparisonData
  });
}));

/**
 * 获取实时测试状态（WebSocket fallback）
 * GET /api/testing/tests/:testId/status
 */
router.get('/tests/:testId/status', authMiddleware, asyncHandler(async (req, res) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '测试服务未启动'
      }
    });
  }

  const userId = req.user.id;
  const { testId } = req.params;

  const test = await testManagementService.getTestDetails(testId, userId);

  if (!test) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '测试记录不存在'
      }
    });
  }

  // 检查是否在活动测试中
  const isActive = testManagementService.activeTests.has(testId);
  const isQueued = testManagementService.testQueue.has(testId);

  res.json({
    success: true,
    data: {
      testId: test.test_id,
      status: test.status,
      progress: test.progress,
      isActive,
      isQueued,
      engineType: test.engine_type,
      createdAt: test.created_at,
      startedAt: test.started_at,
      completedAt: test.completed_at,
      executionTime: test.execution_time
    }
  });
}));

module.exports = router;
