/**
 * 测试引擎管理API路由
 * 
 * 文件路径: backend/routes/engines.js
 * 创建时间: 2025-11-14
 * 
 * 功能:
 * - 获取可用引擎列表
 * - 获取引擎详细信息
 * - 执行测试任务
 * - 获取引擎统计信息
 */

const express = require('express');
const router = express.Router();
const { testEngineService } = require('../services/core/TestEngineService');
const Logger = require('../utils/logger');

// 初始化统一测试引擎服务
let engineServiceReady = false;
const ensureEngineService = async () => {
  if (!engineServiceReady) {
    await testEngineService.initialize();
    engineServiceReady = true;
  }
};

/**
 * GET /api/engines
 * 获取所有可用的测试引擎列表
 */
router.get('/', async (req, res) => {
  try {
    await ensureEngineService();
    const engines = testEngineService.getEngines();
    
    res.json({
      success: true,
      data: engines,
      total: engines.length
    });
  } catch (error) {
    Logger.error('获取引擎列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取引擎列表失败',
      error: error.message
    });
  }
});

/**
 * GET /api/engines/statistics
 * 获取引擎统计信息
 */
router.get('/statistics', async (req, res) => {
  try {
    await ensureEngineService();
    const statistics = testEngineService.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    Logger.error('获取引擎统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取引擎统计失败',
      error: error.message
    });
  }
});

/**
 * GET /api/engines/:type
 * 获取指定引擎的详细信息
 */
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    await ensureEngineService();
    const engineInfo = testEngineService.getEngineInfo(type);
    
    if (!engineInfo) {
      return res.status(404).json({
        success: false,
        message: `引擎 ${type} 不存在`
      });
    }
    
    res.json({
      success: true,
      data: engineInfo
    });
  } catch (error) {
    Logger.error(`获取引擎 ${req.params.type} 信息失败:`, error);
    res.status(500).json({
      success: false,
      message: '获取引擎信息失败',
      error: error.message
    });
  }
});

/**
 * POST /api/engines/:type/test
 * 执行指定类型的测试
 */
router.post('/:type/test', async (req, res) => {
  try {
    const { type } = req.params;
    const config = req.body;
    
    await ensureEngineService();
    const availability = await testEngineService.checkEngineAvailability(type);
    if (!availability.available) {
      return res.status(404).json({
        success: false,
        message: `引擎 ${type} 不可用`
      });
    }

    Logger.info(`执行 ${type} 测试，配置:`, config);
    
    // 执行测试
    const result = await testEngineService.runTest(type, config);
    
    res.json({
      success: result.success,
      data: result
    });
    
  } catch (error) {
    Logger.error(`执行 ${req.params.type} 测试失败:`, error);
    res.status(500).json({
      success: false,
      message: '执行测试失败',
      error: error.message
    });
  }
});

/**
 * POST /api/engines/:type/reload
 * 重新加载指定引擎
 */
router.post('/:type/reload', async (req, res) => {
  try {
    const { type } = req.params;
    
    await ensureEngineService();
    const success = await testEngineService.reloadEngine(type);
    
    if (success) {
      res.json({
        success: true,
        message: `引擎 ${type} 重新加载成功`
      });
    } else {
      res.status(500).json({
        success: false,
        message: `引擎 ${type} 重新加载失败`
      });
    }
    
  } catch (error) {
    Logger.error(`重新加载引擎 ${req.params.type} 失败:`, error);
    res.status(500).json({
      success: false,
      message: '重新加载引擎失败',
      error: error.message
    });
  }
});

/**
 * POST /api/engines/batch
 * 批量执行多个测试
 */
router.post('/batch', async (req, res) => {
  try {
    const { tests } = req.body;
    
    if (!tests || !Array.isArray(tests)) {
      return res.status(400).json({
        success: false,
        message: '请提供tests数组'
      });
    }

    if (!engineManager) {
      return res.status(503).json({
        success: false,
        message: '测试引擎管理器未初始化'
      });
    }

    Logger.info(`批量执行 ${tests.length} 个测试`);
    
    const results = [];
    const startTime = Date.now();
    
    for (const test of tests) {
      try {
        const result = await testEngineService.runTest(test.type, test.config);
        results.push({
          type: test.type,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          type: test.type,
          success: false,
          error: error.message
        });
      }
    }
    
    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: {
        total: tests.length,
        successful: successCount,
        failed: tests.length - successCount,
        duration: `${duration}ms`,
        results
      }
    });
    
  } catch (error) {
    Logger.error('批量执行测试失败:', error);
    res.status(500).json({
      success: false,
      message: '批量执行测试失败',
      error: error.message
    });
  }
});

module.exports = router;
