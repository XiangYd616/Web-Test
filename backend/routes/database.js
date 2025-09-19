/**
 * 数据库测试路由
 * 处理数据库性能、连接、查询等测试请求
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const DatabaseTestEngine = require('../engines/database/DatabaseTestEngine');
const { validateTestRequest } = require('../middleware/validation');

// 创建测试引擎实例
const dbTestEngine = new DatabaseTestEngine();

/**
 * @route POST /api/database/test
 * @desc 执行数据库测试
 * @access Private
 */
router.post('/test', authenticateToken, validateTestRequest, async (req, res) => {
  try {
    const { url, config } = req.body;
    const userId = req.user.id;
    
    // 记录测试开始
    console.log(`[Database Test] Starting test for ${url} by user ${userId}`);
    
    // 执行测试
    const result = await dbTestEngine.runTest({
      connectionString: url,
      testConfig: config,
      userId
    });
    
    res.json({
      success: true,
      data: result,
      message: '数据库测试完成'
    });
  } catch (error) {
    console.error('[Database Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '数据库测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/database/connection-test
 * @desc 测试数据库连接
 * @access Private
 */
router.post('/connection-test', authenticateToken, async (req, res) => {
  try {
    const { connectionString, dbType } = req.body;
    
    if (!connectionString) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少数据库连接字符串' }
      });
    }
    
    // 测试连接
    const connectionResult = await dbTestEngine.testConnection({
      connectionString,
      dbType: dbType || 'postgresql'
    });
    
    res.json({
      success: true,
      data: connectionResult
    });
  } catch (error) {
    console.error('[Database Connection Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '连接测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/database/query-performance
 * @desc 测试SQL查询性能
 * @access Private
 */
router.post('/query-performance', authenticateToken, async (req, res) => {
  try {
    const { connectionString, queries, iterations = 10 } = req.body;
    
    if (!connectionString || !queries || !Array.isArray(queries)) {
      return res.status(400).json({
        success: false,
        error: { message: '参数不完整' }
      });
    }
    
    // 执行查询性能测试
    const performanceResults = await dbTestEngine.testQueryPerformance({
      connectionString,
      queries,
      iterations
    });
    
    res.json({
      success: true,
      data: performanceResults,
      message: '查询性能测试完成'
    });
  } catch (error) {
    console.error('[Query Performance Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '查询性能测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/database/load-test
 * @desc 数据库负载测试
 * @access Private
 */
router.post('/load-test', authenticateToken, async (req, res) => {
  try {
    const { connectionString, concurrent = 10, duration = 60 } = req.body;
    
    if (!connectionString) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少数据库连接字符串' }
      });
    }
    
    // 执行负载测试
    const loadTestResult = await dbTestEngine.runLoadTest({
      connectionString,
      concurrent,
      duration
    });
    
    res.json({
      success: true,
      data: loadTestResult,
      message: '数据库负载测试完成'
    });
  } catch (error) {
    console.error('[Database Load Test Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '负载测试失败',
        details: error.message
      }
    });
  }
});

/**
 * @route GET /api/database/test-history
 * @desc 获取数据库测试历史
 * @access Private
 */
router.get('/test-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    // 获取测试历史（实际应该从数据库查询）
    const history = await dbTestEngine.getTestHistory({
      userId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('[Get Test History Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取测试历史失败',
        details: error.message
      }
    });
  }
});

/**
 * @route POST /api/database/optimize-suggestions
 * @desc 获取数据库优化建议
 * @access Private
 */
router.post('/optimize-suggestions', authenticateToken, async (req, res) => {
  try {
    const { connectionString, includeIndexes = true, includeQueries = true } = req.body;
    
    if (!connectionString) {
      return res.status(400).json({
        success: false,
        error: { message: '缺少数据库连接字符串' }
      });
    }
    
    // 获取优化建议
    const suggestions = await dbTestEngine.getOptimizationSuggestions({
      connectionString,
      includeIndexes,
      includeQueries
    });
    
    res.json({
      success: true,
      data: suggestions,
      message: '优化建议生成完成'
    });
  } catch (error) {
    console.error('[Get Optimization Suggestions Error]:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取优化建议失败',
        details: error.message
      }
    });
  }
});

module.exports = router;
