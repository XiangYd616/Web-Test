/**
 * 统一测试管理API路由
 * 提供测试管理相关的所有接口
 */

const express = require('express');
const router = express.Router();
const { TestType, TestStatus, isValidTestType } = require('../../shared/types/unified-test-types');
const testEngineService = require('../services/core/TestEngineService');
const { optionalAuth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse
} = require('../../shared/utils/apiResponseBuilder');

/**
 * 获取所有支持的测试类型
 * GET /api/testing/types
 */
router.get('/types', optionalAuth, asyncHandler(async (req, res) => {
  const types = Object.values(TestType).map(type => ({
    type,
    ...testEngineService.getTestTypeConfig(type),
    available: testEngineService.engines.hasOwnProperty(type)
  }));

  res.json(createSuccessResponse(types, '获取测试类型成功'));
}));

/**
 * 批量执行测试
 * POST /api/testing/batch
 */
router.post('/batch', optionalAuth, asyncHandler(async (req, res) => {
  const { url, types = [], options = {} } = req.body;

  if (!url) {
    return res.status(400).json(
      createValidationErrorResponse([
        { field: 'url', message: 'URL是必需的' }
      ])
    );
  }

  // 验证测试类型
  const invalidTypes = types.filter(type => !isValidTestType(type));
  if (invalidTypes.length > 0) {
    return res.status(400).json(
      createValidationErrorResponse([
        { field: 'types', message: `无效的测试类型: ${invalidTypes.join(', ')}` }
      ])
    );
  }

  // 执行批量测试
  const results = [];
  const errors = [];

  for (const type of types) {
    try {
      const result = await testEngineService.startTest(type, url, options);
      results.push({
        type,
        testId: result.testId,
        status: 'started'
      });
    } catch (error) {
      errors.push({
        type,
        error: error.message
      });
    }
  }

  res.json(createSuccessResponse({
    results,
    errors,
    total: types.length,
    successful: results.length,
    failed: errors.length
  }, '批量测试已启动'));
}));

/**
 * 获取测试队列状态
 * GET /api/testing/queue
 */
router.get('/queue', optionalAuth, asyncHandler(async (req, res) => {
  const activeTests = Array.from(testEngineService.activeTests.values());
  
  const queue = {
    running: activeTests.filter(t => t.status === TestStatus.RUNNING),
    pending: activeTests.filter(t => t.status === TestStatus.PENDING),
    queued: activeTests.filter(t => t.status === TestStatus.QUEUED),
    total: activeTests.length
  };

  res.json(createSuccessResponse(queue, '获取队列状态成功'));
}));

/**
 * 取消所有测试
 * POST /api/testing/cancel-all
 */
router.post('/cancel-all', optionalAuth, asyncHandler(async (req, res) => {
  const activeTests = Array.from(testEngineService.activeTests.values());
  const cancelled = [];
  const failed = [];

  for (const test of activeTests) {
    if (test.status === TestStatus.RUNNING || test.status === TestStatus.PENDING) {
      try {
        await testEngineService.stopTest(test.id);
        cancelled.push(test.id);
      } catch (error) {
        failed.push({ id: test.id, error: error.message });
      }
    }
  }

  res.json(createSuccessResponse({
    cancelled,
    failed,
    totalCancelled: cancelled.length,
    totalFailed: failed.length
  }, '批量取消完成'));
}));

/**
 * 获取测试统计信息
 * GET /api/testing/stats
 */
router.get('/stats', optionalAuth, asyncHandler(async (req, res) => {
  const { period = '24h' } = req.query;
  
  const activeTests = Array.from(testEngineService.activeTests.values());
  const completedTests = Array.from(testEngineService.testResults.values());
  
  const stats = {
    period,
    active: {
      total: activeTests.length,
      byStatus: activeTests.reduce((acc, test) => {
        acc[test.status] = (acc[test.status] || 0) + 1;
        return acc;
      }, {}),
      byType: activeTests.reduce((acc, test) => {
        acc[test.type] = (acc[test.type] || 0) + 1;
        return acc;
      }, {})
    },
    completed: {
      total: completedTests.length,
      successful: completedTests.filter(t => t.status === TestStatus.COMPLETED).length,
      failed: completedTests.filter(t => t.status === TestStatus.FAILED).length,
      byType: completedTests.reduce((acc, test) => {
        acc[test.type] = (acc[test.type] || 0) + 1;
        return acc;
      }, {})
    },
    performance: {
      averageDuration: completedTests.length > 0
        ? completedTests.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTests.length
        : 0,
      minDuration: completedTests.length > 0
        ? Math.min(...completedTests.map(t => t.duration || 0))
        : 0,
      maxDuration: completedTests.length > 0
        ? Math.max(...completedTests.map(t => t.duration || 0))
        : 0
    }
  };

  res.json(createSuccessResponse(stats, '获取统计信息成功'));
}));

/**
 * 清理测试历史
 * DELETE /api/testing/history
 */
router.delete('/history', optionalAuth, asyncHandler(async (req, res) => {
  const { before, type } = req.query;
  
  let clearedCount = 0;
  const results = Array.from(testEngineService.testResults.entries());
  
  for (const [id, result] of results) {
    let shouldDelete = false;
    
    if (before) {
      const beforeDate = new Date(before);
      if (result.endTime && new Date(result.endTime) < beforeDate) {
        shouldDelete = true;
      }
    }
    
    if (type && result.type !== type) {
      shouldDelete = false;
    }
    
    if (shouldDelete || (!before && !type)) {
      testEngineService.testResults.delete(id);
      clearedCount++;
    }
  }

  res.json(createSuccessResponse({
    clearedCount,
    remaining: testEngineService.testResults.size
  }, `清理了 ${clearedCount} 条测试记录`));
}));

module.exports = router;
