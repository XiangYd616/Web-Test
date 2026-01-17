/**
 * 高级分析API路由
 * 提供趋势分析、对比分析、性能分析等功能
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { authMiddleware } = require('../middleware/auth');
const advancedAnalyticsController = require('../../controllers/advancedAnalyticsController');

// 应用认证中间件
router.use(authMiddleware);

/**
 * 趋势分析
 */
router.post('/trend', asyncHandler((req, res, next) =>
  advancedAnalyticsController.analyzeTrend(req, res, next)
));

/**
 * 对比分析
 */
router.post('/compare', asyncHandler((req, res, next) =>
  advancedAnalyticsController.analyzeComparison(req, res, next)
));

/**
 * 性能指标分析
 */
router.post('/performance', asyncHandler((req, res, next) =>
  advancedAnalyticsController.analyzePerformance(req, res, next)
));

/**
 * 智能洞察
 */
router.post('/insights', asyncHandler((req, res, next) =>
  advancedAnalyticsController.generateInsights(req, res, next)
));
module.exports = router;
