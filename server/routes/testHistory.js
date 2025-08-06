/**
 * 测试历史API路由
 * 支持测试页面历史标签页的所有功能
 */

const express = require('express');
const router = express.Router();
const TestHistoryService = require('../services/TestHistoryService');
const { authMiddleware } = require('../middleware/auth');
// const { validateTestType, validatePagination, validateSorting, validateSearch, validateStatus, validateUUID } = require('../middleware/validation');

// 初始化服务
const testHistoryService = new TestHistoryService(require('../config/database').getPool());

/**
 * GET /api/test/history
 * 获取测试历史列表（用于测试页面历史标签页）
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      testType,
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // 验证测试类型
    const validTestTypes = ['stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'accessibility'];
    if (testType && !validTestTypes.includes(testType)) {
      return res.status(400).json({
        success: false,
        error: `无效的测试类型。支持的类型: ${validTestTypes.join(', ')}`
      });
    }

    const result = await testHistoryService.getTestHistory(userId, testType, {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      sortBy,
      sortOrder
    });

    res.json(result);
  } catch (error) {
    console.error('获取测试历史失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * GET /api/test/history/detailed
 * 获取详细测试历史（包含测试类型特定指标）
 */
router.get('/detailed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { testType, page = 1, limit = 20 } = req.query;

    // 验证测试类型
    const validTestTypes = ['stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'accessibility'];
    if (testType && !validTestTypes.includes(testType)) {
      return res.status(400).json({
        success: false,
        error: `无效的测试类型。支持的类型: ${validTestTypes.join(', ')}`
      });
    }

    const result = await testHistoryService.getDetailedTestHistory(userId, testType, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json(result);
  } catch (error) {
    console.error('获取详细测试历史失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * GET /api/test/history/:sessionId
 * 获取单个测试的完整详情
 */
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: '无效的会话ID格式'
      });
    }

    const result = await testHistoryService.getTestDetails(sessionId, userId);
    res.json(result);
  } catch (error) {
    console.error('获取测试详情失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * POST /api/test/history/stress
 * 创建压力测试记录
 */
router.post('/stress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { testName, url, config, stressData } = req.body;

    // 基础验证
    if (!testName || !url || !stressData) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的测试数据'
      });
    }

    const result = await testHistoryService.createStressTestResult(userId, {
      testName,
      url,
      config: config || {},
      stressData
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('创建压力测试记录失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * POST /api/test/history/security
 * 创建安全测试记录
 */
router.post('/security', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { testName, url, config, securityData } = req.body;

    // 基础验证
    if (!testName || !url || !securityData) {
      return res.status(400).json({
        success: false,
        error: '缺少必要的测试数据'
      });
    }

    const result = await testHistoryService.createSecurityTestResult(userId, {
      testName,
      url,
      config: config || {},
      securityData
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('创建安全测试记录失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * DELETE /api/test/history/:sessionId
 * 删除单个测试记录（软删除）
 */
router.delete('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({
        success: false,
        error: '无效的会话ID格式'
      });
    }

    const result = await testHistoryService.deleteTestSession(sessionId, userId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('删除测试记录失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * DELETE /api/test/history/batch
 * 批量删除测试记录（软删除）
 */
router.delete('/batch', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionIds } = req.body;

    // 验证输入
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的测试记录ID列表'
      });
    }

    // 验证UUID格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = sessionIds.filter(id => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: '包含无效的会话ID格式'
      });
    }

    const result = await testHistoryService.batchDeleteTestSessions(sessionIds, userId);
    res.json(result);
  } catch (error) {
    console.error('批量删除测试记录失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * GET /api/test/history/statistics
 * 获取测试统计信息
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeRange = 30 } = req.query;

    // 验证时间范围
    const timeRangeNum = parseInt(timeRange);
    if (isNaN(timeRangeNum) || timeRangeNum < 1 || timeRangeNum > 365) {
      return res.status(400).json({
        success: false,
        error: '无效的时间范围（1-365天）'
      });
    }

    const result = await testHistoryService.getTestStatistics(userId, timeRangeNum);
    res.json(result);
  } catch (error) {
    console.error('获取测试统计失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

/**
 * GET /api/test/history/export
 * 导出测试历史数据
 */
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { testType, format = 'json', startDate, endDate } = req.query;

    // 验证测试类型
    if (!testType || !['stress', 'security', 'api', 'performance', 'compatibility', 'seo', 'accessibility'].includes(testType)) {
      return res.status(400).json({
        success: false,
        error: '无效的测试类型'
      });
    }

    // 验证导出格式
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: '不支持的导出格式'
      });
    }

    // 获取数据（不分页，获取所有数据）
    const result = await testHistoryService.getDetailedTestHistory(userId, testType, {
      page: 1,
      limit: 10000 // 设置一个较大的限制
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // 设置响应头
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${testType}_test_history_${timestamp}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.json(result.data.tests);
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');

      // 简单的CSV转换（实际项目中可能需要更复杂的CSV库）
      const tests = result.data.tests;
      if (tests.length === 0) {
        return res.send('');
      }

      const headers = Object.keys(tests[0]).join(',');
      const rows = tests.map(test =>
        Object.values(test).map(value =>
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );

      res.send([headers, ...rows].join('\n'));
    }
  } catch (error) {
    console.error('导出测试历史失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

module.exports = router;
