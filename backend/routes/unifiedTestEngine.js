/**
 * 🚀 统一测试引擎 API 路由
 * 为前端提供统一的测试服务接口
 */

const express = require('express');
const router = express.Router();
const unifiedTestEngine = require('../engines/core/UnifiedTestEngine');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validateTestConfig, validateTestId } = require('../middleware/unifiedEngineValidation');
const { unifiedEngineRateLimiter } = require('../middleware/rateLimiter');

// 应用中间件
router.use(authenticateToken);
router.use(unifiedEngineRateLimiter);

/**
 * 获取支持的测试类型
 * GET /api/unified-engine/test-types
 */
router.get('/test-types', async (req, res) => {
  try {
    const testTypes = unifiedTestEngine.getSupportedTestTypes();

    res.json({
      success: true,
      data: {
        testTypes,
        totalTypes: testTypes.length,
        engineVersion: unifiedTestEngine.version
      }
    });
  } catch (error) {
    console.error('获取测试类型失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试类型失败',
      message: error.message
    });
  }
});

/**
 * 执行测试
 * POST /api/unified-engine/execute
 */
router.post('/execute', requirePermission('test:execute'), validateTestConfig, async (req, res) => {
  try {
    const { testType, config, options = {} } = req.body;
    const userId = req.user.id;

    // 添加用户信息到选项
    options.userId = userId;
    options.userAgent = req.get('User-Agent');
    options.clientIP = req.ip;

    console.log(`🚀 用户 ${userId} 启动 ${testType} 测试`);

    // 执行测试
    const result = await unifiedTestEngine.executeTest(testType, config, options);

    res.json({
      success: true,
      data: {
        testId: result.testId,
        testType: result.testType,
        status: 'completed',
        result
      }
    });

  } catch (error) {
    console.error('测试执行失败:', error);
    res.status(500).json({
      success: false,
      error: '测试执行失败',
      message: error.message,
      code: error.code || 'TEST_EXECUTION_ERROR'
    });
  }
});

/**
 * 获取测试状态
 * GET /api/unified-engine/status/:testId
 */
router.get('/status/:testId', validateTestId, async (req, res) => {
  try {
    const { testId } = req.params;
    const status = unifiedTestEngine.getTestStatus(testId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: '测试不存在',
        message: `测试ID ${testId} 未找到`
      });
    }

    res.json({
      success: true,
      data: {
        testId,
        status: status.status,
        progress: status.progress,
        currentStep: status.currentStep,
        startTime: status.startTime,
        lastUpdate: status.lastUpdate,
        error: status.error
      }
    });

  } catch (error) {
    console.error('获取测试状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试状态失败',
      message: error.message
    });
  }
});

/**
 * 获取测试结果
 * GET /api/unified-engine/result/:testId
 */
router.get('/result/:testId', validateTestId, async (req, res) => {
  try {
    const { testId } = req.params;
    const result = unifiedTestEngine.getTestResult(testId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '测试结果不存在',
        message: `测试ID ${testId} 的结果未找到`
      });
    }

    res.json({
      success: true,
      data: {
        testId,
        result
      }
    });

  } catch (error) {
    console.error('获取测试结果失败:', error);
    res.status(500).json({
      success: false,
      error: '获取测试结果失败',
      message: error.message
    });
  }
});

/**
 * 取消测试
 * POST /api/unified-engine/cancel/:testId
 */
router.post('/cancel/:testId', validateTestId, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;

    // 验证测试所有权（可选）
    const status = unifiedTestEngine.getTestStatus(testId);
    if (!status) {
      return res.status(404).json({
        success: false,
        error: '测试不存在',
        message: `测试ID ${testId} 未找到`
      });
    }

    unifiedTestEngine.cancelTest(testId);

    console.log(`🛑 用户 ${userId} 取消测试 ${testId}`);

    res.json({
      success: true,
      data: {
        testId,
        status: 'cancelled',
        message: '测试已取消'
      }
    });

  } catch (error) {
    console.error('取消测试失败:', error);
    res.status(500).json({
      success: false,
      error: '取消测试失败',
      message: error.message
    });
  }
});

/**
 * 获取引擎健康状态
 * GET /api/unified-engine/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = unifiedTestEngine.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('健康检查失败:', error);
    res.status(500).json({
      success: false,
      error: '健康检查失败',
      message: error.message
    });
  }
});

/**
 * 获取引擎统计信息
 * GET /api/unified-engine/stats
 */
router.get('/stats', requirePermission('admin:view'), async (req, res) => {
  try {
    const stats = {
      activeTests: unifiedTestEngine.activeTests.size,
      totalResults: unifiedTestEngine.testResults.size,
      supportedTypes: unifiedTestEngine.testTypes.size,
      version: unifiedTestEngine.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取统计信息失败',
      message: error.message
    });
  }
});

/**
 * WebSocket 连接处理（用于实时进度更新）
 */
const setupWebSocket = (io) => {
  const engineNamespace = io.of('/unified-engine');

  engineNamespace.on('connection', (socket) => {
    console.log(`🔌 客户端连接到统一引擎: ${socket.id}`);

    // 监听测试进度更新
    const handleTestProgress = (testId, progress) => {
      socket.emit('testProgress', { testId, ...progress });
    };

    const handleTestCompleted = (testId, result) => {
      socket.emit('testCompleted', { testId, result });
    };

    const handleTestFailed = (testId, error) => {
      socket.emit('testFailed', { testId, error: error.message });
    };

    // 注册事件监听器
    unifiedTestEngine.on('testProgress', handleTestProgress);
    unifiedTestEngine.on('testCompleted', handleTestCompleted);
    unifiedTestEngine.on('testFailed', handleTestFailed);

    // 客户端断开连接时清理
    socket.on('disconnect', () => {
      console.log(`🔌 客户端断开连接: ${socket.id}`);
      unifiedTestEngine.off('testProgress', handleTestProgress);
      unifiedTestEngine.off('testCompleted', handleTestCompleted);
      unifiedTestEngine.off('testFailed', handleTestFailed);
    });

    // 客户端订阅特定测试的更新
    socket.on('subscribeTest', (testId) => {
      socket.join(`test-${testId}`);
      console.log(`📡 客户端 ${socket.id} 订阅测试 ${testId}`);
    });

    // 客户端取消订阅
    socket.on('unsubscribeTest', (testId) => {
      socket.leave(`test-${testId}`);
      console.log(`📡 客户端 ${socket.id} 取消订阅测试 ${testId}`);
    });
  });

  return engineNamespace;
};

// 错误处理中间件
router.use((error, req, res, next) => {
  console.error('统一引擎API错误:', error);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || '内部服务器错误',
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = { router, setupWebSocket };
