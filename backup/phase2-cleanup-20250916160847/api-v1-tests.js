/**
 * 测试路由
 * 处理所有测试相关的API请求
 * 支持7种本地化测试引擎
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');

const { getPool } = require('../../../config/database');
const { authMiddleware, requirePlan, PLANS } = require('./auth.js');
const { asyncHandler } = require('../../middleware/errorHandler.js');
const { formatValidationErrors, createPagination, ERROR_CODES } = require('../../middleware/responseFormatter.js');

// 导入测试引擎
const seoEngine = require('../../../engines/seo/index');
const performanceEngine = require('../../../engines/performance/index');
const securityEngine = require('../../../engines/security/index');
const stressEngine = require('../../../engines/stress/index');
const apiEngine = require('../../../engines/api/index');
const compatibilityEngine = require('../../../engines/compatibility/index');
const uxEngine = require('../../../engines/ux/index');
const infrastructureEngine = require('../../../engines/infrastructure/index');
const websiteEngine = require('../../../engines/website/index');

const router = express.Router();

// =====================================================
// 测试类型常量
// =====================================================

const TEST_TYPES = {
  API: 'api',
  COMPATIBILITY: 'compatibility',
  INFRASTRUCTURE: 'infrastructure',
  SECURITY: 'security',
  SEO: 'seo',
  STRESS: 'stress',
  UX: 'ux',
  WEBSITE: 'website'
};

const TEST_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// =====================================================
// 验证规则
// =====================================================

const startTestValidation = [
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('请输入有效的URL地址'),

  body('testName')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('测试名称长度必须在1-255个字符之间'),

  body('config')
    .optional()
    .isObject()
    .withMessage('配置必须是有效的JSON对象'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组格式')
];

const listTestsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是大于0的整数'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),

  query('testType')
    .optional()
    .isIn(Object.values(TEST_TYPES))
    .withMessage('无效的测试类型'),

  query('status')
    .optional()
    .isIn(Object.values(TEST_STATUS))
    .withMessage('无效的测试状态')
];

// =====================================================
// 辅助函数
// =====================================================

/**
 * 检查用户测试限制
 */
const checkTestLimits = async (userId, testType, userPlan) => {
  const pool = getPool();

  // 获取用户当前运行的测试数量
  const runningTestsResult = await pool.query(
    `SELECT COUNT(*) as count 
     FROM test_results 
     WHERE user_id = $1 AND status IN ('pending', 'running')`,
    [userId]
  );

  const runningTests = parseInt(runningTestsResult.rows[0].count);

  // 根据计划检查并发限制
  const concurrentLimits = {
    [PLANS.FREE]: 2,
    [PLANS.PRO]: 5,
    [PLANS.ENTERPRISE]: 10
  };

  const maxConcurrent = concurrentLimits[userPlan] || 1;

  if (runningTests >= maxConcurrent) {
    throw new Error(`当前计划最多支持${maxConcurrent}个并发测试，请等待现有测试完成`);
  }

  // 检查今日测试次数限制
  const todayTestsResult = await pool.query(
    `SELECT COUNT(*) as count 
     FROM test_results 
     WHERE user_id = $1 AND test_type = $2 
     AND created_at >= CURRENT_DATE`,
    [userId, testType]
  );

  const todayTests = parseInt(todayTestsResult.rows[0].count);

  // 根据计划检查每日限制
  const dailyLimits = {
    [PLANS.FREE]: { [TEST_TYPES.SEO]: 10, [TEST_TYPES.PERFORMANCE]: 5, [TEST_TYPES.SECURITY]: 3 },
    [PLANS.PRO]: { [TEST_TYPES.SEO]: 100, [TEST_TYPES.PERFORMANCE]: 50, [TEST_TYPES.SECURITY]: 30 },
    [PLANS.ENTERPRISE]: {} // 无限制
  };

  const dailyLimit = dailyLimits[userPlan]?.[testType];

  if (dailyLimit && todayTests >= dailyLimit) {
    throw new Error(`当前计划每日最多支持${dailyLimit}次${testType}测试`);
  }

  return true;
};

/**
 * 创建测试记录
 */
const createTestRecord = async (userId, testType, testData) => {
  const pool = getPool();

  const { url, testName, config, tags, notes } = testData;

  const result = await pool.query(
    `INSERT INTO test_results (
      user_id, test_type, test_name, url, config, tags, notes, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING id, test_type, test_name, url, status, created_at`,
    [
      userId,
      testType,
      testName || `${testType.toUpperCase()}测试 - ${new Date().toLocaleString()}`,
      url,
      JSON.stringify(config || {}),
      tags || [],
      notes || null,
      TEST_STATUS.PENDING
    ]
  );

  return result.rows[0];
};

