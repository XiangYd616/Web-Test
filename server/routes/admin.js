/**
 * 管理员路由
 */

const express = require('express');
const { query } = require('../config/database');
const { authMiddleware, adminAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// 所有管理员路由都需要管理员权限
router.use(authMiddleware, adminAuth);

/**
 * 获取系统统计
 * GET /api/admin/stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const [usersResult, testsResult, activeUsersResult] = await Promise.all([
      query('SELECT COUNT(*) as total FROM users'),
      query('SELECT COUNT(*) as total FROM test_sessions WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) as total FROM users WHERE last_login >= NOW() - INTERVAL \'30 days\'')
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(usersResult.rows[0].total),
        totalTests: parseInt(testsResult.rows[0].total),
        activeUsers: parseInt(activeUsersResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('获取系统统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统统计失败'
    });
  }
}));

/**
 * 获取用户列表
 * GET /api/admin/users
 */
router.get('/users', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (search) {
    whereClause = 'WHERE username ILIKE $1 OR email ILIKE $1';
    params.push(`%${search}%`);
    paramIndex = 2;
  }

  try {
    const usersResult = await query(
      `SELECT id, username, email, role, is_active, created_at, last_login
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
}));

/**
 * 更新用户状态
 * PUT /api/admin/users/:userId/status
 */
router.put('/users/:userId/status', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: '状态值必须是布尔类型'
    });
  }

  try {
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isActive, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      message: '用户状态更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户状态失败'
    });
  }
}));

/**
 * 获取系统日志
 * GET /api/admin/logs
 */
router.get('/logs', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, type } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (type) {
    whereClause = 'WHERE action = $1';
    params.push(type);
    paramIndex = 2;
  }

  try {
    const logsResult = await query(
      `SELECT id, user_id, action, description, metadata, created_at
       FROM activity_logs 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM activity_logs ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取系统日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统日志失败'
    });
  }
}));

/**
 * 获取测试历史记录
 * GET /api/admin/test-history
 */
router.get('/test-history', asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, user } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];
    let paramIndex = 1;

    const conditions = [];

    if (type) {
      conditions.push(`test_type = $${paramIndex++}`);
      params.push(type);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (user) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(user);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    const testHistoryQuery = `
      SELECT
        ts.id,
        ts.test_type as type,
        ts.url,
        ts.status,
        ts.created_at as "createdAt",
        ts.updated_at as "updatedAt",
        ts.duration,
        ts.overall_score as "overallScore",
        ts.grade as "performanceGrade",
        ts.total_issues as "totalIssues",
        ts.critical_issues as "criticalIssues",
        ts.major_issues as "majorIssues",
        ts.minor_issues as "minorIssues",
        ts.environment,
        ts.tags,
        u.username as user,
        u.email as "userEmail"
      FROM test_sessions ts
      LEFT JOIN users u ON ts.user_id = u.id
      ${whereClause ? whereClause + ' AND ts.deleted_at IS NULL' : 'WHERE ts.deleted_at IS NULL'}
      ORDER BY ts.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM test_sessions ts
      LEFT JOIN users u ON ts.user_id = u.id
      ${whereClause ? whereClause + ' AND ts.deleted_at IS NULL' : 'WHERE ts.deleted_at IS NULL'}
    `;

    const [testHistoryResult, countResult] = await Promise.all([
      query(testHistoryQuery, params.slice(0, -2)), // 移除limit和offset参数用于count查询
      query(countQuery, params.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: testHistoryResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取测试历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取测试历史失败'
    });
  }
}));

module.exports = router;
