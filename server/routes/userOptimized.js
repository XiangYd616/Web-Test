/**
 * 优化的用户路由
 * 展示如何减少不必要的数据转换
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const OptimizedQueries = require('../utils/optimizedQueries');

const router = express.Router();

/**
 * 获取用户资料 - 优化版本
 * GET /api/user/profile
 */
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 使用优化查询，直接返回 camelCase 字段
    const user = await OptimizedQueries.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 直接返回，无需额外转换
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
}));

/**
 * 获取用户列表 - 优化版本（管理员）
 * GET /api/user/list
 */
router.get('/list', authMiddleware, asyncHandler(async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const filters = {
      role: req.query.role,
      status: req.query.status
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    // 使用优化查询，直接返回分页结果
    const result = await OptimizedQueries.getUserList(filters, pagination);

    res.json({
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
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
 * 获取测试历史 - 优化版本
 * GET /api/user/test-history
 */
router.get('/test-history', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    const filters = {
      testType: req.query.testType,
      status: req.query.status
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    // 使用优化查询，直接返回测试历史
    const testHistory = await OptimizedQueries.getTestHistory(userId, filters, pagination);

    res.json({
      success: true,
      data: testHistory
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
