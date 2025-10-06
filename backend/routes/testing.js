/**
 * 测试管理路由
 * 提供测试管理服务的API接口
 */

const express = require('express');
const router = express.Router();

let testManagementService = null;

/**
 * 设置测试管理服务实例
 * @param {Object} service - TestManagementService实例
 */
const setTestManagementService = (service) => {
  testManagementService = service;
  console.log('✅ 测试管理服务已设置到路由');
};

/**
 * 检查服务是否初始化的中间件
 */
const checkServiceInitialized = (req, res, next) => {
  if (!testManagementService) {
    return res.status(503).json({
      success: false,
      error: '测试管理服务未初始化',
      message: 'Test management service is not initialized'
    });
  }
  next();
};

// 获取所有测试
router.get('/', checkServiceInitialized, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    
    const tests = await testManagementService.getAllTests({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      type
    });
    
    res.json({
      success: true,
      data: tests
    });
  } catch (error) {
    console.error('获取测试列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取测试列表失败'
    });
  }
});

// 创建新测试
router.post('/', checkServiceInitialized, async (req, res) => {
  try {
    const testData = req.body;
    
    // 基础验证
    if (!testData.name || !testData.type) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段',
        message: 'Missing required fields: name and type'
      });
    }
    
    const test = await testManagementService.createTest(testData);
    
    res.status(201).json({
      success: true,
      data: test,
      message: '测试创建成功'
    });
  } catch (error) {
    console.error('创建测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '创建测试失败'
    });
  }
});

// 获取单个测试详情
router.get('/:id', checkServiceInitialized, async (req, res) => {
  try {
    const { id } = req.params;
    const test = await testManagementService.getTest(id);
    
    if (!test) {
      return res.status(404).json({
        success: false,
        error: '测试不存在',
        message: `Test with id ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: test
    });
  } catch (error) {
    console.error('获取测试详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取测试详情失败'
    });
  }
});

// 更新测试
router.put('/:id', checkServiceInitialized, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updatedTest = await testManagementService.updateTest(id, updateData);
    
    if (!updatedTest) {
      return res.status(404).json({
        success: false,
        error: '测试不存在',
        message: `Test with id ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: updatedTest,
      message: '测试更新成功'
    });
  } catch (error) {
    console.error('更新测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '更新测试失败'
    });
  }
});

// 删除测试
router.delete('/:id', checkServiceInitialized, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await testManagementService.deleteTest(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '测试不存在',
        message: `Test with id ${id} not found`
      });
    }
    
    res.json({
      success: true,
      message: '测试删除成功'
    });
  } catch (error) {
    console.error('删除测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '删除测试失败'
    });
  }
});

// 启动测试
router.post('/:id/start', checkServiceInitialized, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await testManagementService.startTest(id);
    
    res.json({
      success: true,
      data: result,
      message: '测试启动成功'
    });
  } catch (error) {
    console.error('启动测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '启动测试失败'
    });
  }
});

// 停止测试
router.post('/:id/stop', checkServiceInitialized, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await testManagementService.stopTest(id);
    
    res.json({
      success: true,
      data: result,
      message: '测试停止成功'
    });
  } catch (error) {
    console.error('停止测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '停止测试失败'
    });
  }
});

// 获取测试结果
router.get('/:id/results', checkServiceInitialized, async (req, res) => {
  try {
    const { id } = req.params;
    const results = await testManagementService.getTestResults(id);
    
    if (!results) {
      return res.status(404).json({
        success: false,
        error: '测试结果不存在',
        message: `Results for test ${id} not found`
      });
    }
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('获取测试结果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取测试结果失败'
    });
  }
});

// 获取测试统计信息
router.get('/stats/overview', checkServiceInitialized, async (req, res) => {
  try {
    const stats = await testManagementService.getTestStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取测试统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取测试统计失败'
    });
  }
});

// 健康检查
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    service: 'testing',
    status: testManagementService ? 'initialized' : 'not_initialized',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
module.exports.setTestManagementService = setTestManagementService;

