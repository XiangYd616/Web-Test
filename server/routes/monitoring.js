/**
 * 监控路由
 */

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * 获取监控站点列表
 * GET /api/monitoring/sites
 */
router.get('/sites', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '监控功能开发中'
  });
}));

/**
 * 添加监控站点
 * POST /api/monitoring/sites
 */
router.post('/sites', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '监控功能开发中'
  });
}));

/**
 * 获取监控告警
 * GET /api/monitoring/alerts
 */
router.get('/alerts', authMiddleware, asyncHandler(async (req, res) => {
  // 模拟告警数据
  const mockAlerts = [
    {
      id: '1',
      type: 'error',
      title: '网站响应时间过长',
      message: 'example.com 响应时间超过 5 秒',
      timestamp: new Date().toISOString(),
      severity: 'high',
      status: 'active'
    },
    {
      id: '2',
      type: 'warning',
      title: 'SSL证书即将过期',
      message: 'test-site.com SSL证书将在7天后过期',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      severity: 'medium',
      status: 'active'
    }
  ];

  res.json({
    success: true,
    data: mockAlerts
  });
}));

/**
 * 获取监控统计
 * GET /api/monitoring/stats
 */
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  // 模拟统计数据
  const mockStats = {
    totalSites: 12,
    activeSites: 10,
    downSites: 2,
    avgResponseTime: 1.2,
    uptime: 99.5,
    alerts: {
      total: 5,
      critical: 1,
      warning: 3,
      info: 1
    },
    performance: {
      cpu: 45,
      memory: 68,
      disk: 32,
      network: 15
    },
    recentEvents: [
      {
        id: '1',
        type: 'site_down',
        site: 'example.com',
        timestamp: new Date().toISOString(),
        message: '站点无法访问'
      },
      {
        id: '2',
        type: 'recovery',
        site: 'test-site.com',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        message: '站点恢复正常'
      }
    ]
  };

  res.json({
    success: true,
    data: mockStats
  });
}));

module.exports = router;
