/**
 * 报告路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * 获取报告列表
 * GET /api/reports
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '报告功能开发中'
  });
}));

/**
 * 生成报告
 * POST /api/reports/generate
 */
router.post('/generate', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '报告功能开发中'
  });
}));

module.exports = router;
