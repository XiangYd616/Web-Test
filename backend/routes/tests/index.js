/**
 * 测试路由总入口
 * 路径: /tests/*
 * 
 * 文件路径: backend/routes/tests/index.js
 * 更新时间: 2025-11-14
 */

const express = require('express');
const router = express.Router();

// 导入新的子路由模块
const stressRouter = require('./stress');
const apiRouter = require('./api');


// 挂载新的子路由（优先级更高）
router.use('/stress', stressRouter);
router.use('/api', apiRouter);


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

