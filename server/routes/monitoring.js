/**
 * 监控路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * 获取监控站点列表
 * GET /api/monitoring/sites
 */
router.get('/sites', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '监控功能开发中'
  });
}));

/**
 * 添加监控站点
 * POST /api/monitoring/sites
 */
router.post('/sites', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '监控功能开发中'
  });
}));

module.exports = router;
