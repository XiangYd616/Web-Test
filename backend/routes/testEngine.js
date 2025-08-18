/**
 * 统一测试引擎API路由
 * 使用完整的测试引擎服务
 */

const express = require('express');
const router = express.Router();
const testEngineService = require('../services/core/TestEngineService');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncErrorHandler');

/**
 * 获取所有可用的测试引擎
 * GET /api/test-engine/engines
 */
router.get('/engines', optionalAuth, asyncHandler(async (req, res) => {
  const engines = testEngineService.getAvailableEngines();
  const healthStatus = await testEngineService.getEngineHealthStatus();
  
  res.json({
    success: true,
    data: {
      engines,
      health: healthStatus,
      total: engines.length,
      healthy: Object.values(healthStatus).filter(status => status.healthy).length
    }
  });
}));

/**
 * 检查特定引擎的可用性
 * GET /api/test-engine/engines/:engineType/status
 */
router.get('/engines/:engineType/status', optionalAuth, asyncHandler(async (req, res) => {
  const { engineType } = req.params;
  
  try {
    const availability = await testEngineService.checkEngineAvailability(engineType);
    
    res.json({
      success: true,
      data: {
        engine: engineType,
        ...availability,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      engine: engineType
    });
  }
}));

/**
 * 启动单个测试
 * POST /api/test-engine/test/:testType
 */
router.post('/test/:testType', optionalAuth, asyncHandler(async (req, res) => {
  const { testType } = req.params;
  const { url, options = {} } = req.body;

  // 验证输入
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL是必需的'
    });
  }

  // 验证URL格式
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: '无效的URL格式'
    });
  }

  // 检查测试类型是否支持
  const availableEngines = testEngineService.getAvailableEngines();
  if (!availableEngines.includes(testType)) {
    return res.status(400).json({
      success: false,
      error: `不支持的测试类型: ${testType}`,
      availableTypes: availableEngines
    });
  }

  try {
    // 异步启动测试
    const result = await testEngineService.startTest(testType, url, options);
    
    res.json({
      success: true,
      data: {
        testId: result.testId,
        type: testType,
        url,
        status: result.status,
        message: '测试已启动'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      type: testType,
      url
    });
  }
}));

/**
 * 获取测试状态
 * GET /api/test-engine/test/:testId/status
 */
router.get('/test/:testId/status', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  
  const status = testEngineService.getTestStatus(testId);
  if (!status) {
    return res.status(404).json({
      success: false,
      error: '测试不存在'
    });
  }

  res.json({
    success: true,
    data: status
  });
}));

/**
 * 获取测试结果
 * GET /api/test-engine/test/:testId/result
 */
router.get('/test/:testId/result', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  
  const result = testEngineService.getTestResult(testId);
  if (!result) {
    return res.status(404).json({
      success: false,
      error: '测试结果不存在'
    });
  }

  res.json({
    success: true,
    data: result
  });
}));

/**
 * 停止测试
 * POST /api/test-engine/test/:testId/stop
 */
router.post('/test/:testId/stop', optionalAuth, asyncHandler(async (req, res) => {
  const { testId } = req.params;
  
  try {
    const result = await testEngineService.stopTest(testId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 运行综合测试
 * POST /api/test-engine/comprehensive
 */
router.post('/comprehensive', optionalAuth, asyncHandler(async (req, res) => {
  const { url, options = {} } = req.body;

  // 验证输入
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL是必需的'
    });
  }

  // 验证URL格式
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: '无效的URL格式'
    });
  }

  try {
    const result = await testEngineService.runComprehensiveTest(url, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      url
    });
  }
}));

/**
 * 获取引擎健康状态
 * GET /api/test-engine/health
 */
router.get('/health', optionalAuth, asyncHandler(async (req, res) => {
  try {
    const healthStatus = await testEngineService.getEngineHealthStatus();
    
    const totalEngines = Object.keys(healthStatus).length;
    const healthyEngines = Object.values(healthStatus).filter(status => status.healthy).length;
    const healthPercentage = totalEngines > 0 ? Math.round((healthyEngines / totalEngines) * 100) : 0;
    
    const overallStatus = healthPercentage >= 80 ? 'healthy' : 
                         healthPercentage >= 50 ? 'degraded' : 'unhealthy';

    res.json({
      success: true,
      data: {
        overall: {
          status: overallStatus,
          healthyEngines,
          totalEngines,
          healthPercentage,
          timestamp: new Date().toISOString()
        },
        engines: healthStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * 批量测试
 * POST /api/test-engine/batch
 */
router.post('/batch', optionalAuth, asyncHandler(async (req, res) => {
  const { tests } = req.body;

  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({
      success: false,
      error: '测试列表不能为空'
    });
  }

  const results = [];
  const errors = [];

  for (const test of tests) {
    try {
      const { type, url, options = {} } = test;
      
      if (!type || !url) {
        errors.push({
          test,
          error: '测试类型和URL是必需的'
        });
        continue;
      }

      const result = await testEngineService.startTest(type, url, options);
      results.push({
        test,
        result
      });
    } catch (error) {
      errors.push({
        test,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    data: {
      total: tests.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    }
  });
}));

/**
 * 获取测试历史
 * GET /api/test-engine/history
 */
router.get('/history', optionalAuth, asyncHandler(async (req, res) => {
  const { limit = 50, offset = 0, type } = req.query;
  
  // 这里应该从数据库获取历史记录
  // 目前返回内存中的数据作为示例
  const allResults = Array.from(testEngineService.testResults.values());
  
  let filteredResults = allResults;
  if (type) {
    filteredResults = allResults.filter(result => result.type === type);
  }

  const total = filteredResults.length;
  const paginatedResults = filteredResults
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    success: true,
    data: {
      results: paginatedResults,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    }
  });
}));

module.exports = router;