/**
 * 启动测试引擎
 */
const startTestEngine = async (testType, testId, url, config = {}) => {
  try {
    console.log(`🚀 启动${testType}测试引擎: ${testId}`);

    switch (testType) {
      case TEST_TYPES.SEO:
        return await seoEngine.startTest(testId, url, config);

      case TEST_TYPES.PERFORMANCE:
        return await performanceEngine.runPerformanceTest(config, testId);

      case TEST_TYPES.SECURITY:
        return await securityEngine.startTest(testId, url, config);

      case TEST_TYPES.API:
        return await apiEngine.startTest(testId, url, config);

      case TEST_TYPES.COMPATIBILITY:
        return await compatibilityEngine.startTest(testId, url, config);

      case TEST_TYPES.ACCESSIBILITY:
        return await accessibilityEngine.startTest(testId, url, config);

      case TEST_TYPES.STRESS:
        return await stressEngine.startTest(testId, url, config);

      default:
        throw new Error(`不支持的测试类型: ${testType}`);
    }
  } catch (error) {
    console.error(`❌ 测试引擎启动失败: ${testId}`, error);

    // 更新测试状态为失败
    const pool = getPool();
    await pool.query(
      `UPDATE test_results
       SET status = 'failed', completed_at = NOW(), error_message = $1
       WHERE id = $2`,
      [error.message, testId]
    );

    throw error;
  }
};

/**
 * 获取测试引擎状态
 */
const getEngineStatus = async (testType) => {
  const pool = getPool();

  try {
    const result = await pool.query(
      'SELECT status, last_check, error_message FROM engine_status WHERE engine_type = $1',
      [testType]
    );

    const engine = result.rows[0];
    if (!engine) {
      
        return { status: 'unknown', available: false
      };
    }

    // 检查引擎是否在5分钟内有响应
    const lastCheck = new Date(engine.last_check);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const available = engine.status === 'healthy' && lastCheck > fiveMinutesAgo;

    return {
      status: engine.status,
      available,
      lastCheck: engine.last_check,
      errorMessage: engine.error_message
    };
  } catch (error) {
    return { status: 'error', available: false, error: error.message };
  }
};

// =====================================================
// 路由处理器
// =====================================================

/**
 * GET /api/v1/tests
 * 获取用户的测试历史
 */
router.get('/', authMiddleware, listTestsValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.validationError('查询参数验证失败', formatValidationErrors(errors));
  }

  const {
    page = 1,
    limit = 20,
    testType,
    status,
    search
  } = req.query;

  const userId = req.user.id;
  const offset = (page - 1) * limit;

  // 构建查询条件
  let whereConditions = ['user_id = $1', 'deleted_at IS NULL'];
  let queryParams = [userId];
  let paramIndex = 2;

  if (testType) {
    whereConditions.push(`test_type = $${paramIndex}`);
    queryParams.push(testType);
    paramIndex++;
  }

  if (status) {
    whereConditions.push(`status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  if (search) {
    whereConditions.push(`(test_name ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  // 获取总数
  const countResult = await getPool().query(
    `SELECT COUNT(*) as total FROM test_results WHERE ${whereClause}`,
    queryParams
  );

  const total = parseInt(countResult.rows[0].total);

  // 获取测试列表
  const testsResult = await getPool().query(
    `SELECT 
      id, test_type, test_name, url, status, overall_score, grade,
      started_at, completed_at, duration_ms, total_checks, passed_checks,
      failed_checks, warnings, tags, created_at
    FROM test_results 
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  const pagination = createPagination(page, limit, total, testsResult.rows);

  res.paginated(testsResult.rows, pagination, '获取测试历史成功');
}));

/**
 * GET /api/v1/tests/:id
 * 获取特定测试的详细信息
 */
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const testId = req.params.id;
  const userId = req.user.id;

  const pool = getPool();

  // 获取测试基本信息
  const testResult = await pool.query(
    `SELECT * FROM test_results 
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [testId, userId]
  );

  if (testResult.rows.length === 0) {
    
        return res.notFound('测试记录不存在');
      }

  const test = testResult.rows[0];

  // 根据测试类型获取详细结果
  let detailsTable = null;
  switch (test.test_type) {
    case TEST_TYPES.SEO:
      detailsTable = 'seo_test_details';
      break;
    case TEST_TYPES.PERFORMANCE:
      detailsTable = 'performance_test_details';
      break;
    case TEST_TYPES.SECURITY:
      detailsTable = 'security_test_details';
      break;
    case TEST_TYPES.API:
      detailsTable = 'api_test_details';
      break;
    case TEST_TYPES.COMPATIBILITY:
      detailsTable = 'compatibility_test_details';
      break;
    case TEST_TYPES.ACCESSIBILITY:
      detailsTable = 'accessibility_test_details';
      break;
    case TEST_TYPES.STRESS:
      detailsTable = 'stress_test_details';
      break;
  }

  let details = null;
  if (detailsTable) {
    const detailsResult = await pool.query(
      `SELECT * FROM ${detailsTable} WHERE test_id = $1`,
      [testId]
    );
    details = detailsResult.rows[0] || null;
  }

  // 获取测试文件
  const artifactsResult = await pool.query(
    `SELECT id, artifact_type, file_name, file_size, mime_type, description, created_at
     FROM test_artifacts WHERE test_id = $1`,
    [testId]
  );

  res.success({
    test,
    details,
    artifacts: artifactsResult.rows
  }, '获取测试详情成功');
}));

