/**
 * 数据管理路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * 导出数据
 * POST /api/data/export
 */
router.post('/export', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '数据导出功能开发中'
  });
}));

/**
 * 导入数据
 * POST /api/data/import
 */
router.post('/import', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '数据导入功能开发中'
  });
}));

module.exports = router;
