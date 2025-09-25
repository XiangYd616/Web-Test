/**
 * 系统路由
 * 处理系统配置、监控等管理功能
 */

const express = require('express');
const { body, validationResult } = require('express-validator');

const { getPool, healthCheck, getStats } = require('../config/database');
const { requireRole, ROLES } = require('../middleware/auth.js');
const { asyncHandler } = require('../middleware/errorHandler.js');
const { formatValidationErrors } = require('../middleware/responseFormatter.js');

const router = express.Router();

// =====================================================
// 验证规则
// =====================================================

const configValidation = [
  body('category')
    .notEmpty()
    .withMessage('配置分类不能为空')
    .isLength({ max: 50 })
    .withMessage('配置分类长度不能超过50个字符'),

  body('key')
    .notEmpty()
    .withMessage('配置键不能为空')
    .isLength({ max: 100 })
    .withMessage('配置键长度不能超过100个字符'),

  body('value')
    .notEmpty()
    .withMessage('配置值不能为空'),

  body('dataType')
    .optional()
    .isIn(['string', 'number', 'boolean', 'json'])
    .withMessage('数据类型必须是string、number、boolean或json'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500个字符')
];

// =====================================================
// 辅助函数
// =====================================================

/**
 * 格式化配置值
 */
const formatConfigValue = (value, dataType) => {
  switch (dataType) {
    case 'number':
      return parseFloat(value);
    case 'boolean':
      return value === 'true' || value === true;
    case 'json':
      return typeof value === 'string' ? JSON.parse(value) : value;
    default:
      return value;
  }
};

/**
 * 获取系统信息
 */
const getSystemInfo = () => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    env: process.env.NODE_ENV,
    pid: process.pid
  };
};

// =====================================================
// 路由处理器
// =====================================================

/**
 * GET /api/v1/system/info
 * 获取系统信息
 */
router.get('/info', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const systemInfo = getSystemInfo();
  const dbHealth = await healthCheck();
  const dbStats = await getStats();

  res.success({
    system: systemInfo,
    database: {
      health: dbHealth,
      stats: dbStats
    },
    timestamp: new Date().toISOString()
  }, '获取系统信息成功');
}));

/**
 * GET /api/v1/system/config
 * 获取系统配置
 */
