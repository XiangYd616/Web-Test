/**
 * 测试对比API路由
 * 
 * 文件路径: backend/routes/comparison.js
 * 创建时间: 2025-11-14
 * 
 * 端点:
 * - POST   /api/comparison/compare     - 对比两个测试
 * - POST   /api/comparison/trend       - 趋势分析
 * - GET    /api/comparison/history/:testId - 获取测试历史
 */

const express = require('express');
const router = express.Router();
const ComparisonAnalyzer = require('../utils/ComparisonAnalyzer');
const Logger = require('../utils/logger');

const analyzer = new ComparisonAnalyzer();

/**
 * POST /api/comparison/compare
 * 对比两个测试结果
 */
router.post('/compare', async (req, res) => {
  try {
    const { currentResult, previousResult } = req.body;

    if (!currentResult || !previousResult) {
      return res.status(400).json({
        success: false,
        error: '需要提供currentResult和previousResult'
      });
    }

    const comparison = analyzer.compare(currentResult, previousResult);

    res.json({
      success: true,
      data: comparison
    });

    Logger.info(`对比完成: ${currentResult.testId} vs ${previousResult.testId}`);

  } catch (error) {
    Logger.error('对比失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/comparison/trend
 * 趋势分析（多个测试结果）
 */
router.post('/trend', async (req, res) => {
  try {
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        error: 'results必须是数组'
      });
    }

    const trend = analyzer.analyzeTrend(results);

    if (trend.error) {
      return res.status(400).json({
        success: false,
        error: trend.error
      });
    }

    res.json({
      success: true,
      data: trend
    });

    Logger.info(`趋势分析完成: ${results.length}个数据点`);

  } catch (error) {
    Logger.error('趋势分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/comparison/latest/:testType
 * 获取最新的测试结果用于对比
 */
router.get('/latest/:testType', async (req, res) => {
  try {
    const { testType } = req.params;
    const { limit = 10, url } = req.query;

    // 这里应该从数据库查询，现在返回示例
    res.json({
      success: true,
      data: {
        testType,
        message: '需要从数据库查询最新测试结果',
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    Logger.error('获取测试历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/comparison/summary/:testType
 * 获取测试类型的统计摘要
 */
router.get('/summary/:testType', async (req, res) => {
  try {
    const { testType } = req.params;
    const { period = '7d' } = req.query;

    // 这里应该从数据库统计，现在返回示例
    res.json({
      success: true,
      data: {
        testType,
        period,
        message: '需要从数据库统计测试数据'
      }
    });

  } catch (error) {
    Logger.error('获取统计摘要失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
