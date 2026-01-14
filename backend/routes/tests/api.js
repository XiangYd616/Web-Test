/**
 * API测试路由
 * 
 * 文件路径: backend/routes/tests/api.js
 * 创建时间: 2025-11-14
 * 
 * 端点:
 * - POST   /api/test/api           - 执行API测试
 * - GET    /api/test/api           - 查询API测试历史
 * - GET    /api/test/api/:id       - 获取API测试详情
 * - DELETE /api/test/api/:id       - 删除API测试记录
 * - GET    /api/test/api/validate  - 验证断言配置
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Logger = require('../../utils/logger');
const { AssertionSystem, createAssertion, presets } = require('../../engines/api/AssertionSystem');

// 内存存储
const inMemoryStore = new Map();

/**
 * POST /api/test/api
 * 执行API测试
 */
router.post('/', async (req, res) => {
  try {
    const {
      url,
      testName,
      method = 'GET',
      headers = {},
      data = null,
      params = {},
      assertions = []
    } = req.body;

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
      method,
      headers,
      data,
      params,
      assertions
    };

    // 创建断言系统
    const assertionSystem = new AssertionSystem();

    // 应用断言
    if (assertions && assertions.length > 0) {
      assertions.forEach(assertion => {
        const { type, ...args } = assertion;
        if (typeof assertionSystem[type] === 'function') {
          assertionSystem[type](...Object.values(args));
        }
      });
    }

    // 创建测试记录
    const testRecord = {
      testId,
      testName: testName || `API Test - ${new Date().toISOString()}`,
      url,
      method,
      config,
      status: 'pending',
      startTime: new Date(),
      userId: req.user?.id || null
    };

    // 保存到内存
    inMemoryStore.set(testId, testRecord);

    // 返回测试ID
    res.json({
      success: true,
      data: {
        testId,
        message: 'API测试已创建，请通过WebSocket连接获取实时结果',
        websocketEvent: 'api:start',
        config,
        assertionCount: assertions.length
      }
    });

    Logger.info(`创建API测试: ${testId} - ${method} ${url}`);

  } catch (error) {
    Logger.error('创建API测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test/api/execute
 * 同步执行API测试（无需WebSocket）
 */
router.post('/execute', async (req, res) => {
  try {
    const {
      url,
      method = 'GET',
      headers = {},
      data = null,
      params = {},
      assertions = [],
      timeout = 10000
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数: url'
      });
    }

    // 动态加载API测试引擎
    const ApiTestEngine = require('../../engines/apiTestEngine');
    const engine = new ApiTestEngine();

    // 执行测试
    const startTime = Date.now();
    const result = await engine.runTest({
      url,
      method,
      headers,
      data,
      params,
      assertions,
      timeout
    });
    const duration = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        testId: uuidv4(),
        duration,
        result,
        timestamp: new Date()
      }
    });

  } catch (error) {
    Logger.error('执行API测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/api
 * 查询API测试历史
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      status,
      method,
      url,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = req.query;

    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // 从内存查询
    const results = Array.from(inMemoryStore.values())
      .filter(r => {
        if (status && r.status !== status) return false;
        if (method && r.method !== method) return false;
        if (url && !r.url.includes(url)) return false;
        if (req.user?.id && r.userId !== req.user.id) return false;
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      })
      .slice(offset, offset + limit);

    const total = inMemoryStore.size;

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
    Logger.error('查询API测试历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/api/:id
 * 获取API测试详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = inMemoryStore.get(id);

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
    Logger.error('获取API测试详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/test/api/:id
 * 删除API测试记录
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = inMemoryStore.delete(id);

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

    Logger.info(`删除API测试记录: ${id}`);

  } catch (error) {
    Logger.error('删除API测试记录失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test/api/validate
 * 验证断言配置
 */
router.post('/validate', async (req, res) => {
  try {
    const { assertions } = req.body;

    if (!assertions || !Array.isArray(assertions)) {
      return res.status(400).json({
        success: false,
        error: '断言配置必须是数组'
      });
    }

    const validationResults = [];
    const assertionSystem = new AssertionSystem();

    for (const assertion of assertions) {
      const { type, ...args } = assertion;

      if (!type) {
        validationResults.push({
          valid: false,
          error: '断言类型不能为空'
        });
        continue;
      }

      if (typeof assertionSystem[type] !== 'function') {
        validationResults.push({
          valid: false,
          type,
          error: `不支持的断言类型: ${type}`
        });
        continue;
      }

      validationResults.push({
        valid: true,
        type,
        args
      });
    }

    const allValid = validationResults.every(r => r.valid);

    res.json({
      success: true,
      data: {
        valid: allValid,
        results: validationResults,
        totalAssertions: assertions.length,
        validAssertions: validationResults.filter(r => r.valid).length
      }
    });

  } catch (error) {
    Logger.error('验证断言配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/api/presets
 * 获取预设断言
 */
router.get('/presets/list', async (req, res) => {
  try {
    const presetList = [
      {
        name: 'success',
        description: '检查200状态码和JSON响应',
        assertions: ['expectStatus(200)', 'expectContentType("application/json")']
      },
      {
        name: 'jsonApi',
        description: '检查JSON API响应',
        assertions: ['expectStatus(200)', 'expectContentType("application/json")', 'expectResponseTime(2000)']
      },
      {
        name: 'fast',
        description: '检查快速响应',
        assertions: ['expectResponseTime(500)']
      },
      {
        name: 'secureHeaders',
        description: '检查安全响应头',
        assertions: [
          'expectHeader("X-Content-Type-Options", "nosniff")',
          'expectHeader("X-Frame-Options", "DENY")',
          'expectHeader("X-XSS-Protection", "1; mode=block")'
        ]
      }
    ];

    res.json({
      success: true,
      data: presetList
    });

  } catch (error) {
    Logger.error('获取预设断言失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/api/stats/summary
 * 获取API测试统计
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const results = Array.from(inMemoryStore.values())
      .filter(r => r.status === 'completed');

    if (results.length === 0) {
      return res.json({
        success: true,
        data: {
          totalTests: 0,
          avgResponseTime: 0,
          successRate: 0,
          byMethod: {}
        }
      });
    }

    // 按HTTP方法分组统计
    const byMethod = {};
    results.forEach(r => {
      if (!byMethod[r.method]) {
        byMethod[r.method] = { count: 0, successCount: 0 };
      }
      byMethod[r.method].count++;
      if (r.result?.success) {
        byMethod[r.method].successCount++;
      }
    });

    const stats = {
      totalTests: results.length,
      avgResponseTime: results.reduce((sum, r) => sum + (r.result?.responseTime || 0), 0) / results.length,
      successRate: (results.filter(r => r.result?.success).length / results.length * 100).toFixed(2),
      byMethod: Object.entries(byMethod).map(([method, data]) => ({
        method,
        count: data.count,
        successRate: (data.successCount / data.count * 100).toFixed(2)
      }))
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    Logger.error('获取API测试统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