router.get('/config', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { category, includePrivate = false } = req.query;
  const pool = getPool();

  let whereConditions = [];
  let queryParams = [];
  let paramIndex = 1;

  if (category) {
    whereConditions.push(`category = $${paramIndex}`);
    queryParams.push(category);
    paramIndex++;
  }

  if (!includePrivate) {
    whereConditions.push('is_public = true');
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT category, key, value, data_type, description, is_public, created_at, updated_at
     FROM system_config 
     ${whereClause}
     ORDER BY category, key`,
    queryParams
  );

  // 按分类组织配置
  const configByCategory = {};
  result.rows.forEach(config => {
    if (!configByCategory[config.category]) {
      configByCategory[config.category] = {};
    }

    configByCategory[config.category][config.key] = {
      value: formatConfigValue(config.value, config.data_type),
      dataType: config.data_type,
      description: config.description,
      isPublic: config.is_public,
      updatedAt: config.updated_at
    };
  });

  res.success(configByCategory, '获取系统配置成功');
}));

/**
 * PUT /api/v1/system/config
 * 更新系统配置
 */
router.put('/config', requireRole(ROLES.ADMIN), configValidation, asyncHandler(async (req, res) => {
  // 验证输入
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.validationError('配置验证失败', formatValidationErrors(errors));
  }

  const { category, key, value, dataType = 'string', description, isPublic = false } = req.body;
  const pool = getPool();

  // 验证JSON格式（如果是JSON类型）
  if (dataType === 'json') {
    try {
      JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
      return res.badRequest('无效的JSON格式');
    }
  }

  // 更新或插入配置
  const result = await pool.query(
    `INSERT INTO system_config (category, key, value, data_type, description, is_public)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (category, key) 
     DO UPDATE SET 
       value = EXCLUDED.value,
       data_type = EXCLUDED.data_type,
       description = EXCLUDED.description,
       is_public = EXCLUDED.is_public,
       updated_at = NOW()
     RETURNING *`,
    [category, key, value, dataType, description, isPublic]
  );

  const config = result.rows[0];

  res.success({
    category: config.category,
    key: config.key,
    value: formatConfigValue(config.value, config.data_type),
    dataType: config.data_type,
    description: config.description,
    isPublic: config.is_public,
    updatedAt: config.updated_at
  }, '系统配置更新成功');
}));

/**
 * DELETE /api/v1/system/config/:category/:key
 * 删除系统配置
 */
router.delete('/config/:category/:key', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { category, key } = req.params;
  const pool = getPool();

  const result = await pool.query(
    'DELETE FROM system_config WHERE category = $1 AND key = $2 RETURNING *',
    [category, key]
  );

  if (result.rows.length === 0) {
    
        return res.notFound('配置项不存在');
      }

  res.success(null, '配置删除成功');
}));

/**
 * GET /api/v1/system/engines
 * 获取测试引擎状态
 */
router.get('/engines', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const pool = getPool();

  const result = await pool.query(
    `SELECT engine_type, engine_version, status, last_check, response_time, 
            error_message, metadata, created_at, updated_at
     FROM engine_status 
     ORDER BY engine_type`
  );

  res.success(result.rows, '获取引擎状态成功');
}));

/**
 * PUT /api/v1/system/engines/:type
 * 更新测试引擎状态
 */
router.put('/engines/:type', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const engineType = req.params.type;
  const { status, errorMessage, metadata } = req.body;
  const pool = getPool();

  // 验证状态值
  const validStatuses = ['healthy', 'degraded', 'down'];
  if (status && !validStatuses.includes(status)) {
    return res.badRequest('无效的引擎状态');
  }

  const result = await pool.query(
    `UPDATE engine_status 
     SET status = COALESCE($1, status),
         error_message = $2,
         metadata = COALESCE($3, metadata),
         last_check = NOW(),
         updated_at = NOW()
     WHERE engine_type = $4
     RETURNING *`,
    [status, errorMessage, metadata ? JSON.stringify(metadata) : null, engineType]
  );

  if (result.rows.length === 0) {
    
        return res.notFound('引擎不存在');
      }

  res.success(result.rows[0], '引擎状态更新成功');
}));

/**
 * POST /api/v1/system/maintenance
 * 执行系统维护
 */
router.post('/maintenance', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const pool = getPool();

  try {
    // 执行数据库维护函数
    const result = await pool.query('SELECT perform_maintenance() as result');
    const maintenanceResult = result.rows[0].result;

    res.success({
      result: maintenanceResult,
      timestamp: new Date().toISOString()
    }, '系统维护执行成功');

  } catch (error) {
    res.internalError('系统维护执行失败', error.message);
  }
}));

/**
 * GET /api/v1/system/logs
 * 获取系统日志（简化版本）
 */
router.get('/logs', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { level = 'info', limit = 100 } = req.query;

  // 这里应该从日志文件或日志服务中获取日志
  // 暂时返回模拟数据
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: '系统正常运行',
      source: 'system'
    }
  ];

  res.success(logs, '获取系统日志成功');
}));

/**
 * GET /api/v1/system/stats
 * 获取系统统计信息
 */
router.get('/stats', requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  const pool = getPool();

  // 获取用户统计
  const userStatsResult = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
      COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_users_week
    FROM users
  `);

  // 获取测试统计
  const testStatsResult = await pool.query(`
    SELECT 
      COUNT(*) as total_tests,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tests,
      COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as tests_today,
      test_type,
      COUNT(*) as count_by_type
    FROM test_results 
    WHERE deleted_at IS NULL
    GROUP BY ROLLUP(test_type)
  `);

  // 获取系统资源使用情况
  const systemInfo = getSystemInfo();
  const dbStats = await getStats();

  res.success({
    users: userStatsResult.rows[0],
    tests: testStatsResult.rows,
    system: systemInfo,
    database: dbStats,
    timestamp: new Date().toISOString()
  }, '获取系统统计成功');
}));

module.exports = router;
