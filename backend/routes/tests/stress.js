/**
 * 压力测试API路由
 * 
 * 文件路径: backend/routes/tests/stress.js
 * 创建时间: 2025-11-14
 * 
 * 端点:
 * - POST   /api/test/stress        - 启动压力测试
 * - GET    /api/test/stress        - 查询压力测试历史
 * - GET    /api/test/stress/:id    - 获取压力测试详情
 * - DELETE /api/test/stress/:id    - 删除压力测试记录
 * - GET    /api/test/stress/stats  - 获取压力测试统计
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Logger = require('../../utils/logger');

// 动态导入模型（如果数据库已配置）
let StressTestResult = null;
try {
  const db = require('../../database');
  if (db && db.StressTestResult) {
    StressTestResult = db.StressTestResult;
  }
} catch (error) {
  Logger.warn('数据库模型未加载，使用内存存储');
}

// 内存存储（如果数据库不可用）
const inMemoryStore = new Map();

/**
 * POST /api/test/stress
 * 启动压力测试
 */
router.post('/', async (req, res) => {
  try {
    const { url, testName, duration, concurrency, method, headers, data, pattern } = req.body;

    // 验证必需参数
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: url'
      });
    }

    // 创建测试ID
    const testId = uuidv4();

    // 准备测试配置
    const config = {
      url,
      duration: duration || 60,
      concurrency: concurrency || 10,
      method: method || 'GET',
      headers: headers || {},
      data: data || null,
      pattern: pattern || 'constant'
    };

    // 创建测试记录
    const testRecord = {
      testId,
      testName: testName || `Stress Test - ${new Date().toISOString()}`,
      url,
      config,
      status: 'pending',
      startTime: new Date(),
      userId: req.user?.id || null
    };

    // 保存到数据库或内存
    if (StressTestResult) {
      await StressTestResult.create(testRecord);
    } else {
      inMemoryStore.set(testId, testRecord);
    }

    // 返回测试ID（实际测试将通过WebSocket执行）
    res.json({
      success: true,
      data: {
        testId,
        message: '压力测试已创建，请通过WebSocket连接获取实时进度',
        websocketEvent: 'stress:start',
        config
      }
    });

    Logger.info(`创建压力测试: ${testId} - ${url}`);

  } catch (error) {
    Logger.error('创建压力测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/stress
 * 查询压力测试历史
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      status,
      url,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    let results, total;

    if (StressTestResult) {
      // 从数据库查询
      const where = {};
      if (status) where.status = status;
      if (url) where.url = url;
      if (req.user?.id) where.userId = req.user.id;

      const order = [[sortBy, sortOrder.toUpperCase()]];

      const { rows, count } = await StressTestResult.findAndCountAll({
        where,
        limit,
        offset,
        order
      });

      results = rows;
      total = count;
    } else {
      // 从内存查询
      results = Array.from(inMemoryStore.values())
        .filter(r => {
          if (status && r.status !== status) return false;
          if (url && r.url !== url) return false;
          return true;
        })
        .sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
        })
        .slice(offset, offset + limit);

      total = inMemoryStore.size;
    }

    res.json({
      success: true,
      data: {
        records: results,
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    Logger.error('查询压力测试历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/stress/:id
 * 获取压力测试详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let result;

    if (StressTestResult) {
      result = await StressTestResult.findOne({
        where: { testId: id }
      });
    } else {
      result = inMemoryStore.get(id);
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '测试记录不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    Logger.error('获取压力测试详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/test/stress/:id
 * 删除压力测试记录
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let deleted = false;

    if (StressTestResult) {
      const result = await StressTestResult.findOne({
        where: { testId: id }
      });

      if (result) {
        await result.destroy();
        deleted = true;
      }
    } else {
      deleted = inMemoryStore.delete(id);
    }

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '测试记录不存在'
      });
    }

    res.json({
      success: true,
      message: '测试记录已删除'
    });

    Logger.info(`删除压力测试记录: ${id}`);

  } catch (error) {
    Logger.error('删除压力测试记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/stress/stats/summary
 * 获取压力测试统计
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let stats;

    if (StressTestResult) {
      stats = await StressTestResult.getStatistics({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        userId: req.user?.id
      });
    } else {
      // 内存统计
      const results = Array.from(inMemoryStore.values())
        .filter(r => r.status === 'completed');

      if (results.length === 0) {
        stats = {
          totalTests: 0,
          avgSuccessRate: 0,
          avgResponseTime: 0,
          avgThroughput: 0
        };
      } else {
        stats = {
          totalTests: results.length,
          avgSuccessRate: results.reduce((sum, r) => sum + (r.successRate || 0), 0) / results.length,
          avgResponseTime: results.reduce((sum, r) => sum + (r.avgResponseTime || 0), 0) / results.length,
          avgThroughput: results.reduce((sum, r) => sum + (r.throughput || 0), 0) / results.length
        };
      }
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    Logger.error('获取压力测试统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test/stress/:id/compare
 * 对比两次压力测试结果
 */
router.post('/:id/compare', async (req, res) => {
  try {
    const { id } = req.params;
    const { compareWithId } = req.body;

    if (!compareWithId) {
      return res.status(400).json({
        success: false,
        error: '缺少对比测试ID'
      });
    }

    let result1, result2;

    if (StressTestResult) {
      result1 = await StressTestResult.findOne({ where: { testId: id } });
      result2 = await StressTestResult.findOne({ where: { testId: compareWithId } });
    } else {
      result1 = inMemoryStore.get(id);
      result2 = inMemoryStore.get(compareWithId);
    }

    if (!result1 || !result2) {
      return res.status(404).json({
        success: false,
        error: '测试记录不存在'
      });
    }

    const comparison = StressTestResult 
      ? StressTestResult.compare(result1, result2)
      : compareResults(result1, result2);

    res.json({
      success: true,
      data: {
        current: result1,
        previous: result2,
        comparison
      }
    });

  } catch (error) {
    Logger.error('对比压力测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 简单的对比函数（内存模式）
 */
function compareResults(result1, result2) {
  return {
    successRate: {
      current: result1.successRate,
      previous: result2.successRate,
      change: result1.successRate - result2.successRate,
      changePercent: ((result1.successRate - result2.successRate) / result2.successRate * 100).toFixed(2)
    },
    avgResponseTime: {
      current: result1.avgResponseTime,
      previous: result2.avgResponseTime,
      change: result1.avgResponseTime - result2.avgResponseTime,
      changePercent: ((result1.avgResponseTime - result2.avgResponseTime) / result2.avgResponseTime * 100).toFixed(2)
    },
    throughput: {
      current: result1.throughput,
      previous: result2.throughput,
      change: result1.throughput - result2.throughput,
      changePercent: ((result1.throughput - result2.throughput) / result2.throughput * 100).toFixed(2)
    }
  };
}

module.exports = router;
