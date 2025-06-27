/**
 * 集成路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * 获取集成列表
 * GET /api/integrations
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '集成功能开发中'
  });
}));

/**
 * 创建集成
 * POST /api/integrations
 */
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '集成功能开发中'
  });
}));

module.exports = router;
