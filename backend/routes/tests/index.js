/**
 * 测试路由总入口
 * 路径: /tests/*
 * 
 * 注意：这是过渡版本，暂时引用原始的 test.js
 * 后续需要逐步拆分为独立的子路由
 */

const express = require('express');
const router = express.Router();

// 暂时导入原始的大型 test.js 文件
// TODO: 逐步拆分为：
// - tests/seo.js
// - tests/stress.js
// - tests/security.js
// - tests/compatibility.js
// - tests/api-tests.js
const originalTestRoutes = require('../test');

// 临时方案：将原始路由挂载到当前路由下
router.use('/', originalTestRoutes);

/**
 * 测试概览端点
 * GET /tests/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const overview = {
      availableTests: [
        { type: 'seo', name: 'SEO测试', endpoint: '/tests/seo' },
        { type: 'security', name: '安全测试', endpoint: '/tests/security' },
        { type: 'stress', name: '压力测试', endpoint: '/tests/stress' },
        { type: 'compatibility', name: '兼容性测试', endpoint: '/tests/compatibility' },
        { type: 'api', name: 'API测试', endpoint: '/tests/api' }
      ],
      description: '网站测试工具API集合'
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取测试概览失败'
    });
  }
});

module.exports = router;