/**
 * POST /api/v1/tests/:type/start
 * 启动指定类型的测试
 */
router.post('/:type/start', authMiddleware, startTestValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.validationError('测试参数验证失败', formatValidationErrors(errors));
  }

  const testType = req.params.type;
  const userId = req.user.id;
  const userPlan = req.user.plan;

  // 验证测试类型
  if (!Object.values(TEST_TYPES).includes(testType)) {
    return res.badRequest('不支持的测试类型');
  }

  // 检查引擎状态
  const engineStatus = await getEngineStatus(testType);
  if (!engineStatus.available) {
    
        return res.error(
      ERROR_CODES.ENGINE_UNAVAILABLE,
      `${testType
      }测试引擎当前不可用`,
      engineStatus,
      503
    );
  }

  // 检查用户测试限制
  try {
    await checkTestLimits(userId, testType, userPlan);
  } catch (error) {
    return res.error(ERROR_CODES.PLAN_LIMIT_EXCEEDED, error.message, null, 403);
  }

  // 创建测试记录
  const testRecord = await createTestRecord(userId, testType, req.body);

  // 异步启动测试引擎
  setImmediate(async () => {
    try {
      await startTestEngine(testType, testRecord.id, req.body.url, req.body.config);
    } catch (error) {
      console.error(`测试引擎启动失败: ${testRecord.id}`, error);
    }
  });

  res.created({
    test: testRecord,
    message: `${testType}测试已启动，正在执行中`
  }, '测试启动成功');
}));

/**
 * DELETE /api/v1/tests/:id
 * 取消或删除测试
 */
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const testId = req.params.id;
  const userId = req.user.id;

  const pool = getPool();

  // 检查测试是否存在且属于当前用户
  const testResult = await pool.query(
    `SELECT id, status FROM test_results 
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [testId, userId]
  );

  if (testResult.rows.length === 0) {
    
        return res.notFound('测试记录不存在');
      }

  const test = testResult.rows[0];

  // 如果测试正在运行，则取消测试
  if (test.status === TEST_STATUS.RUNNING) {
    await pool.query(
      `UPDATE test_results 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      [TEST_STATUS.CANCELLED, testId]
    );

    // 这里应该通知测试引擎取消测试

    res.success(null, '测试已取消');
  } else {
    // 软删除测试记录
    await pool.query(
      `UPDATE test_results 
       SET deleted_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [testId]
    );

    res.success(null, '测试记录已删除');
  }
}));

/**
 * GET /api/v1/tests/engines/status
 * 获取所有测试引擎状态
 */
router.get('/engines/status', authMiddleware, asyncHandler(async (req, res) => {
  const engineStatuses = {};

  for (const testType of Object.values(TEST_TYPES)) {
    engineStatuses[testType] = await getEngineStatus(testType);
  }

  res.success(engineStatuses, '获取引擎状态成功');
}));

/**
 * GET /api/v1/tests/stats
 * 获取用户测试统计信息
 */
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const pool = getPool();

  // 获取总体统计
  const overallStatsResult = await pool.query(
    `SELECT 
      COUNT(*) as total_tests,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tests,
      COUNT(CASE WHEN status IN ('pending', 'running') THEN 1 END) as active_tests,
      AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as avg_score
    FROM test_results 
    WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  // 获取按类型统计
  const typeStatsResult = await pool.query(
    `SELECT 
      test_type,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      AVG(CASE WHEN overall_score IS NOT NULL THEN overall_score END) as avg_score
    FROM test_results 
    WHERE user_id = $1 AND deleted_at IS NULL
    GROUP BY test_type`,
    [userId]
  );

  // 获取最近7天的测试趋势
  const trendResult = await pool.query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM test_results 
    WHERE user_id = $1 AND deleted_at IS NULL 
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date`,
    [userId]
  );

  res.success({
    overall: overallStatsResult.rows[0],
    byType: typeStatsResult.rows,
    trend: trendResult.rows
  }, '获取测试统计成功');
}));

module.exports = router;
